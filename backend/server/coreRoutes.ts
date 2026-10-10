import { Express, Request, Response } from 'express';
import { db, UserRecord, OrderRecord, BookingRecord, DEFAULT_SLOT_DURATION_MIN } from './db';
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
import { publicMenu, registerShopDataRoutes, shopVouchersAsRecords } from './shopData';
import { getUserAchievements, syncUserAchievements, expireAndListWalletVouchers, PersonalVoucher } from './achievements';
import { getUserRank } from './ranks';
import { ACHIEVEMENTS } from '../../shared/achievements';
import { CoffeeShop } from '../../shared/types';
import {
  AccountType,
  AvailabilityResponse,
  BookingStatus,
  PHONE_REGEX,
  SHOP_TRANSITIONS,
  TableOperationalStatus,
  isActiveBooking,
  isTableFree,
  normalizePhone
} from '../../shared/booking';

const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE || 'Asia/Ho_Chi_Minh';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

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
    const user = db.findUserById(req.user!.userId);
    if (!content) return res.status(400).json({ error: 'Vui lòng nhập nội dung đánh giá' });
    const newReview = {
      id: `rev-${Date.now()}`,
      shop_id: shopId,
      userId: req.user!.userId,
      userName: user?.name || req.user!.name,
      userAvatar: user?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Explorer',
      userSystemBadge: user?.title || 'Thám Hiểm Gia',
      date: 'Vừa xong',
      images,
      content,
      likes: 0,
      comments: 0,
      metrics: metrics || { noise: 4, seating: 5, accuracy: 5 }
    };
    db.addReview(newReview as any);
    publish([topics.shop(shopId)], 'review', { action: 'created', review: newReview });
    const achAfterReview = syncUserAchievements(req.user!.userId);
    if (achAfterReview.newlyUnlocked.length) {
      publish([topics.user(req.user!.userId)], 'achievement', { unlocked: achAfterReview.newlyUnlocked, rank: getUserRank(req.user!.userId) });
    }
    res.status(201).json({ message: 'Đăng đánh giá thành công', review: newReview, achievements_unlocked: achAfterReview.newlyUnlocked, rank: getUserRank(req.user!.userId) });
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
        payment_status: payment_method && payment_method !== 'at_store' ? 'paid_online' : 'pending_store',
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
          payment_method: 'momo',
          payment_status: booking.payment_status === 'paid_online' ? 'paid' : 'pending',
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
    broadcastBooking('updated', updated!);
    res.json({ message: 'Đã hủy lịch đặt bàn', booking: updated });
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
      payment_status: 'paid',
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
        ...(Number(bs.slotDurationMin) >= 30 && Number(bs.slotDurationMin) <= 360 ? { slotDurationMin: Number(bs.slotDurationMin) } : {})
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
    res.json({ bookings, clock: shopClock() });
  });

  app.get('/api/merchant/shops/:id/tables', ...shopOnly, requireShopAccess(), (req: AuthRequest, res: Response) => {
    const shop = db.getShopById(req.params.id)!;
    const date = typeof req.query.date === 'string' && DATE_REGEX.test(req.query.date) ? req.query.date : shopClock().today;
    res.json(buildAvailability(shop, date));
  });

  app.put('/api/merchant/bookings/:id/status', ...shopOnly, (req: AuthRequest, res: Response) => {
    const booking = db.getBookingById(req.params.id);
    if (!booking || !canManageShop(req.user, booking.shop_id)) {
      return res.status(404).json({ error: 'Không tìm thấy lịch đặt' });
    }
    const next = String(req.body?.status || '') as BookingStatus;
    if (!SHOP_TRANSITIONS[booking.status]?.includes(next)) {
      return res.status(409).json({ error: `Không thể chuyển từ "${booking.status}" sang "${next}"`, booking });
    }
    const updated = db.setBookingStatus(booking.id, next, 'shop', req.body?.note ? String(req.body.note).slice(0, 300) : undefined)!;

    // Keep the physical table state in sync with check-in / check-out.
    if (updated.table_id && (next === 'arrived' || next === 'completed')) {
      const table = db.updateTable(updated.shop_id, updated.table_id, {
        operational_status: next === 'arrived' ? 'occupied' : 'available',
        status: next === 'arrived' ? 'full' : 'empty'
      });
      if (table) publish([topics.shop(updated.shop_id)], 'table', { action: 'updated', table });
    }
    broadcastBooking('updated', updated);
    // Missions (and their points) only advance when a booking is COMPLETED (checked in).
    if (next === 'completed') {
      const ach = syncUserAchievements(updated.user_id);
      if (ach.newlyUnlocked.length) {
        publish([topics.user(updated.user_id)], 'achievement', {
          unlocked: ach.newlyUnlocked,
          rank: getUserRank(updated.user_id)
        });
      }
    }
    res.json({ message: 'Đã cập nhật lịch đặt', booking: updated });
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
    const bookings = db.getBookingsByShopId(shopId);
    const reviews = db.getReviewsByShopId(shopId);
    const { today } = shopClock();
    const todayOrders = orders.filter(o => o.created_at.startsWith(today));
    res.json({
      metrics: {
        todayRevenue: todayOrders.reduce((s, o) => s + (o.total || 0), 0),
        totalRevenue: orders.reduce((s, o) => s + (o.total || 0), 0),
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
