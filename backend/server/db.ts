import fs from 'fs';
import path from 'path';
import type { CurrencyCode } from '../../shared/currency';
import bcrypt from 'bcryptjs';
import { MOCK_SHOPS, MOCK_MENU, MOCK_TABLES } from '../../shared/data';
import { CoffeeShop, MenuItem, Table, Review } from '../../shared/types';
import {
  AccountType,
  BookingDTO,
  BookingStatus,
  TableOperationalStatus,
  isActiveBooking,
  slotsOverlap
} from '../../shared/booking';

export const SCHEMA_VERSION = 6;
export const DEFAULT_SLOT_DURATION_MIN = Number(process.env.BOOKING_SLOT_DURATION_MIN || 120);

export interface UserRole {
  role: 'customer' | 'shop_owner' | 'shop_staff' | 'admin';
}

export interface UserRecord {
  id: string;
  /** Which app this account belongs to. Customer and shop accounts are fully separate. */
  account_type: AccountType;
  phone: string;
  email: string;
  password_hash: string;
  name: string;
  avatar: string;
  title: string;
  location: string;
  roles: ('customer' | 'shop_owner' | 'shop_staff' | 'admin')[];
  activeRole: 'customer' | 'shop_owner' | 'shop_staff' | 'admin';
  owned_shops: string[];
  staff_shops: { shop_id: string; permissions: string[] }[];
  badges: string[];
  /** Total shown on the rank bar. DERIVED — recomputed by syncUserAchievements as
   *  visits × POINTS_PER_VISIT + mission_points. Never add to it directly. */
  points: number;
  /** Rewards banked from unlocked missions. The only half of `points` that accumulates. */
  mission_points?: number;
  level: string;
  /** Personal achievements unlocked (id → ISO timestamp). Earned from real activity. */
  achievements?: { unlocked: Record<string, string>; updated_at: string };
  /** Reward vouchers granted by achievements, usable only by this customer. */
  wallet_vouchers?: any[];
  /**
   * Times a shop deliberately marked this customer as not having turned up. Kept as
   * dated entries rather than a running total so reliability can later be read as a
   * rate inside a window, and so a wrongly recorded one can be removed again.
   */
  no_show_history?: { booking_id: string; shop_id: string; at: string }[];
  notifyPromos: boolean;
  notifyBookings: boolean;
  created_at: string;
  updated_at: string;
}

export type BookingRecord = BookingDTO;

export interface OrderRecord {
  id: string;
  /**
   * The currency this order was taken in, copied from the shop at the moment it was
   * created. It is deliberately a copy and not a lookup: a shop that later switches
   * currency must not rewrite what its past orders were worth.
   */
  currency_code?: CurrencyCode;
  order_code: string;
  shop_id: string;
  shop_name: string;
  user_id: string;
  user_name: string;
  table_id?: string;
  booking_id?: string;
  items: {
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    selected_options?: {
      size?: string;
      sugar?: string;
      ice?: string;
    };
    note?: string;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'pending' | 'preparing' | 'served' | 'paid' | 'cancelled';
  payment_method: 'cash' | 'momo' | 'vnpay' | 'card';
  payment_status: 'pending' | 'paid';
  note?: string;
  created_at: string;
}

/** Only shop-confirmed payments count as realized revenue. */
export function isSettledOrder(order: Pick<OrderRecord, 'status' | 'payment_status'>): boolean {
  return order.status === 'paid' && order.payment_status === 'paid';
}

export interface VoucherRecord {
  id: string;
  shop_id?: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'percent' | 'fixed' | 'bogo' | 'free_item';
  discount_value: number;
  max_discount?: number;
  min_order?: number;
  target_audiences?: string[];
  start_date: string;
  end_date: string;
  usage_limit: number;
  used_count: number;
  status: 'active' | 'scheduled' | 'expired';
}

export interface TableRecord extends Table {
  /** Globally unique id: `${shop_id}:${code}` */
  uid: string;
  shop_id: string;
  name?: string;
  current_order_id?: string;
  operational_status?: TableOperationalStatus;
}

export interface DatabaseSchema {
  schema_version?: number;
  users: UserRecord[];
  shops: CoffeeShop[];
  products: (MenuItem & {
    shop_id?: string;
    stock?: number;
    is_available?: boolean;
    sizeOptions?: { label: string; delta: number }[];
    sugarOptions?: string[];
    iceOptions?: string[];
  })[];
  tables: TableRecord[];
  bookings: BookingRecord[];
  orders: OrderRecord[];
  reviews: (Review & { shop_id: string; shop_reply?: string; replied_at?: string })[];
  vouchers: VoucherRecord[];
  favorites: { user_id: string; shop_id: string; created_at: string }[];
  /** Per-shop data owned by the shop (menu, vouchers…), created in the shop app. */
  shop_data?: Record<string, { menu?: any[]; vouchers?: any[] }>;
  /**
   * Browsers a person asked to be pushed to. One account can have several — a phone,
   * a laptop, a shop tablet — and each subscription belongs to exactly one browser.
   */
  push_subscriptions?: {
    id: string;
    user_id: string;
    endpoint: string;
    keys: { p256dh: string; auth: string };
    created_at: string;
    /** Consecutive send failures; a subscription the browser has dropped is pruned. */
    failures?: number;
  }[];
  notifications: {
    id: string;
    user_id: string;
    shop_id?: string;
    title: string;
    message: string;
    type: 'booking' | 'promo' | 'order' | 'system';
    is_read: boolean;
    created_at: string;
  }[];
}

const DB_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

export const DEMO_PASSWORD = '123456';

/** The 8-table floor plan used by the customer booking UI (t1..t4 floor 1, t5..t8 floor 2). */
export function buildDefaultTables(shopId: string): TableRecord[] {
  return MOCK_TABLES.map((t, idx) => ({
    ...t,
    status: 'empty' as const,
    uid: `${shopId}:${t.id}`,
    shop_id: shopId,
    name: `Bàn ${idx + 1} (${t.type === 'round' ? 'Bàn tròn' : t.type === 'sofa' ? 'Ghế sofa' : 'Bàn chữ nhật'})`,
    operational_status: 'available' as TableOperationalStatus
  }));
}

// Default initial seed data
function createInitialSeed(): DatabaseSchema {
  const demoHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const now = new Date().toISOString();

  // Customer accounts (used by the customer app)
  // Shop accounts (used by the shop app) — completely separate records, even for the same person.
  const users: UserRecord[] = [
    {
      id: 'usr-customer-1',
      account_type: 'customer',
      phone: '0908123789',
      email: 'hadinhc@gmail.com',
      password_hash: demoHash,
      name: 'Hà Đình C',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CoffeeExplorer&backgroundColor=ffd5dc,ffdfbf',
      title: 'Thám Hiểm Gia',
      location: 'Quận 1, TP. Hồ Chí Minh',
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
      created_at: new Date('2026-01-15T08:00:00.000Z').toISOString(),
      updated_at: now
    },
    {
      id: 'usr-owner-1',
      account_type: 'shop',
      phone: '0912345678',
      email: 'owner@theworkshop.vn',
      password_hash: demoHash,
      name: 'Thảo (Chủ Quán)',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ShopOwnerThao&backgroundColor=d1f4ff,bfe6ff',
      title: 'Chủ Quán Cà Phê',
      location: 'Quận 1, TP. Hồ Chí Minh',
      roles: ['shop_owner'],
      activeRole: 'shop_owner',
      owned_shops: ['1', '3'],
      staff_shops: [],
      badges: ['Chủ Quán Tận Tâm'],
      points: 0,
      level: 'Merchant',
      notifyPromos: true,
      notifyBookings: true,
      created_at: new Date('2025-11-20T08:00:00.000Z').toISOString(),
      updated_at: now
    },
    {
      id: 'usr-admin-1',
      account_type: 'shop',
      phone: '0999999999',
      email: 'admin@mobler.vn',
      password_hash: demoHash,
      name: 'Mobler System Admin',
      avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MoblerAdmin&backgroundColor=e2e8f0,cbd5e1',
      title: 'Quản Trị Viên Hệ Thống',
      location: 'Trung tâm Vận hành Mobler',
      roles: ['admin', 'shop_owner'],
      activeRole: 'admin',
      owned_shops: [],
      staff_shops: [],
      badges: ['Quản Trị Hệ Thống'],
      points: 0,
      level: 'System Administrator',
      notifyPromos: true,
      notifyBookings: true,
      created_at: new Date('2025-01-01T00:00:00.000Z').toISOString(),
      updated_at: now
    }
  ];

  const ownerOf: Record<string, string> = { '1': 'usr-owner-1', '3': 'usr-owner-1' };
  const shops: CoffeeShop[] = MOCK_SHOPS.map(shop => ({
    ...shop,
    rating: shop.rating || 4.8,
    reviewCount: shop.reviewCount || 128,
    // Seed shops are listed as partners so the demo can book them in real time.
    isPartner: true,
    ownerId: ownerOf[shop.id],
    bookingSettings: { autoConfirm: false, slotDurationMin: DEFAULT_SLOT_DURATION_MIN, acceptingBookings: true }
  }));

  // Menus are created by each shop in the shop app — nothing is pre-filled.
  const products: DatabaseSchema['products'] = [];

  const tables: TableRecord[] = shops.flatMap(shop => buildDefaultTables(shop.id));

  const bookings: BookingRecord[] = [];

  const orders: OrderRecord[] = [];

  const reviews: (Review & { shop_id: string; shop_reply?: string; replied_at?: string })[] = [];
  MOCK_SHOPS.forEach(shop => {
    if (shop.reviews && shop.reviews.length > 0) {
      shop.reviews.forEach(r => {
        reviews.push({
          ...r,
          shop_id: shop.id,
        });
      });
    }
  });

  const vouchers: VoucherRecord[] = [
    {
      id: 'vch-1',
      shop_id: '1',
      code: 'WELCOME20',
      title: 'Giảm 20% Đơn Đầu Tiên',
      description: 'Giảm tối đa 30.000đ cho khách hàng đặt bàn hoặc gọi món lần đầu tại quán.',
      discount_type: 'percent',
      discount_value: 20,
      max_discount: 30000,
      min_order: 50000,
      target_audiences: ['Khách mới'],
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      usage_limit: 1000,
      used_count: 142,
      status: 'active'
    },
    {
      id: 'vch-2',
      shop_id: '1',
      code: 'BOGO_FRIDAY',
      title: 'Mua 1 Tặng 1 Cà Phê',
      description: 'Tặng ngay 1 thức uống cùng loại cho mọi hóa đơn từ 2 ly trở lên.',
      discount_type: 'bogo',
      discount_value: 100,
      min_order: 90000,
      target_audiences: ['Tất cả khách hàng'],
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      usage_limit: 500,
      used_count: 88,
      status: 'active'
    },
    {
      id: 'vch-3',
      code: 'COFFEELOVER',
      title: 'Giảm 15.000đ Toàn Hệ Thống',
      description: 'Áp dụng cho mọi đơn đặt bàn và đồ uống tại tất cả các quán thuộc Mobler.',
      discount_type: 'fixed',
      discount_value: 15000,
      min_order: 60000,
      target_audiences: ['Thành viên Gold Explorer'],
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      usage_limit: 2000,
      used_count: 450,
      status: 'active'
    }
  ];

  const favorites = [
    { user_id: 'usr-customer-1', shop_id: '1', created_at: new Date().toISOString() },
    { user_id: 'usr-customer-1', shop_id: '2', created_at: new Date().toISOString() }
  ];

  const notifications = [
    {
      id: 'notif-1',
      user_id: 'usr-customer-1',
      shop_id: '1',
      title: 'Đặt bàn thành công #BKG-8832',
      message: 'The Workshop Coffee đã xác nhận chỗ ngồi của bạn vào lúc 19:00 hôm nay.',
      type: 'booking' as const,
      is_read: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'notif-2',
      user_id: 'usr-customer-1',
      title: 'Ưu đãi cuối tuần độc quyền',
      message: 'Nhận ngay Voucher giảm 20% khi ghé các quán có không gian Board Game.',
      type: 'promo' as const,
      is_read: true,
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  return {
    schema_version: SCHEMA_VERSION,
    push_subscriptions: [],
    users,
    shops,
    products,
    tables,
    bookings,
    orders,
    reviews,
    vouchers,
    favorites,
    notifications
  };
}

class DatabaseManager {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDirectoryExists();
    this.db = this.loadDatabase();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(DB_DIR)) {
      try {
        fs.mkdirSync(DB_DIR, { recursive: true });
      } catch (err) {
        console.warn('Failed to create data directory:', err);
      }
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.shops) {
          const migrated = migrateDatabase(parsed);
          if (migrated.changed) this.saveDatabase(migrated.db);
          return migrated.db;
        }
      }
    } catch (e) {
      console.warn('Error reading database file, regenerating seed data:', e);
    }
    const seed = createInitialSeed();
    this.saveDatabase(seed);
    return seed;
  }

  public saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDirectoryExists();
      const payload = dataToSave || this.db;
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Error saving database to file:', e);
    }
  }

  public getRawDb(): DatabaseSchema {
    return this.db;
  }

  // User methods
  public findUserById(id: string): UserRecord | undefined {
    return this.db.users.find(u => u.id === id);
  }

  /** Accounts are looked up per app: a customer login never matches a shop account and vice versa. */
  public findUserByPhoneOrEmail(identifier: string, accountType?: AccountType): UserRecord | undefined {
    const raw = identifier.trim();
    const clean = raw.toLowerCase();
    const phone = raw.replace(/[\s.\-()]/g, '');
    return this.db.users.find(
      u =>
        (!accountType || u.account_type === accountType) &&
        (u.phone === phone || u.phone === raw || (u.email || '').toLowerCase() === clean)
    );
  }

  public createUser(user: UserRecord): UserRecord {
    this.db.users.push(user);
    this.saveDatabase();
    return user;
  }

  public updateUser(id: string, updates: Partial<UserRecord>): UserRecord | null {
    const idx = this.db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.db.users[idx] = {
      ...this.db.users[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.saveDatabase();
    return this.db.users[idx];
  }

  // Shop methods
  public getShops(): CoffeeShop[] {
    return this.db.shops;
  }

  public getShopById(id: string): CoffeeShop | undefined {
    return this.db.shops.find(s => s.id === id);
  }

  public updateShop(id: string, updates: Partial<CoffeeShop>): CoffeeShop | null {
    const idx = this.db.shops.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.db.shops[idx] = { ...this.db.shops[idx], ...updates };
    this.saveDatabase();
    return this.db.shops[idx];
  }

  // Product methods
  public getProductsByShopId(shopId: string) {
    return this.db.products.filter(p => p.shop_id === shopId);
  }

  // ---- Shop-owned collections (menu, vouchers) ----
  public getShopCollection(shopId: string, kind: 'menu' | 'vouchers'): any[] {
    return this.db.shop_data?.[shopId]?.[kind] || [];
  }

  public setShopCollection(shopId: string, kind: 'menu' | 'vouchers', items: any[]) {
    if (!this.db.shop_data) this.db.shop_data = {};
    if (!this.db.shop_data[shopId]) this.db.shop_data[shopId] = {};
    this.db.shop_data[shopId][kind] = items;
    this.saveDatabase();
    return items;
  }

  public updateProduct(id: string, updates: any) {
    const idx = this.db.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.db.products[idx] = { ...this.db.products[idx], ...updates };
    this.saveDatabase();
    return this.db.products[idx];
  }

  // Table methods
  public getTablesByShopId(shopId: string): TableRecord[] {
    return this.db.tables.filter(t => t.shop_id === shopId);
  }

  public getTable(shopId: string, code: string): TableRecord | undefined {
    return this.db.tables.find(t => t.shop_id === shopId && t.id === code);
  }

  public updateTable(shopId: string, code: string, updates: Partial<TableRecord>): TableRecord | null {
    const idx = this.db.tables.findIndex(t => t.shop_id === shopId && t.id === code);
    if (idx === -1) return null;
    this.db.tables[idx] = { ...this.db.tables[idx], ...updates };
    this.saveDatabase();
    return this.db.tables[idx];
  }

  // Shop creation (shop app registration)
  public createShop(shop: CoffeeShop): CoffeeShop {
    this.db.shops.unshift(shop);
    this.db.tables.push(...buildDefaultTables(shop.id));
    this.saveDatabase();
    return shop;
  }

  // Booking methods
  public getBookingsByUserId(userId: string): BookingRecord[] {
    return this.db.bookings.filter(b => b.user_id === userId);
  }

  public getBookingsByShopId(shopId: string, date?: string): BookingRecord[] {
    return this.db.bookings.filter(b => b.shop_id === shopId && (!date || b.date === date));
  }

  public getBookingById(id: string): BookingRecord | undefined {
    return this.db.bookings.find(b => b.id === id);
  }

  public getActiveReservations(shopId: string, date: string): BookingRecord[] {
    return this.db.bookings.filter(b => b.shop_id === shopId && b.date === date && isActiveBooking(b.status));
  }

  /** Authoritative clash check. Node handles requests on one thread, so check+insert is atomic. */
  public findConflict(shopId: string, tableId: string, date: string, time: string, durationMin: number, ignoreId?: string) {
    return this.getActiveReservations(shopId, date).find(
      b => b.id !== ignoreId && b.table_id === tableId && slotsOverlap(b.time, time, durationMin)
    );
  }

  public createBooking(booking: BookingRecord): BookingRecord {
    this.db.bookings.unshift(booking);
    this.saveDatabase();
    return booking;
  }

  public updateBooking(id: string, updates: Partial<BookingRecord>): BookingRecord | null {
    const idx = this.db.bookings.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.db.bookings[idx] = { ...this.db.bookings[idx], ...updates, updated_at: new Date().toISOString() };
    this.saveDatabase();
    return this.db.bookings[idx];
  }

  public setBookingStatus(id: string, status: BookingStatus, by: AccountType | 'system', note?: string): BookingRecord | null {
    const current = this.getBookingById(id);
    if (!current) return null;
    const history = [...(current.status_history || []), { status, at: new Date().toISOString(), by, note }];
    return this.updateBooking(id, { status, status_history: history, ...(by === 'shop' && note ? { shop_note: note } : {}) });
  }

  // Order methods
  public getOrdersByUserId(userId: string): OrderRecord[] {
    return this.db.orders.filter(o => o.user_id === userId);
  }

  public getOrdersByShopId(shopId: string): OrderRecord[] {
    return this.db.orders.filter(o => o.shop_id === shopId);
  }

  public createOrder(order: OrderRecord): OrderRecord {
    this.db.orders.unshift(order);
    this.saveDatabase();
    return order;
  }

  public updateOrderStatus(id: string, status: OrderRecord['status']): OrderRecord | null {
    const idx = this.db.orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.db.orders[idx].status = status;
    if (status === 'paid') this.db.orders[idx].payment_status = 'paid';
    this.saveDatabase();
    return this.db.orders[idx];
  }

  // Review methods
  public getReviewsByShopId(shopId: string) {
    return this.db.reviews.filter(r => r.shop_id === shopId);
  }

  public addReview(review: Review & { shop_id: string }) {
    this.db.reviews.unshift(review);
    
    // Recalculate shop rating & review count
    const shopReviews = this.getReviewsByShopId(review.shop_id);
    const shop = this.getShopById(review.shop_id);
    if (shop) {
      const avg = shopReviews.reduce((sum, r) => sum + (r.metrics?.accuracy || 5), 0) / (shopReviews.length || 1);
      shop.rating = Number(avg.toFixed(1));
      shop.reviewCount = shopReviews.length;
      shop.reviews = shopReviews;
      this.updateShop(review.shop_id, {
        rating: shop.rating,
        reviewCount: shop.reviewCount,
        reviews: shop.reviews
      });
    }

    this.saveDatabase();
    return review;
  }

  public replyToReview(reviewId: string, replyText: string) {
    const idx = this.db.reviews.findIndex(r => r.id === reviewId);
    if (idx === -1) return null;
    this.db.reviews[idx].shop_reply = replyText;
    this.db.reviews[idx].replied_at = new Date().toISOString();
    this.saveDatabase();
    return this.db.reviews[idx];
  }

  // Favorites
  public getUserFavorites(userId: string): string[] {
    return this.db.favorites.filter(f => f.user_id === userId).map(f => f.shop_id);
  }

  public toggleFavorite(userId: string, shopId: string): { isFavorite: boolean } {
    const idx = this.db.favorites.findIndex(f => f.user_id === userId && f.shop_id === shopId);
    if (idx !== -1) {
      this.db.favorites.splice(idx, 1);
      this.saveDatabase();
      return { isFavorite: false };
    } else {
      this.db.favorites.push({ user_id: userId, shop_id: shopId, created_at: new Date().toISOString() });
      this.saveDatabase();
      return { isFavorite: true };
    }
  }

  // Vouchers
  public getVouchers(shopId?: string): VoucherRecord[] {
    if (shopId) {
      return this.db.vouchers.filter(v => !v.shop_id || v.shop_id === shopId);
    }
    return this.db.vouchers;
  }

  // Notifications
  public getUserNotifications(userId: string) {
    return this.db.notifications.filter(n => n.user_id === userId);
  }

  public markNotificationAsRead(id: string) {
    const notif = this.db.notifications.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
      this.saveDatabase();
    }
  }
}

/**
 * Upgrades a v1 database (single shared user list with role switching, global tables)
 * to v2 (separate customer / shop accounts, tables per shop, richer booking statuses).
 */
function migrateDatabase(data: any): { db: DatabaseSchema; changed: boolean } {
  if (data.schema_version === SCHEMA_VERSION) return { db: data, changed: false };
  if ((data.schema_version || 1) < 2) migrateV1toV2(data);
  // v3: shops start empty — remove pre-filled demo menu, demo order and canned shop replies.
  data.products = [];
  data.orders = (data.orders || []).filter((o: any) => o.id !== 'ord-1001');
  data.reviews = (data.reviews || []).map((r: any) =>
    typeof r.shop_reply === 'string' && r.shop_reply.startsWith('Cảm ơn bạn đã ghé thăm và gửi đánh giá tuyệt vời')
      ? { ...r, shop_reply: undefined, replied_at: undefined }
      : r
  );
  data.shop_data = data.shop_data || {};
  // v4: achievements are now earned from real activity — clear seeded points/badges so no one
  // keeps fake progress, and let the engine recompute from actual bookings/reviews.
  data.users = (data.users || []).map((u: any) =>
    u.account_type === 'customer'
      ? { ...u, points: 0, badges: [], achievements: { unlocked: {}, updated_at: new Date().toISOString() }, wallet_vouchers: u.wallet_vouchers || [] }
      : u
  );
  // v5: browsers can be pushed to even when no tab is open.
  data.push_subscriptions = data.push_subscriptions || [];
  // v6: every shop now names the currency it prices in. Existing shops get VND because
  // that is what their stored numbers always were — the old display code read
  // `value.toLocaleString('vi-VN') + 'đ'`. A shop that somehow already carries a code
  // keeps it; a migration must never overwrite a merchant's own setting.
  data.shops = (data.shops || []).map((sh: any) =>
    sh.currency_code ? sh : { ...sh, currency_code: 'VND' }
  );
  data.schema_version = SCHEMA_VERSION;
  return { db: data as DatabaseSchema, changed: true };
}

function migrateV1toV2(data: any) {
  const LEGACY_FAKE_HASH = '$2a$10$wN9iGz0a7Nf6P3fM9E';
  const demoHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  data.users = (data.users || []).map((u: any) => {
    const isShop = u.account_type
      ? u.account_type === 'shop'
      : u.activeRole === 'shop_owner' || u.activeRole === 'admin' || u.activeRole === 'shop_staff';
    return {
      ...u,
      account_type: isShop ? 'shop' : 'customer',
      roles: isShop ? u.roles.filter((r: string) => r !== 'customer') : ['customer'],
      owned_shops: isShop ? u.owned_shops || [] : [],
      // v1 shipped placeholder hashes that only worked through a password bypass.
      password_hash: String(u.password_hash || '').startsWith(LEGACY_FAKE_HASH) ? demoHash : u.password_hash
    };
  });

  data.shops = (data.shops || []).map((s: any) => ({
    ...s,
    isPartner: s.isPartner ?? true,
    ownerId: s.ownerId ?? data.users.find((u: any) => u.account_type === 'shop' && (u.owned_shops || []).includes(s.id))?.id,
    bookingSettings: s.bookingSettings || { autoConfirm: false, slotDurationMin: DEFAULT_SLOT_DURATION_MIN, acceptingBookings: true }
  }));

  // v1 had one global table list reused by every shop; give every shop its own floor plan.
  data.tables = data.shops.flatMap((s: any) => buildDefaultTables(s.id));

  const toIso = (d: string) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || '');
    return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
  };
  data.bookings = (data.bookings || []).map((b: any) => ({
    ...b,
    date: toIso(b.date),
    status: b.status === 'upcoming' ? 'confirmed' : b.status
  }));

}

export const db = new DatabaseManager();
