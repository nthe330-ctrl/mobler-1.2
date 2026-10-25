import { Express, Request, Response } from 'express';
import nodeCrypto from 'node:crypto';
import { db, isSettledOrder, UserRecord, OrderRecord, BookingRecord, DEFAULT_SLOT_DURATION_MIN } from './db';
import {
  AuthRequest,
  authenticateToken,
  optionalAuthenticateToken,
  requireAccount,
  requireShopAccess,
  canManageShop,
  isAdmin,
  hashPassword,
  comparePassword,
  generateToken,
  rateLimit
} from './auth';
import { publish, topics, issueTicket, streamHandler, realtimeStats } from './realtime';
import { storage, isOwnUploadUrl } from './storage';
import { isSafeImage, publicMenu, registerShopDataRoutes, shopVouchersAsRecords } from './shopData';
import { getUserAchievements, syncUserAchievements, getShopLoyalty, expireAndListWalletVouchers, PersonalVoucher } from './achievements';
import { getUserRank } from './ranks';
import { ACHIEVEMENTS } from '../../shared/achievements';
import { CoffeeShop } from '../../shared/types';
import {
  AccountType,
  AvailabilityResponse,
  BOOKING_STATUS_LABEL_VI,
  BookingStatus,
  CHECK_IN_FROM_STATUS,
  NO_SHOW_GRACE_MAX_BOUND,
  NO_SHOW_GRACE_MIN_BOUND,
  NO_SHOW_REVERT_WINDOW_MIN,
  PHONE_REGEX,
  RUNNING_LATE_EXTENSION_MIN,
  SCAN_ONLY_TRANSITIONS,
  SHOP_TRANSITIONS,
  TableOperationalStatus,
  graceWindowMin,
  hasCheckedIn,
  isActiveBooking,
  isTableFree,
  normalizePhone,
  parseBookingQr
} from '../../shared/booking';
import { notify, notifyShopStaff, listNotifications, countUnread, markRead, markAllRead } from './notifications';
import { recordNoShow, countNoShowAgainstCustomer, releaseNoShowMark, reliabilityOf } from './noShow';
import { vapidPublicKey, isPushEnabled, saveSubscription, removeSubscription } from './webPush';

const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE || 'Asia/Ho_Chi_Minh';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
/** How many photos one shop may show in its gallery. Mirrored in the shop profile editor. */
const MAX_SHOP_IMAGES = 5;

/** Today's date and current time in the shops' timezone. */
function shopClock(): { today: string; now: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return { today: `${get('year')}-${get('month')}-${get('day')}`, now: `${get('hour')}:${get('minute')}` };
}

function safeUser(u: UserRecord) {
  const { password_hash: _ignored, ...rest } = u;
  return rest;
}

function slotDuration(shop?: CoffeeShop): number {
  return shop?.bookingSettings?.slotDurationMin || DEFAULT_SLOT_DURATION_MIN;
}

function buildAvailability(shop: CoffeeShop, date: string): AvailabilityResponse {
  const clock = shopClock();
  return {
    shop_id: shop.id,
    date,
    slot_duration_min: slotDuration(shop),
    shop_today: clock.today,
    shop_now: clock.now,
    tables: db.getTablesByShopId(shop.id).map(t => ({
      id: t.id,
      name: t.name || t.id,
      seats: t.seats,
      type: t.type,
      photo: t.photo,
      operational_status: t.operational_status || 'available'
    })),
    reservations: db
      .getActiveReservations(shop.id, date)
      .filter(b => b.table_id)
      .map(b => ({ table_id: b.table_id!, time: b.time }))
  };
}

/** Fan a booking change out to the customer, the shop staff and anyone looking at the floor plan. */
function broadcastBooking(action: 'created' | 'updated', booking: BookingRecord) {
  publish([topics.shop(booking.shop_id)], 'booking', { action, booking });
  publish([topics.user(booking.user_id)], 'booking', { action, booking });
  publish([topics.availability(booking.shop_id)], 'availability', { shop_id: booking.shop_id, date: booking.date });
}

/**
 * Recompute the guest's mission progress and push it to their open screens.
 *
 * Safe to call on every booking status change: `syncUserAchievements` derives progress from
 * the bookings table and grants each reward at most once, so a second call after a re-scan,
 * a reload or the shop pressing "Hoàn tất" re-publishes the same numbers instead of adding to
 * them. Always publishing keeps the customer's progress bars live even when nothing unlocked.
 */
function syncAndPublishProgress(userId: string) {
  const ach = syncUserAchievements(userId);
  publish([topics.user(userId)], 'achievement', {
    unlocked: ach.newlyUnlocked,
    stats: ach.stats,
    points: ach.points,
    pointsEarned: ach.pointsEarned,
    // Previously never sent, while the client already listened for it — so the rank-up
    // celebration could not fire. It is set only on a real promotion.
    rankedUp: ach.rankedUp,
    reason: 'visit',
    rank: getUserRank(userId)
  });
  return ach;
}

/** Keep the physical table state in sync with check-in / check-out. */
function syncTableForStatus(booking: BookingRecord, next: BookingStatus) {
  if (!booking.table_id || (next !== 'arrived' && next !== 'completed')) return;
  const table = db.updateTable(booking.shop_id, booking.table_id, {
    operational_status: next === 'arrived' ? 'occupied' : 'available',
    status: next === 'arrived' ? 'full' : 'empty'
  });
  if (table) publish([topics.shop(booking.shop_id)], 'table', { action: 'updated', table });
}

function generateBookingId(): string {
  let id: string;
  do {
    id = `BK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  } while (db.getBookingById(id));
  return id;
}

function validateCredentials(body: any): string | null {
  const phone = normalizePhone(body.phone);
  if (!phone || !PHONE_REGEX.test(phone)) return 'Số điện thoại không hợp lệ (VD: 0901234567)';
  if (!body.password || String(body.password).length < 6) return 'Mật khẩu cần ít nhất 6 ký tự';
  if (body.email && !EMAIL_REGEX.test(String(body.email).trim())) return 'Email không hợp lệ';
  return null;
}

function accountExists(type: AccountType, phone: string, email?: string): boolean {
  return !!(db.findUserByPhoneOrEmail(phone, type) || (email ? db.findUserByPhoneOrEmail(email, type) : null));
}

/** Find a voucher the user may use: their own active reward vouchers, the shop's active vouchers, system promos. */
function resolveVoucher(code: string, shopId: string | undefined, userId: string | undefined): any | null {
  const wanted = String(code || '').trim().toUpperCase();
  if (!wanted) return null;
  let personal: any[] = [];
  if (userId) {
    const u = db.findUserById(userId);
    if (u && u.account_type === 'customer') {
      personal = expireAndListWalletVouchers(u).filter((v: PersonalVoucher) => v.status === 'active').map(v => ({ ...v, personal: true }));
    }
  }
  const pool = [...personal, ...(shopId ? shopVouchersAsRecords(String(shopId)) : []), ...db.getVouchers().filter(v => !v.shop_id)];
  return pool.find((v: any) => String(v.code).toUpperCase() === wanted) || null;
}

function voucherDiscount(voucher: any, orderValue: number): number {
  if (voucher.discount_type === 'percent') return Math.min((orderValue * voucher.discount_value) / 100, voucher.max_discount || 999999);
  if (voucher.discount_type === 'fixed') return voucher.discount_value;
  if (voucher.discount_type === 'bogo') return Math.min(45000, orderValue);
  return 0;
}

export function registerCoreRoutes(app: Express) {
  const authLimiter = rateLimit(20, 60_000);

  // ==================== CUSTOMER ACCOUNTS (customer app) ====================

  app.post('/api/customer/auth/register', authLimiter, async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body || {};
      const phone = normalizePhone(req.body?.phone);
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Vui lòng nhập họ tên' });
      const invalid = validateCredentials(req.body || {});
      if (invalid) return res.status(400).json({ error: invalid });
      if (accountExists('customer', phone, email)) {
        return res.status(409).json({ error: 'Số điện thoại hoặc email này đã có tài khoản khách hàng' });
      }

      const now = new Date().toISOString();
      const user: UserRecord = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        account_type: 'customer',
        phone,
        email: email ? String(email).trim().toLowerCase() : '',
        password_hash: await hashPassword(String(password)),
        name: String(name).trim(),
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=ffd5dc,ffdfbf`,
        title: 'Thám Hiểm Gia',
        location: 'TP. Hồ Chí Minh',
        roles: ['customer'],
        activeRole: 'customer',
        owned_shops: [],
        staff_shops: [],
        badges: [],
        points: 0,
        level: 'New Explorer',
        achievements: { unlocked: {}, updated_at: now },
        wallet_vouchers: [],
        notifyPromos: true,
        notifyBookings: true,
        created_at: now,
        updated_at: now
      };
      db.createUser(user);
      res.status(201).json({ message: 'Tạo tài khoản thành công', token: generateToken(user), user: safeUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi máy chủ' });
    }
  });

  app.post('/api/customer/auth/login', authLimiter, async (req: Request, res: Response) => {
    await loginFor('customer', req, res);
  });

  // ==================== SHOP ACCOUNTS (shop app) ====================

  app.post('/api/shop/auth/register', authLimiter, async (req: Request, res: Response) => {
    try {
      const { owner_name, email, password, shop: shopInput = {} } = req.body || {};
      const phone = normalizePhone(req.body?.phone);
      if (!owner_name || !String(owner_name).trim()) return res.status(400).json({ error: 'Vui lòng nhập tên chủ quán' });
      const invalid = validateCredentials(req.body || {});
      if (invalid) return res.status(400).json({ error: invalid });
      if (!email) return res.status(400).json({ error: 'Tài khoản cửa hàng cần email để nhận thông báo' });
      if (!shopInput.name || !String(shopInput.name).trim()) return res.status(400).json({ error: 'Vui lòng nhập tên quán' });
      if (!shopInput.address || !String(shopInput.address).trim()) return res.status(400).json({ error: 'Vui lòng nhập địa chỉ quán' });
      if (accountExists('shop', phone, email)) {
        return res.status(409).json({ error: 'Số điện thoại hoặc email này đã có tài khoản cửa hàng' });
      }

      const now = new Date().toISOString();
      const userId = `shopusr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const shopId = `shop-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      const cover =
        typeof shopInput.coverImage === 'string' && /^https:\/\//.test(shopInput.coverImage)
          ? shopInput.coverImage
          : 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800';

      const shop: CoffeeShop = {
        id: shopId,
        name: String(shopInput.name).trim(),
        address: String(shopInput.address).trim(),
        distance: '',
        rating: 0,
        reviewCount: 0,
        coverImage: cover,
        images: [cover],
        openingHours: [{ day: 'Hằng ngày', time: String(shopInput.openingHours || '07:00 - 22:00') }],
        moods: [],
        tags: Array.isArray(shopInput.tags) ? shopInput.tags.slice(0, 10).map(String) : [],
        amenities: [],
        styles: [],
        specialModels: [],
        reviews: [],
        phoneNumber: shopInput.phone ? normalizePhone(shopInput.phone) : phone,
        description: shopInput.description ? String(shopInput.description).slice(0, 1000) : '',
        location:
          Number.isFinite(Number(shopInput.lat)) && Number.isFinite(Number(shopInput.lng)) && Math.abs(Number(shopInput.lat)) <= 90 && Math.abs(Number(shopInput.lng)) <= 180
            ? { lat: Number(shopInput.lat), lng: Number(shopInput.lng) }
            : undefined,
        isPartner: true,
        ownerId: userId,
        bookingSettings: { autoConfirm: false, slotDurationMin: DEFAULT_SLOT_DURATION_MIN, acceptingBookings: true }
      };

      const user: UserRecord = {
        id: userId,
        account_type: 'shop',
        phone,
        email: String(email).trim().toLowerCase(),
        password_hash: await hashPassword(String(password)),
        name: String(owner_name).trim(),
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(shop.name)}`,
        title: 'Chủ Quán',
        location: shop.address,
        roles: ['shop_owner'],
        activeRole: 'shop_owner',
        owned_shops: [shopId],
        staff_shops: [],
        badges: [],
        points: 0,
        level: 'Merchant',
        notifyPromos: true,
        notifyBookings: true,
        created_at: now,
        updated_at: now
      };

      db.createShop(shop);
      db.createUser(user);
      res.status(201).json({ message: 'Tạo tài khoản cửa hàng thành công', token: generateToken(user), user: safeUser(user), shop });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi máy chủ' });
    }
  });

  app.post('/api/shop/auth/login', authLimiter, async (req: Request, res: Response) => {
    await loginFor('shop', req, res);
  });

  async function loginFor(type: AccountType, req: Request, res: Response) {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập số điện thoại/email và mật khẩu' });
      }
      const user = db.findUserByPhoneOrEmail(String(identifier), type);
      const ok = user ? await comparePassword(String(password), user.password_hash) : false;
      if (!user || !ok) {
        const otherType: AccountType = type === 'shop' ? 'customer' : 'shop';
        const hint = !user && db.findUserByPhoneOrEmail(String(identifier), otherType)
          ? type === 'shop'
            ? ' Thông tin này là tài khoản khách hàng — hãy đăng ký tài khoản cửa hàng riêng.'
            : ' Thông tin này là tài khoản cửa hàng — hãy đăng ký tài khoản khách hàng riêng.'
          : '';
        return res.status(401).json({ error: `Sai thông tin đăng nhập.${hint}` });
      }
      res.json({ message: 'Đăng nhập thành công', token: generateToken(user), user: safeUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi đăng nhập' });
    }
  }

  // Old shared endpoints — the two apps now have separate account flows.
  for (const legacy of ['/api/auth/register', '/api/auth/login', '/api/auth/otp/request', '/api/auth/otp/verify', '/api/auth/switch-role', '/api/auth/demo-accounts']) {
    app.all(legacy, (_req, res) =>
      res.status(410).json({ error: 'Endpoint đã ngừng. Dùng /api/customer/auth/* hoặc /api/shop/auth/*' })
    );
  }

  // ==================== SESSION (both apps) ====================

  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
    const user = db.findUserById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    const favorites = user.account_type === 'customer' ? db.getUserFavorites(user.id) : [];
    const shops =
      user.account_type === 'shop'
        ? isAdmin(req.user) ? db.getShops() : db.getShops().filter(s => (user.owned_shops || []).includes(s.id))
        : undefined;
    res.json({ user: safeUser(user), favorites, shops });
  });

  app.put('/api/auth/profile', authenticateToken, (req: AuthRequest, res: Response) => {
    const { name, avatar, title, location, email, notifyPromos, notifyBookings } = req.body || {};
    if (email && !EMAIL_REGEX.test(String(email))) return res.status(400).json({ error: 'Email không hợp lệ' });
    const updates: Partial<UserRecord> = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof avatar === 'string') updates.avatar = avatar;
    if (typeof title === 'string') updates.title = title;
    if (typeof location === 'string') updates.location = location;
    if (typeof email === 'string') updates.email = email.trim().toLowerCase();
    if (typeof notifyPromos === 'boolean') updates.notifyPromos = notifyPromos;
    if (typeof notifyBookings === 'boolean') updates.notifyBookings = notifyBookings;
    const updated = db.updateUser(req.user!.userId, updates);
    if (!updated) return res.status(404).json({ error: 'Không thể cập nhật hồ sơ' });
    res.json({ message: 'Cập nhật hồ sơ thành công', user: safeUser(updated) });
  });

  // ==================== REAL-TIME ====================

  app.post('/api/realtime/ticket', authenticateToken, issueTicket);
  app.get('/api/realtime/stream', streamHandler);
  app.get('/api/realtime/stats', (_req, res) => res.json(realtimeStats()));

  // ==================== SHOPS & CATALOG (public) ====================

  app.get('/api/shops', optionalAuthenticateToken, (req: AuthRequest, res: Response) => {
    let shops = db.getShops();
    const { q, mood, style, specialModel, amenity } = req.query;

    if (q && typeof q === 'string') {
      const query = q.toLowerCase().trim();
      shops = shops.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.address.toLowerCase().includes(query) ||
          s.tags?.some(t => t.toLowerCase().includes(query)) ||
          s.moods?.some(m => m.toLowerCase().includes(query)) ||
          s.styles?.some(st => st.toLowerCase().includes(query)) ||
          s.specialModels?.some(sm => sm.toLowerCase().includes(query))
      );
    }
    if (mood && typeof mood === 'string' && mood !== 'all') shops = shops.filter(s => s.moods?.includes(mood as any));
    if (style && typeof style === 'string') shops = shops.filter(s => s.styles?.includes(style as any) || s.primaryStyle === style);
    if (specialModel && typeof specialModel === 'string') {
      shops = shops.filter(s => s.specialModels?.includes(specialModel as any) || s.primaryModel === specialModel);
    }
    if (amenity && typeof amenity === 'string') shops = shops.filter(s => s.amenities?.includes(amenity as any));

    const userFavorites = req.user?.accountType === 'customer' ? db.getUserFavorites(req.user.userId) : [];
    res.json({ shops, total: shops.length, userFavorites });
  });

  app.get('/api/shops/:id', optionalAuthenticateToken, (req: AuthRequest, res: Response) => {
    const shopId = req.params.id;
    const shop = db.getShopById(shopId);
    if (!shop) return res.status(404).json({ error: 'Không tìm thấy quán cà phê' });
    res.json({
      shop,
      products: publicMenu(shopId),
      tables: db.getTablesByShopId(shopId),
      reviews: db.getReviewsByShopId(shopId),
      vouchers: [...shopVouchersAsRecords(shopId), ...db.getVouchers(shopId).filter(v => !v.shop_id)],
      isFavorite: req.user?.accountType === 'customer' ? db.getUserFavorites(req.user.userId).includes(shopId) : false
    });
  });

  /** Live table availability for one day — used by the customer floor plan. */
  app.get('/api/shops/:id/availability', (req: Request, res: Response) => {
    const shop = db.getShopById(req.params.id);
    if (!shop || !shop.isPartner) {
      return res.status(404).json({ error: 'Quán này chưa nhận đặt bàn trực tuyến trên Mobler', code: 'SHOP_NOT_PARTNER' });
    }
    const date = typeof req.query.date === 'string' && DATE_REGEX.test(req.query.date) ? req.query.date : shopClock().today;
    res.json({ ...buildAvailability(shop, date), accepting_bookings: shop.bookingSettings?.acceptingBookings !== false });
  });

  app.post('/api/shops/:id/reviews', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const shopId = req.params.id;
    const { content, images = [], metrics } = req.body || {};
    /* Only images this server stored. Without the filter, anything the client put in the
       array ended up rendered on a public shop page. Silently dropping the rest keeps a
       well-behaved client working while an abusive one gains nothing. */
    const safeImages: string[] = (Array.isArray(images) ? images : []).filter(isOwnUploadUrl).slice(0, 6);
    const user = db.findUserById(req.user!.userId);
    if (!content) return res.status(400).json({ error: 'Vui lòng nhập nội dung đánh giá' });
    // Only a guest who really showed up may review, and only the shop they showed up at.
    // The check-in itself is proven by a QR scan (see the check-in route), so this closes the
    // loop: no scan → no `arrived` booking → no review.
    //
    // One review per visit: each review records the check-in that earned it, so a guest who
    // came back may review again, while re-posting for the same visit is refused. Without
    // this, one visit allowed unlimited reviews and each one recomputed the shop's rating,
    // letting a single guest move a shop's public score at will.
    const checkedIn = db
      .getBookingsByUserId(req.user!.userId)
      .filter(b => b.shop_id === shopId && hasCheckedIn(b.status));
    if (checkedIn.length === 0) {
      return res.status(403).json({
        error: 'Bạn cần nhận bàn tại quán (quán quét mã QR của bạn) trước khi đánh giá',
        code: 'REVIEW_REQUIRES_CHECKIN'
      });
    }
    const reviewedBookingIds = new Set(
      db.getRawDb().reviews
        .filter((r: any) => r.userId === req.user!.userId && r.shop_id === shopId)
        .map((r: any) => r.booking_id)
        .filter(Boolean)
    );
    const checkIn = checkedIn.find(b => !reviewedBookingIds.has(b.id));
    if (!checkIn) {
      return res.status(409).json({
        error: 'Bạn đã đánh giá lượt ghé quán này rồi',
        code: 'REVIEW_ALREADY_SUBMITTED'
      });
    }
    const newReview = {
      id: `rev-${Date.now()}`,
      shop_id: shopId,
      booking_id: checkIn.id,
      userId: req.user!.userId,
      userName: user?.name || req.user!.name,
      userAvatar: user?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Explorer',
      userSystemBadge: user?.title || 'Thám Hiểm Gia',
      date: 'Vừa xong',
      // Sortable timestamp behind the display string, so per-shop titles can tell when
      // a review requirement was actually met.
      created_at: new Date().toISOString(),
      images: safeImages,
      content,
      likes: 0,
      comments: 0,
      metrics: metrics || { noise: 4, seating: 5, accuracy: 5 }
    };
    db.addReview(newReview as any);
    publish([topics.shop(shopId)], 'review', { action: 'created', review: newReview });
    const achAfterReview = syncUserAchievements(req.user!.userId);
    // Always publish, not only on an unlock: writing the review itself earns points, and
    // the progress bar has to show them.
    publish([topics.user(req.user!.userId)], 'achievement', {
      unlocked: achAfterReview.newlyUnlocked,
      stats: achAfterReview.stats,
      points: achAfterReview.points,
      pointsEarned: achAfterReview.pointsEarned,
      rankedUp: achAfterReview.rankedUp,
      reason: 'review',
      rank: getUserRank(req.user!.userId)
    });
    res.status(201).json({
      message: 'Đăng đánh giá thành công',
      review: newReview,
      achievements_unlocked: achAfterReview.newlyUnlocked,
      points_earned: achAfterReview.pointsEarned,
      points: achAfterReview.points,
      ranked_up: achAfterReview.rankedUp,
      rank: getUserRank(req.user!.userId)
    });
  });

  /* Photo a guest attaches to a review. Mirrors the shop-side upload — same types, same
     3 MB cap, same storage driver — but keyed to the signed-in customer, and rate limited
     because this is the one write a logged-in guest can repeat freely. The response is a
     URL; the review route then accepts only URLs this produced (isOwnUploadUrl). */
  const CUSTOMER_IMAGE_TYPES: Record<string, string> =
    { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const MAX_REVIEW_IMAGE_BYTES = 3 * 1024 * 1024;

  app.post(
    '/api/me/uploads',
    authenticateToken,
    requireAccount('customer'),
    rateLimit(20, 60_000),
    (req: AuthRequest, res: Response) => {
      const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''));
      if (!m || !CUSTOMER_IMAGE_TYPES[m[1]]) {
        return res.status(400).json({ error: 'Chỉ nhận ảnh JPG, PNG hoặc WEBP', code: 'UPLOAD_BAD_TYPE' });
      }
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > MAX_REVIEW_IMAGE_BYTES) {
        return res.status(413).json({ error: 'Ảnh tối đa 3MB', code: 'UPLOAD_TOO_LARGE' });
      }
      const name = `review-${req.user!.userId.replace(/[^a-z0-9-]/gi, '')}-` +
        `${nodeCrypto.randomBytes(8).toString('hex')}.${CUSTOMER_IMAGE_TYPES[m[1]]}`;
      storage().put(name, buf, m[1])
        .then(({ url }) => res.status(201).json({ url }))
        .catch(err => {
          console.error('[MOBLER API] review upload failed', err);
          res.status(502).json({ error: 'Không lưu được ảnh, vui lòng thử lại', code: 'UPLOAD_FAILED' });
        });
    }
  );

  /* ---------- review social: like + comment ----------
     `likes` and `comments` were plain counters, so nothing recorded WHO acted: a like
     could not be undone and could be repeated forever. Both are now derived from the
     people who acted — liked_by holds user ids, comment_list holds the comments — and
     the counters are kept in step for any client still reading them. */

  /** Shape a stored review for a viewer: counts, their own like state, and comments. */
  const publicReview = (r: any, viewerId?: string) => ({
    ...r,
    likes: Array.isArray(r.liked_by) ? r.liked_by.length : (r.likes || 0),
    likedByMe: !!viewerId && Array.isArray(r.liked_by) && r.liked_by.includes(viewerId),
    comment_list: Array.isArray(r.comment_list) ? r.comment_list : [],
    comments: Array.isArray(r.comment_list) ? r.comment_list.length : (r.comments || 0)
  });

  const findReview = (id: string) =>
    db.getRawDb().reviews.find((r: any) => String(r.id) === String(id));

  app.post('/api/reviews/:id/like', authenticateToken, requireAccount('customer'), rateLimit(60, 60_000), (req: AuthRequest, res: Response) => {
    const review = findReview(req.params.id);
    if (!review) return res.status(404).json({ error: 'Không tìm thấy đánh giá', code: 'REVIEW_NOT_FOUND' });
    const me = req.user!.userId;
    const liked = Array.isArray(review.liked_by) ? review.liked_by : [];
    // Toggle by identity, never by incrementing — a double tap must land back where it started.
    review.liked_by = liked.includes(me) ? liked.filter((u: string) => u !== me) : [...liked, me];
    review.likes = review.liked_by.length;
    db.saveDatabase();
    publish([topics.shop(review.shop_id)], 'review', { action: 'liked', review: publicReview(review) });
    res.json({ likes: review.likes, likedByMe: review.liked_by.includes(me) });
  });

  app.post('/api/reviews/:id/comments', authenticateToken, requireAccount('customer'), rateLimit(20, 60_000), (req: AuthRequest, res: Response) => {
    const review = findReview(req.params.id);
    if (!review) return res.status(404).json({ error: 'Không tìm thấy đánh giá', code: 'REVIEW_NOT_FOUND' });
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Vui lòng nhập nội dung bình luận', code: 'COMMENT_EMPTY' });
    if (content.length > 500) return res.status(400).json({ error: 'Bình luận tối đa 500 ký tự', code: 'COMMENT_TOO_LONG' });
    const user = db.findUserById(req.user!.userId);
    const comment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: req.user!.userId,
      userName: user?.name || req.user!.name,
      userAvatar: user?.avatar || '',
      content,
      created_at: new Date().toISOString()
    };
    review.comment_list = [...(Array.isArray(review.comment_list) ? review.comment_list : []), comment];
    review.comments = review.comment_list.length;
    db.saveDatabase();
    publish([topics.shop(review.shop_id)], 'review', { action: 'commented', review: publicReview(review) });
    res.status(201).json({ comment, comments: review.comments });
  });

  /** Reviews of one shop, with the viewer's own like state when signed in. */
  app.get('/api/shops/:id/reviews', optionalAuthenticateToken, (req: AuthRequest, res: Response) => {
    const list = db.getReviewsByShopId(req.params.id) as any[];
    res.json({ reviews: list.map(r => publicReview(r, req.user?.userId)) });
  });

  /** The guest's own check-in diary: every review they wrote, newest first. */
  app.get('/api/me/reviews', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const me = req.user!.userId;
    const mine = db.getRawDb().reviews
      .filter((r: any) => r.userId === me)
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    res.json({
      reviews: mine.map((r: any) => {
        const shop = db.getShopById(r.shop_id);
        return {
          ...publicReview(r, me),
          shop_name: shop?.name || '',
          shop_address: shop?.address || '',
          shop_image: shop?.coverImage || shop?.images?.[0] || ''
        };
      })
    });
  });

  app.post('/api/shops/:id/favorites', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    res.json(db.toggleFavorite(req.user!.userId, req.params.id));
  });

  app.get('/api/me/favorites', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const favoriteIds = db.getUserFavorites(req.user!.userId);
    res.json({ favorites: db.getShops().filter(s => favoriteIds.includes(s.id)) });
  });

  // ==================== ACHIEVEMENTS & REWARDS (customer) ====================

  app.get('/api/me/achievements', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const sync = syncUserAchievements(req.user!.userId); // ensure anything already earned is granted
    res.json({
      achievements: getUserAchievements(req.user!.userId),
      stats: { ...sync.stats, reviews_total: db.getRawDb().reviews.filter((r: any) => r.userId === req.user!.userId).length },
      total: ACHIEVEMENTS.length,
      achieved: getUserAchievements(req.user!.userId).filter(a => a.achieved).length,
      points: db.findUserById(req.user!.userId)?.points || 0,
      rank: getUserRank(req.user!.userId)
    });
  });

  app.get('/api/me/shop-loyalty', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    res.json({ shops: getShopLoyalty(req.user!.userId) });
  });

  app.get('/api/me/rewards', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const user = db.findUserById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    const vouchers = expireAndListWalletVouchers(user);
    db.updateUser(user.id, { wallet_vouchers: vouchers } as any);
    res.json({ points: user.points || 0, badges: user.badges || [], vouchers });
  });

  // ==================== CUSTOMER BOOKINGS ====================

  app.get('/api/me/bookings', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const bookings = db
      .getBookingsByUserId(req.user!.userId)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    res.json({ bookings });
  });

  app.post('/api/bookings', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    try {
      const body = req.body || {};
      const { shop_id, date, time, note, order, payment_method, deposit_fee, grand_total } = body;
      // Discounts are recomputed on the server from a real, usable voucher.
      let voucher_applied: any = undefined;
      let discount_amount = 0;
      if (body.voucher_applied?.code) {
        const v = resolveVoucher(body.voucher_applied.code, String(shop_id || ''), req.user!.userId);
        const orderValue = (Number(order?.subtotal) || 0) + (Number(deposit_fee) || 0);
        if (v && (!v.min_order || orderValue >= v.min_order)) {
          discount_amount = Math.round(voucherDiscount(v, orderValue));
          voucher_applied = { code: v.code, discount: discount_amount, label: v.title };
        }
      }
      const guests = Math.max(1, Math.min(50, Number(body.guests) || 2));
      const shop = db.getShopById(String(shop_id || ''));
      const user = db.findUserById(req.user!.userId);

      if (!shop || !shop.isPartner) {
        return res.status(404).json({ error: 'Quán này chưa nhận đặt bàn trực tuyến trên Mobler', code: 'SHOP_NOT_PARTNER' });
      }
      if (shop.bookingSettings?.acceptingBookings === false) {
        return res.status(409).json({ error: 'Quán đang tạm ngưng nhận đặt bàn trực tuyến', code: 'SHOP_PAUSED' });
      }
      if (!DATE_REGEX.test(String(date)) || !TIME_REGEX.test(String(time))) {
        return res.status(400).json({ error: 'Ngày hoặc giờ đặt bàn không hợp lệ' });
      }

      const availability = buildAvailability(shop, date);
      if (date < availability.shop_today) {
        return res.status(400).json({ error: 'Không thể đặt bàn cho ngày đã qua' });
      }

      /**
       * Idempotency for a repeated submit.
       *
       * A double-tapped button, or a request the browser retried after a dropped
       * connection, arrives as two identical POSTs. The slot-clash check below does not stop
       * them when no table was asked for: the server auto-assigns, so each copy quietly
       * takes a different table and the guest ends up holding several tables for one visit.
       *
       * So an identical request from the same guest is answered with the booking it already
       * made, instead of creating another. "Identical" is judged by what the client actually
       * sent: same shop, date and time, and the same table intent —
       *   - a request naming a table matches only a live booking on THAT table, because
       *     asking for a different table is a deliberate, distinguishable choice (a large
       *     party may genuinely need two tables, and the clash check still guards each one);
       *   - a request naming no table matches any live booking of this guest in that slot,
       *     since a repeat of it carries nothing to tell the copies apart. A guest who
       *     really wants a second table in the same slot picks one explicitly.
       *
       * Node serves requests on one thread and this runs in the same tick as the insert
       * below, so even simultaneous copies are resolved in order.
       */
      const requestedTableId = body.table_id ? String(body.table_id) : undefined;
      const existing = db.getBookingsByUserId(req.user!.userId).find(b =>
        b.shop_id === shop.id &&
        b.date === date &&
        b.time === String(time) &&
        isActiveBooking(b.status) &&
        (requestedTableId ? b.table_id === requestedTableId : true)
      );
      if (existing) {
        return res.status(200).json({
          message: 'Yêu cầu đặt bàn này đã được gửi trước đó',
          booking: existing,
          duplicate: true
        });
      }

      // Pick the requested table, or auto-assign the smallest free table that fits the party.
      let tableId: string | undefined = body.table_id ? String(body.table_id) : undefined;
      if (tableId) {
        if (!availability.tables.some(t => t.id === tableId)) return res.status(400).json({ error: 'Bàn không tồn tại' });
        if (!isTableFree(availability, tableId, time)) {
          return res.status(409).json({
            error: 'Bàn này vừa có người đặt hoặc không còn trống vào giờ này. Vui lòng chọn bàn/giờ khác.',
            code: 'SLOT_TAKEN',
            availability
          });
        }
      } else {
        tableId = [...availability.tables]
          .filter(t => t.seats >= guests)
          .sort((a, b) => a.seats - b.seats)
          .find(t => isTableFree(availability, t.id, time))?.id;
        if (!tableId) {
          return res.status(409).json({ error: 'Quán đã kín chỗ vào giờ này', code: 'FULLY_BOOKED', availability });
        }
      }

      const table = db.getTable(shop.id, tableId);
      const now = new Date().toISOString();
      const autoConfirm = !!shop.bookingSettings?.autoConfirm;
      const status: BookingStatus = autoConfirm ? 'confirmed' : 'pending';

      const booking: BookingRecord = {
        id: generateBookingId(),
        shop_id: shop.id,
        shop_name: shop.name,
        shop_address: shop.address,
        shop_image: shop.coverImage || shop.images?.[0] || '',
        shop_phone: shop.phoneNumber,
        user_id: req.user!.userId,
        user_name: user?.name || req.user!.name,
        user_phone: user?.phone || req.user!.phone,
        table_id: tableId,
        table_name: table?.name || tableId,
        date,
        time,
        guests,
        status,
        note: note ? String(note).slice(0, 500) : undefined,
        order: order && Array.isArray(order.items) && order.items.length > 0 ? order : undefined,
        voucher_applied,
        payment_method: payment_method ? String(payment_method) : 'at_store',
        // No payment provider callback is wired up here. A chosen online method is not
        // proof that money was received; only the shop can settle it after confirmation.
        payment_status: payment_method && payment_method !== 'at_store' ? 'pending_online' : 'pending_store',
        deposit_fee: Number(deposit_fee) || 0,
        discount_amount,
        grand_total: Math.max(0, (Number(order?.subtotal) || 0) + (Number(deposit_fee) || 0) - discount_amount),
        status_history: [
          { status: 'pending', at: now, by: 'customer' },
          ...(autoConfirm ? [{ status: 'confirmed' as BookingStatus, at: now, by: 'system' as const }] : [])
        ],
        created_at: now,
        updated_at: now
      };

      db.createBooking(booking);

      if (booking.order) {
        const newOrder: OrderRecord = {
          id: `ord-${Date.now()}`,
          order_code: `MOBLER-ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          shop_id: shop.id,
          shop_name: shop.name,
          user_id: booking.user_id,
          user_name: booking.user_name,
          table_id: tableId,
          booking_id: booking.id,
          items: booking.order.items.map((i: any) => ({
            product_id: i.id || 'p-custom',
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            note: i.options
          })),
          subtotal: booking.order.subtotal || booking.order.total || 0,
          discount: booking.discount_amount || 0,
          total: booking.grand_total || booking.order.total || 0,
          status: 'pending',
          payment_method: booking.payment_method === 'at_store' ? 'cash'
            : booking.payment_method === 'vietqr' ? 'vnpay'
            : booking.payment_method === 'card' ? 'card' : 'momo',
          payment_status: 'pending',
          created_at: now
        };
        db.createOrder(newOrder);
      }

      // If a personal reward voucher was applied, mark it used so it can't be reused.
      const appliedCode = booking.voucher_applied?.code;
      if (appliedCode) {
        const u = db.findUserById(req.user!.userId);
        const wallet = u ? expireAndListWalletVouchers(u) : [];
        const pv = wallet.find((v: PersonalVoucher) => v.status === 'active' && v.code.toUpperCase() === appliedCode.toUpperCase());
        if (pv && u) {
          pv.status = 'used';
          db.updateUser(u.id, { wallet_vouchers: wallet } as any);
        }
      }

      broadcastBooking('created', booking);
      // The shop decides for itself what to do with a customer's record, so it is told
      // the history rather than having the platform act on it.
      const rel = reliabilityOf(booking.user_id);
      notifyShopStaff(shop.id, {
        type: 'booking',
        title: autoConfirm ? 'Đơn mới đã tự xác nhận' : 'Có đơn đặt bàn mới',
        message: `${booking.user_name} · ${booking.guests} khách · ${booking.time} ngày ${booking.date}`
          + (rel.noShows > 0 ? ` · khách này có ${rel.noShows} lần không đến trong ${rel.windowDays} ngày qua` : '')
      });
      // Missions only progress on a COMPLETED check-in, so creating a booking grants no points.
      // We still recompute in case a mission's reward was pending from earlier activity.
      const ach = syncUserAchievements(req.user!.userId);
      res.status(201).json({
        message: autoConfirm ? 'Đặt bàn thành công!' : 'Đã gửi yêu cầu đặt bàn, chờ quán xác nhận',
        booking,
        achievements_unlocked: ach.newlyUnlocked,
        rank: getUserRank(req.user!.userId)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi đặt bàn' });
    }
  });

  app.put('/api/bookings/:id/cancel', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const booking = db.getBookingById(req.params.id);
    if (!booking || booking.user_id !== req.user!.userId) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin đặt bàn' });
    }
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(409).json({ error: 'Lịch đặt này không thể hủy nữa' });
    }
    const updated = db.setBookingStatus(booking.id, 'cancelled', 'customer', req.body?.reason);
    // A cancelled reservation cannot leave its unpaid pre-order in shop revenue.
    for (const order of db.getOrdersByShopId(booking.shop_id)) {
      if (order.booking_id !== booking.id || isSettledOrder(order)) continue;
      const cancelledOrder = db.updateOrderStatus(order.id, 'cancelled');
      if (cancelledOrder) publish([topics.user(booking.user_id)], 'order', { action: 'updated', order: cancelledOrder });
    }
    broadcastBooking('updated', updated!);
    res.json({ message: 'Đã hủy lịch đặt bàn', booking: updated });
  });

  /**
   * "I'm on my way." One extension per booking, so a customer who is genuinely late
   * does not lose the table — and so the shop can see they are still coming.
   */
  app.post('/api/me/bookings/:id/running-late', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const booking = db.getBookingById(req.params.id);
    if (!booking || booking.user_id !== req.user!.userId) {
      return res.status(404).json({ error: 'Không tìm thấy lịch đặt' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(409).json({ error: 'Chỉ báo trễ được với đơn đã được quán xác nhận' });
    }
    if (booking.late_extension_min) {
      return res.status(409).json({ error: 'Bạn đã báo trễ cho đơn này rồi' });
    }
    const updated = db.updateBooking(booking.id, { late_extension_min: RUNNING_LATE_EXTENSION_MIN })!;
    broadcastBooking('updated', updated);
    notifyShopStaff(updated.shop_id, {
      type: 'booking',
      title: 'Khách báo đang trên đường',
      message: `${updated.user_name} (hẹn ${updated.time}) báo tới trễ khoảng ${RUNNING_LATE_EXTENSION_MIN} phút.`
    });
    res.json({
      message: `Đã báo quán, bàn được giữ thêm ${RUNNING_LATE_EXTENSION_MIN} phút`,
      booking: updated,
      extended_min: RUNNING_LATE_EXTENSION_MIN
    });
  });

  // ==================== NOTIFICATIONS ====================

  app.get('/api/me/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
    const limit = Number(req.query.limit) || 50;
    res.json({ notifications: listNotifications(req.user!.userId, limit), unread: countUnread(req.user!.userId) });
  });

  app.post('/api/me/notifications/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
    const changed = markRead(req.user!.userId, req.params.id);
    res.json({ changed, unread: countUnread(req.user!.userId) });
  });

  app.post('/api/me/notifications/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
    const changed = markAllRead(req.user!.userId);
    res.json({ changed, unread: 0 });
  });

  // The public half of the VAPID pair is meant to be handed out; the private half
  // never leaves the server.
  app.get('/api/push/key', (_req: Request, res: Response) => {
    res.json({ enabled: isPushEnabled(), publicKey: vapidPublicKey() });
  });

  app.post('/api/me/push/subscribe', authenticateToken, (req: AuthRequest, res: Response) => {
    if (!isPushEnabled()) return res.status(503).json({ error: 'Máy chủ chưa bật thông báo đẩy' });
    const ok = saveSubscription(req.user!.userId, req.body?.subscription || req.body);
    if (!ok) return res.status(400).json({ error: 'Đăng ký thông báo không hợp lệ' });
    res.status(201).json({ message: 'Đã bật thông báo đẩy' });
  });

  app.post('/api/me/push/unsubscribe', authenticateToken, (req: AuthRequest, res: Response) => {
    const endpoint = String(req.body?.endpoint || '');
    if (!endpoint) return res.status(400).json({ error: 'Thiếu endpoint' });
    res.json({ removed: removeSubscription(req.user!.userId, endpoint) });
  });

  // ==================== CUSTOMER ORDERS ====================

  app.get('/api/me/orders', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    res.json({ orders: db.getOrdersByUserId(req.user!.userId) });
  });

  app.post('/api/orders', authenticateToken, requireAccount('customer'), (req: AuthRequest, res: Response) => {
    const { shop_id, table_id, items, voucher_code, note, payment_method = 'momo' } = req.body || {};
    const shop = db.getShopById(shop_id);
    const user = db.findUserById(req.user!.userId);
    if (!shop) return res.status(404).json({ error: 'Không tìm thấy quán' });
    if (!items || !items.length) return res.status(400).json({ error: 'Vui lòng chọn món để đặt hàng' });

    let subtotal = 0;
    const formattedItems = items.map((it: any) => {
      subtotal += (it.price || 0) * (it.quantity || 1);
      return {
        product_id: it.id || it.product_id,
        name: it.name,
        price: it.price,
        quantity: it.quantity || 1,
        selected_options: it.selected_options,
        note: it.note
      };
    });

    let discount = 0;
    if (voucher_code) {
      const voucher = [...shopVouchersAsRecords(shop_id), ...db.getVouchers().filter(v => !v.shop_id)].find(v => v.code === voucher_code && v.status === 'active');
      if (voucher) {
        discount = voucher.discount_type === 'percent'
          ? Math.min((subtotal * voucher.discount_value) / 100, voucher.max_discount || 999999)
          : voucher.discount_value;
      }
    }

    const newOrder: OrderRecord = {
      id: `ord-${Date.now()}`,
      order_code: `MOBLER-ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      shop_id,
      shop_name: shop.name,
      user_id: req.user!.userId,
      user_name: user?.name || req.user!.name,
      table_id,
      items: formattedItems,
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      status: 'pending',
      payment_method,
      // The customer selected a method, but this app has no provider callback to verify
      // settlement. Leave the order unpaid until the shop confirms the funds arrived.
      payment_status: 'pending',
      note,
      created_at: new Date().toISOString()
    };
    db.createOrder(newOrder);
    publish([topics.shop(shop_id)], 'order', { action: 'created', order: newOrder });
    res.status(201).json({ message: 'Đặt món thành công', order: newOrder });
  });

  // ==================== VOUCHERS ====================

  app.get('/api/vouchers', (req: Request, res: Response) => {
    const { shopId } = req.query;
    const id = typeof shopId === 'string' ? shopId : undefined;
    const shopOwned = id ? shopVouchersAsRecords(id) : db.getShops().flatMap(s => shopVouchersAsRecords(s.id));
    // System-wide promotions (no shop) + vouchers each shop created itself.
    res.json({ vouchers: [...shopOwned, ...db.getVouchers().filter(v => !v.shop_id)] });
  });

  app.post('/api/vouchers/validate', optionalAuthenticateToken, (req: AuthRequest, res: Response) => {
    const { code, shop_id, order_value = 0 } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Vui lòng cung cấp mã voucher' });
    const voucher = resolveVoucher(code, shop_id, req.user?.accountType === 'customer' ? req.user.userId : undefined);
    if (!voucher) return res.status(404).json({ error: 'Mã giảm giá không hợp lệ, đã dùng hoặc đã hết hạn' });
    if (voucher.min_order && Number(order_value) < voucher.min_order) {
      return res.status(400).json({ error: `Đơn hàng tối thiểu để áp dụng mã là ${voucher.min_order.toLocaleString('vi-VN')}đ` });
    }
    res.json({ valid: true, voucher, calculatedDiscount: Math.round(voucherDiscount(voucher, Number(order_value) || 0)) });
  });

  // ==================== SHOP APP (merchant) API ====================
  registerShopDataRoutes(app);

  const shopOnly = [authenticateToken, requireAccount('shop')] as const;

  app.get('/api/merchant/shops', ...shopOnly, (req: AuthRequest, res: Response) => {
    const shops = isAdmin(req.user) ? db.getShops() : db.getShops().filter(s => req.user!.owned_shops.includes(s.id));
    res.json({ shops });
  });

  app.put('/api/merchant/shops/:id', ...shopOnly, requireShopAccess(), (req: AuthRequest, res: Response) => {
    const allowed = ['name', 'address', 'phoneNumber', 'website', 'description', 'coverImage', 'images', 'openingHours', 'tags', 'amenities'] as const;
    const updates: Partial<CoffeeShop> = {};
    for (const key of allowed) if (key in (req.body || {})) (updates as any)[key] = req.body[key];

    // The cover and the gallery are rendered in <img src> on the public shop page, so they
    // are filtered the same way menu photos already are: an outside https:// address, or a
    // path this server handed back from an upload. A `javascript:` or `data:` URL stored
    // here would run in every visitor's browser, and the shop account is not trusted with
    // that. An unusable cover is dropped rather than saved, so the field simply stays as it
    // was instead of leaving a broken image on the page.
    if ('coverImage' in updates) {
      const cover = String(updates.coverImage ?? '').trim();
      if (cover && isSafeImage(cover)) updates.coverImage = cover;
      else delete (updates as any).coverImage;
    }
    if ('images' in updates) {
      updates.images = (Array.isArray(updates.images) ? updates.images : [])
        .map(i => String(i ?? '').trim())
        .filter(i => i && isSafeImage(i))
        .filter((i, idx, all) => all.indexOf(i) === idx)   // the carousel should not repeat a photo
        .slice(0, MAX_SHOP_IMAGES);
    }
    const loc = req.body?.location;
    if (loc && Number.isFinite(Number(loc.lat)) && Number.isFinite(Number(loc.lng)) && Math.abs(Number(loc.lat)) <= 90 && Math.abs(Number(loc.lng)) <= 180) {
      updates.location = { lat: Number(loc.lat), lng: Number(loc.lng) };
    }
    const current = db.getShopById(req.params.id);
    if (req.body?.bookingSettings && current) {
      const bs = req.body.bookingSettings;
      updates.bookingSettings = {
        ...current.bookingSettings!,
        ...(typeof bs.autoConfirm === 'boolean' ? { autoConfirm: bs.autoConfirm } : {}),
        ...(typeof bs.acceptingBookings === 'boolean' ? { acceptingBookings: bs.acceptingBookings } : {}),
        ...(Number(bs.slotDurationMin) >= 30 && Number(bs.slotDurationMin) <= 360 ? { slotDurationMin: Number(bs.slotDurationMin) } : {}),
        ...(Number.isFinite(Number(bs.noShowGraceMin))
          ? { noShowGraceMin: Math.min(NO_SHOW_GRACE_MAX_BOUND, Math.max(NO_SHOW_GRACE_MIN_BOUND, Number(bs.noShowGraceMin))) }
          : {})
      };
    }
    const updated = db.updateShop(req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'Không tìm thấy quán' });
    publish([topics.availability(updated.id)], 'availability', { shop_id: updated.id });
    res.json({ message: 'Cập nhật thông tin quán thành công', shop: updated });
  });

  app.get('/api/merchant/shops/:id/bookings', ...shopOnly, requireShopAccess(), (req: AuthRequest, res: Response) => {
    const date = typeof req.query.date === 'string' && DATE_REGEX.test(req.query.date) ? req.query.date : undefined;
    const bookings = db
      .getBookingsByShopId(req.params.id, date)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    // The shop decides for itself what to do with a customer's record, so it is shown
    // the history rather than having the platform act on it.
    const reliability: Record<string, ReturnType<typeof reliabilityOf>> = {};
    for (const b of bookings) reliability[b.user_id] ||= reliabilityOf(b.user_id);
    res.json({
      bookings,
      clock: shopClock(),
      reliability,
      grace_min: graceWindowMin('12:00', db.getShopById(req.params.id)?.bookingSettings?.noShowGraceMin)
    });
  });

  app.get('/api/merchant/shops/:id/tables', ...shopOnly, requireShopAccess(), (req: AuthRequest, res: Response) => {
    // requireShopAccess already guarantees the shop exists; check anyway rather than
    // assert non-null, so this handler can never hand `undefined` to buildAvailability.
    const shop = db.getShopById(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Không tìm thấy quán', code: 'SHOP_NOT_FOUND' });
    const date = typeof req.query.date === 'string' && DATE_REGEX.test(req.query.date) ? req.query.date : shopClock().today;
    res.json(buildAvailability(shop, date));
  });

  app.put('/api/merchant/bookings/:id/status', ...shopOnly, (req: AuthRequest, res: Response) => {
    const booking = db.getBookingById(req.params.id);
    if (!booking || !canManageShop(req.user, booking.shop_id)) {
      return res.status(404).json({ error: 'Không tìm thấy lịch đặt' });
    }
    const next = String(req.body?.status || '') as BookingStatus;
    // Marking a guest present requires the guest's own code — the shop cannot assert it.
    // This is the server-side half of the rule; the shop app's scanner is only convenience.
    if (SCAN_ONLY_TRANSITIONS.includes(next)) {
      return res.status(403).json({
        error: 'Phải quét mã QR của khách để nhận bàn',
        code: 'CHECKIN_REQUIRES_SCAN',
        booking
      });
    }
    if (!SHOP_TRANSITIONS[booking.status]?.includes(next)) {
      return res.status(409).json({ error: `Không thể chuyển từ "${booking.status}" sang "${next}"`, booking });
    }
    const note = req.body?.note ? String(req.body.note).slice(0, 300) : undefined;
    const wasNoShow = booking.status === 'no_show';

    // Taking a no-show back. The shop is the only party that can see the customer was
    // in fact sitting there, so this undo stays open for a day and clears the mark.
    // It restores the hold (`confirmed`); presence itself still needs the guest's QR.
    if (wasNoShow) {
      const markedAt = booking.no_show_at ? Date.parse(booking.no_show_at) : 0;
      const ageMin = markedAt ? (Date.now() - markedAt) / 60_000 : Infinity;
      if (ageMin > NO_SHOW_REVERT_WINDOW_MIN) {
        return res.status(409).json({ error: 'Đã quá hạn gỡ ghi nhận khách không đến', booking });
      }
      db.updateBooking(booking.id, { no_show_at: undefined });
      releaseNoShowMark(booking.user_id, booking.id);
    }

    if (next === 'no_show') {
      const marked = recordNoShow(booking, 'shop', note);
      if (!marked) return res.status(404).json({ error: 'Không tìm thấy lịch đặt' });
      // Only a deliberate press by someone at the shop counts against the customer.
      // The sweeper never does this, because silence does not prove absence.
      countNoShowAgainstCustomer(marked.user_id, marked.id, marked.shop_id);
      notify({
        user_id: marked.user_id,
        shop_id: marked.shop_id,
        type: 'booking',
        title: 'Quán ghi nhận bạn không đến',
        message: `${marked.shop_name} đã ghi nhận bạn không đến lúc ${marked.time}. Nếu bạn thật ra có tới, hãy báo lại với quán để gỡ.`
      });
      // recordNoShow already released the table and published to the shop, user and
      // availability topics — broadcasting again here would double-fire the same event.
      return res.json({ message: 'Đã ghi nhận khách không đến', booking: marked });
    }

    const updated = db.setBookingStatus(booking.id, next, 'shop', note)!;

    syncTableForStatus(updated, next);
    broadcastBooking('updated', updated);

    // Only what the person would want their phone to buzz for gets pushed. The rest
    // is still recorded, because the inbox is cheap and a buzz is not.
    const CUSTOMER_FACING: Partial<Record<BookingStatus, { title: string; message: string; push?: boolean }>> = {
      confirmed: { title: 'Quán đã xác nhận', message: `${updated.shop_name} đã giữ bàn cho bạn lúc ${updated.time} ngày ${updated.date}.` },
      rejected: { title: 'Quán không nhận được đơn', message: `${updated.shop_name} đã từ chối yêu cầu lúc ${updated.time}. Bạn thử khung giờ khác nhé.` },
      cancelled: { title: 'Đơn đã bị huỷ', message: `Đơn ở ${updated.shop_name} lúc ${updated.time} đã bị huỷ.` },
      arrived: { title: 'Đã nhận bàn', message: `Chúc bạn ngồi vui ở ${updated.shop_name}.`, push: false },
      completed: { title: 'Hoàn tất lượt ghé', message: `Cảm ơn bạn đã ghé ${updated.shop_name}. Tiến độ nhiệm vụ của bạn vừa được cộng.`, push: false }
    };
    // A booking going back to `confirmed` from a no-show is an undo, not a fresh
    // confirmation — saying "the shop confirmed" a day later would read as a new booking.
    const announce = wasNoShow && next === 'confirmed'
      ? {
          title: 'Quán đã gỡ ghi nhận không đến',
          message: `${updated.shop_name} đã gỡ ghi nhận bạn không đến lúc ${updated.time} và giữ lại bàn cho bạn.`
        }
      : CUSTOMER_FACING[next];
    if (announce) notify({ user_id: updated.user_id, shop_id: updated.shop_id, type: 'booking', ...announce });

    // Wrapping up a visit re-publishes the same progress the check-in already granted —
    // syncUserAchievements recomputes from the bookings table, so this never double-counts.
    if (next === 'completed') syncAndPublishProgress(updated.user_id);
    res.json({ message: 'Đã cập nhật lịch đặt', booking: updated });
  });

  /**
   * QR check-in — the ONLY way a booking becomes `arrived`.
   *
   * The shop posts the raw text it scanned (or the code typed by hand, which is validated
   * identically). The server, not the client, decides whether the code is real, whether this
   * account may manage the shop that owns the booking, and whether the booking is in a state
   * that can be checked in. Mission progress is granted here, once.
   */
  app.post('/api/merchant/bookings/check-in', ...shopOnly, (req: AuthRequest, res: Response) => {
    const code = parseBookingQr(String(req.body?.code ?? ''));
    if (!code) {
      return res.status(400).json({ error: 'Mã QR không hợp lệ', code: 'CHECKIN_CODE_INVALID' });
    }
    const booking = db.getBookingById(code) || db.getRawDb().bookings.find(b => b.id.toUpperCase() === code);
    // A booking belonging to another shop is reported exactly like a code that does not
    // exist — a shop must not be able to probe other shops' booking codes.
    if (!booking || !canManageShop(req.user, booking.shop_id)) {
      return res.status(404).json({
        error: 'Mã QR không hợp lệ hoặc không thuộc quán này',
        code: 'CHECKIN_CODE_INVALID'
      });
    }
    // The shop app can pin a scan to the card the staff opened; a different guest's code
    // must not check that card in.
    const expected = req.body?.expected_booking_id ? String(req.body.expected_booking_id).toUpperCase() : null;
    if (expected && booking.id.toUpperCase() !== expected) {
      return res.status(409).json({
        error: `Mã này không khớp với đơn đang chọn (${expected})`,
        code: 'CHECKIN_CODE_MISMATCH'
      });
    }
    if (booking.status === 'arrived') {
      // Idempotent: a second scan of the same ticket reports the existing check-in and
      // grants nothing further. No status write, no progress, no reward.
      return res.status(409).json({
        error: `${booking.user_name} đã được nhận bàn trước đó`,
        code: 'CHECKIN_ALREADY_DONE',
        already_checked_in: true,
        booking
      });
    }
    if (booking.status === 'pending') {
      return res.status(409).json({
        error: 'Đơn này chưa được quán xác nhận, chưa thể nhận bàn',
        code: 'CHECKIN_NOT_CONFIRMED',
        booking
      });
    }
    if (booking.status !== CHECK_IN_FROM_STATUS) {
      return res.status(409).json({
        error: `Đơn này đã "${BOOKING_STATUS_LABEL_VI[booking.status]}", không thể nhận bàn`,
        code: 'CHECKIN_INVALID_STATUS',
        booking
      });
    }

    const updated = db.setBookingStatus(booking.id, 'arrived', 'shop', 'Nhận bàn bằng mã QR')!;
    syncTableForStatus(updated, 'arrived');
    broadcastBooking('updated', updated);
    publish([topics.availability(updated.shop_id)], 'availability', { shop_id: updated.shop_id, date: updated.date });
    const ach = syncAndPublishProgress(updated.user_id);

    res.json({
      message: `Đã nhận bàn cho ${updated.user_name}`,
      booking: updated,
      achievements_unlocked: ach.newlyUnlocked,
      can_review: true
    });
  });

  /** Record money the shop has actually received for a booking pre-order. */
  app.put('/api/merchant/bookings/:id/payment', ...shopOnly, (req: AuthRequest, res: Response) => {
    const booking = db.getBookingById(req.params.id);
    if (!booking || !canManageShop(req.user, booking.shop_id)) {
      return res.status(404).json({ error: 'Không tìm thấy lịch đặt' });
    }
    if (booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'pending') {
      return res.status(409).json({ error: 'Không thể ghi nhận thanh toán cho lịch đặt này', code: 'PAYMENT_INVALID_BOOKING' });
    }
    const order = db.getOrdersByShopId(booking.shop_id).find(o => o.booking_id === booking.id);
    if (!order) {
      return res.status(409).json({ error: 'Đơn đặt bàn không có món cần ghi nhận thanh toán', code: 'PAYMENT_NO_ORDER' });
    }
    if (order.status === 'cancelled') {
      return res.status(409).json({ error: 'Đơn món đã bị hủy', code: 'PAYMENT_ORDER_CANCELLED' });
    }
    if (isSettledOrder(order)) {
      return res.json({ message: 'Thanh toán đã được ghi nhận trước đó', booking, order, already_paid: true });
    }

    const paidOrder = db.updateOrderStatus(order.id, 'paid')!;
    const paidBooking = db.updateBooking(booking.id, {
      payment_status: booking.payment_method === 'at_store' ? 'paid_at_store' : 'paid_online'
    })!;
    publish([topics.user(paidOrder.user_id)], 'order', { action: 'updated', order: paidOrder });
    broadcastBooking('updated', paidBooking);
    res.json({ message: 'Đã ghi nhận khoản thanh toán thực nhận', booking: paidBooking, order: paidOrder });
  });

  app.put('/api/merchant/shops/:id/tables/:code/status', ...shopOnly, requireShopAccess(), (req: AuthRequest, res: Response) => {
    const status = String(req.body?.operational_status || '') as TableOperationalStatus;
    if (!['available', 'occupied', 'reserved', 'locked'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái bàn không hợp lệ' });
    }
    const table = db.updateTable(req.params.id, req.params.code, {
      operational_status: status,
      status: status === 'available' ? 'empty' : 'full'
    });
    if (!table) return res.status(404).json({ error: 'Không tìm thấy bàn' });
    publish([topics.shop(req.params.id)], 'table', { action: 'updated', table });
    publish([topics.availability(req.params.id)], 'availability', { shop_id: req.params.id });
    res.json({ message: 'Cập nhật trạng thái bàn thành công', table });
  });

  app.put('/api/merchant/products/:id/toggle-availability', ...shopOnly, (req: AuthRequest, res: Response) => {
    const product = db.getRawDb().products.find(p => p.id === req.params.id);
    if (!product || !canManageShop(req.user, product.shop_id || '1')) return res.status(404).json({ error: 'Không tìm thấy món' });
    const updated = db.updateProduct(req.params.id, { is_available: !!req.body?.is_available });
    res.json({ message: 'Đã cập nhật trạng thái món', product: updated });
  });

  app.get('/api/merchant/shops/:id/orders', ...shopOnly, requireShopAccess(), (req: AuthRequest, res: Response) => {
    res.json({ orders: db.getOrdersByShopId(req.params.id) });
  });

  app.put('/api/merchant/orders/:id/status', ...shopOnly, (req: AuthRequest, res: Response) => {
    const order = db.getRawDb().orders.find(o => o.id === req.params.id);
    if (!order || !canManageShop(req.user, order.shop_id)) return res.status(404).json({ error: 'Không tìm thấy đơn' });
    const status = req.body?.status;
    if (!['pending', 'preparing', 'served', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái đơn không hợp lệ' });
    }
    const updated = db.updateOrderStatus(order.id, status);
    publish([topics.user(order.user_id)], 'order', { action: 'updated', order: updated });
    res.json({ message: 'Đã cập nhật trạng thái đơn hàng', order: updated });
  });

  app.post('/api/merchant/reviews/:id/reply', ...shopOnly, (req: AuthRequest, res: Response) => {
    const review = db.getRawDb().reviews.find(r => r.id === req.params.id);
    if (!review || !canManageShop(req.user, review.shop_id)) return res.status(404).json({ error: 'Không tìm thấy đánh giá' });
    if (!req.body?.reply) return res.status(400).json({ error: 'Vui lòng nhập nội dung phản hồi' });
    res.json({ message: 'Đã phản hồi đánh giá', review: db.replyToReview(review.id, String(req.body.reply)) });
  });

  app.get('/api/merchant/shops/:id/analytics', ...shopOnly, requireShopAccess(), (req: AuthRequest, res: Response) => {
    const shopId = req.params.id;
    const orders = db.getOrdersByShopId(shopId);
    const settledOrders = orders.filter(isSettledOrder);
    const bookings = db.getBookingsByShopId(shopId);
    const reviews = db.getReviewsByShopId(shopId);
    const { today } = shopClock();
    const todayOrders = settledOrders.filter(o => o.created_at.startsWith(today));
    res.json({
      metrics: {
        todayRevenue: todayOrders.reduce((s, o) => s + (o.total || 0), 0),
        totalRevenue: settledOrders.reduce((s, o) => s + (o.total || 0), 0),
        totalBookings: bookings.length,
        todayBookings: bookings.filter(b => b.date === today).length,
        upcomingBookings: bookings.filter(b => isActiveBooking(b.status)).length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        totalOrders: orders.length,
        totalCustomers: new Set([...orders.map(o => o.user_id), ...bookings.map(b => b.user_id)]).size,
        averageRating: db.getShopById(shopId)?.rating || 0,
        reviewCount: reviews.length
      }
    });
  });
}
