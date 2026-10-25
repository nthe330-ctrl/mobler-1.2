import crypto from 'crypto';
import express, { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db, isSettledOrder, VoucherRecord } from './db';
import { AuthRequest, authenticateToken, requireAccount, requireShopAccess } from './auth';
import { publish, topics } from './realtime';
import { isActiveBooking } from '../../shared/booking';
import { storage } from './storage';

/**
 * Data that belongs to one shop and is created by its owner in the shop app:
 * menu, vouchers, uploaded images. A new shop starts with nothing — no sample data.
 * Plus read-only views derived from real activity: customers, reviews, analytics.
 */

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const num = (v: unknown, min: number, max: number, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const strList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v) ? v.map(x => str(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];
/**
 * An image URL safe to render on a public page: either an outside https:// address or a
 * path this server itself handed back from an upload. Anything else — `javascript:`,
 * `data:`, a bare http:// — is dropped rather than stored, because these strings end up
 * inside an <img src> that other people's browsers load.
 *
 * Exported so the shop-profile route applies the same rule to the cover and gallery that
 * the menu already applies to dish photos.
 */
export const isSafeImage = (u: string) => /^https:\/\//.test(u) || /^\/api\/media\/uploads\/[a-z0-9_.-]+$/i.test(u);

export function sanitizeMenuItem(raw: any) {
  const name = str(raw?.name, 120);
  if (!name) return null;
  const sizeOptions = Array.isArray(raw?.sizeOptions)
    ? raw.sizeOptions.slice(0, 10).map((s: any, i: number) => ({
        id: str(s?.id, 40) || `sz-${i + 1}`,
        sizeCode: str(s?.sizeCode, 20),
        name: str(s?.name, 80),
        price: num(s?.price, 0, 100_000_000),
        isDefault: !!s?.isDefault
      })).filter((s: any) => s.sizeCode && s.name)
    : [];
  const image = str(raw?.image, 2000);
  return {
    id: str(raw?.id, 60) || `m-${crypto.randomBytes(5).toString('hex')}`,
    name,
    price: num(raw?.price, 0, 100_000_000),
    stock: Math.round(num(raw?.stock, 0, 1_000_000)),
    category: str(raw?.category, 60) || 'Khác',
    isAvailable: raw?.isAvailable !== false,
    image: isSafeImage(image) ? image : '',
    description: str(raw?.description, 1000),
    allowSizeCustomization: !!raw?.allowSizeCustomization && sizeOptions.length > 0,
    sizeOptions,
    defaultSize: str(raw?.defaultSize, 20) || undefined,
    allowSugarCustomization: !!raw?.allowSugarCustomization,
    sugarOptions: strList(raw?.sugarOptions, 10, 40),
    defaultSugar: str(raw?.defaultSugar, 40) || undefined,
    allowIceCustomization: !!raw?.allowIceCustomization,
    iceOptions: strList(raw?.iceOptions, 10, 40),
    defaultIce: str(raw?.defaultIce, 40) || undefined,
    tags: strList(raw?.tags, 10, 30)
  };
}

const DISCOUNT_TYPES = ['percent', 'fixed', 'same_price', 'free_item'];
const VOUCHER_STATUS = ['active', 'scheduled', 'paused', 'expired'];

export function sanitizeVoucher(raw: any) {
  const code = str(raw?.code, 30).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const title = str(raw?.title, 120);
  if (!code || !title) return null;
  return {
    id: str(raw?.id, 60) || `v-${crypto.randomBytes(5).toString('hex')}`,
    code,
    title,
    description: str(raw?.description, 1000),
    discountType: DISCOUNT_TYPES.includes(raw?.discountType) ? raw.discountType : 'fixed',
    discountValue: num(raw?.discountValue, 0, 100_000_000),
    maxDiscountAmount: raw?.maxDiscountAmount != null ? num(raw.maxDiscountAmount, 0, 100_000_000) : undefined,
    minOrderValue: num(raw?.minOrderValue, 0, 100_000_000),
    targetAudience: str(raw?.targetAudience, 30) || 'all',
    applyToAllCustomers: raw?.applyToAllCustomers !== false,
    targetAudiences: strList(raw?.targetAudiences, 10, 30),
    startDate: str(raw?.startDate, 30),
    endDate: str(raw?.endDate, 30),
    usageLimit: Math.round(num(raw?.usageLimit, 0, 10_000_000)),
    usedCount: Math.round(num(raw?.usedCount, 0, 10_000_000)),
    perCustomerLimit: Math.round(num(raw?.perCustomerLimit, 0, 1000, 1)),
    status: VOUCHER_STATUS.includes(raw?.status) ? raw.status : 'active',
    bannerImage: isSafeImage(str(raw?.bannerImage, 2000)) ? str(raw?.bannerImage, 2000) : undefined,
    applicableCategory: str(raw?.applicableCategory, 60) || undefined,
    tags: strList(raw?.tags, 10, 30)
  };
}

/** Shop vouchers in the shape the customer app & voucher validation already use. */
export function shopVouchersAsRecords(shopId: string): VoucherRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .getShopCollection(shopId, 'vouchers')
    .filter((v: any) => v.status === 'active' && (!v.endDate || v.endDate.slice(0, 10) >= today) && (!v.startDate || v.startDate.slice(0, 10) <= today))
    .map((v: any) => ({
      id: v.id,
      shop_id: shopId,
      code: v.code,
      title: v.title,
      description: v.description,
      discount_type: v.discountType === 'percent' ? 'percent' : v.discountType === 'free_item' ? 'free_item' : 'fixed',
      discount_value: v.discountValue,
      max_discount: v.maxDiscountAmount,
      min_order: v.minOrderValue,
      target_audiences: v.targetAudiences,
      start_date: v.startDate,
      end_date: v.endDate,
      usage_limit: v.usageLimit,
      used_count: v.usedCount,
      status: 'active' as const
    }));
}

/** Public menu for the customer app (only items the shop has made available). */
export function publicMenu(shopId: string) {
  return db
    .getShopCollection(shopId, 'menu')
    .filter((m: any) => m.isAvailable && m.stock !== 0)
    .map((m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description || '',
      price: m.allowSizeCustomization && m.sizeOptions?.length
        ? Math.min(...m.sizeOptions.map((s: any) => s.price))
        : m.price,
      image: m.image,
      category: m.category,
      sizeOptions: m.allowSizeCustomization ? m.sizeOptions : [],
      defaultSize: m.defaultSize,
      sugarOptions: m.allowSugarCustomization ? m.sugarOptions : [],
      iceOptions: m.allowIceCustomization ? m.iceOptions : [],
      tags: m.tags || []
    }));
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function registerShopDataRoutes(app: Express) {
  const shopOnly = [authenticateToken, requireAccount('shop'), requireShopAccess()] as const;
  const bigJson = express.json({ limit: '6mb' });

  // ---------- menu ----------
  app.get('/api/merchant/shops/:id/menu', ...shopOnly, (req: AuthRequest, res: Response) => {
    res.json({ items: db.getShopCollection(req.params.id, 'menu') });
  });

  /** Replace the whole menu (the shop app sends its list after every add/edit/delete). */
  app.put('/api/merchant/shops/:id/menu', bigJson, ...shopOnly, (req: AuthRequest, res: Response) => {
    if (!Array.isArray(req.body?.items)) return res.status(400).json({ error: 'items phải là danh sách' });
    if (req.body.items.length > 300) return res.status(400).json({ error: 'Tối đa 300 món' });
    const seen = new Set<string>();
    const items = req.body.items
      .map(sanitizeMenuItem)
      .filter((m: any) => m && !seen.has(m.id) && seen.add(m.id));
    db.setShopCollection(req.params.id, 'menu', items);
    publish([topics.availability(req.params.id)], 'menu', { shop_id: req.params.id });
    res.json({ items });
  });

  app.get('/api/shops/:id/menu', (req: Request, res: Response) => {
    if (!db.getShopById(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy quán' });
    res.json({ items: publicMenu(req.params.id) });
  });

  // ---------- vouchers ----------
  app.get('/api/merchant/shops/:id/vouchers', ...shopOnly, (req: AuthRequest, res: Response) => {
    res.json({ items: db.getShopCollection(req.params.id, 'vouchers') });
  });

  app.put('/api/merchant/shops/:id/vouchers', bigJson, ...shopOnly, (req: AuthRequest, res: Response) => {
    if (!Array.isArray(req.body?.items)) return res.status(400).json({ error: 'items phải là danh sách' });
    if (req.body.items.length > 200) return res.status(400).json({ error: 'Tối đa 200 voucher' });
    const codes = new Set<string>();
    const items = req.body.items.map(sanitizeVoucher).filter((v: any) => v && !codes.has(v.code) && codes.add(v.code));
    db.setShopCollection(req.params.id, 'vouchers', items);
    res.json({ items });
  });

  // ---------- image uploads (menu photos, banners) ----------
  app.post('/api/merchant/shops/:id/uploads', bigJson, ...shopOnly, (req: AuthRequest, res: Response) => {
    const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''));
    if (!m || !IMAGE_TYPES[m[1]]) return res.status(400).json({ error: 'Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_UPLOAD_BYTES) return res.status(413).json({ error: 'Ảnh tối đa 3MB' });
    const name = `${req.params.id.replace(/[^a-z0-9-]/gi, '')}-${crypto.randomBytes(8).toString('hex')}.${IMAGE_TYPES[m[1]]}`;
    // Through the storage driver, so the same route works on local disk and on an
    // S3-compatible bucket without the caller knowing which is active.
    storage().put(name, buf, m[1])
      .then(({ url }) => res.status(201).json({ url }))
      .catch(err => {
        console.error('[MOBLER API] upload failed', err);
        res.status(502).json({ error: 'Không lưu được ảnh, vui lòng thử lại', code: 'UPLOAD_FAILED' });
      });
  });

  app.get('/api/media/uploads/:file', (req: Request, res: Response) => {
    const file = String(req.params.file);
    if (!/^[a-z0-9_.-]+$/i.test(file)) return res.status(400).end();
    const full = path.join(UPLOAD_DIR, file);
    if (!fs.existsSync(full)) return res.status(404).end();
    res.set('Cache-Control', 'public, max-age=86400');
    res.sendFile(full);
  });

  // ---------- customers (derived from real bookings & orders) ----------
  app.get('/api/merchant/shops/:id/customers', ...shopOnly, (req: AuthRequest, res: Response) => {
    const shopId = req.params.id;
    const map = new Map<string, any>();
    const get = (userId: string, name: string, phone: string) => {
      if (!map.has(userId)) {
        const u = db.findUserById(userId);
        map.set(userId, {
          id: userId,
          name: u?.name || name,
          phone: u?.phone || phone,
          email: u?.email || '',
          avatar: u?.avatar || '',
          visitCount: 0,
          bookingCount: 0,
          totalSpent: 0,
          points: 0,
          favoriteItems: [] as string[],
          joinDate: '',
          lastVisit: '',
          _items: new Map<string, number>()
        });
      }
      return map.get(userId);
    };
    for (const b of db.getBookingsByShopId(shopId)) {
      const c = get(b.user_id, b.user_name, b.user_phone);
      c.bookingCount++;
      if (b.status === 'completed' || b.status === 'arrived') c.visitCount++;
      const when = `${b.date}T${b.time}`;
      if (!c.joinDate || when < c.joinDate) c.joinDate = when;
      if ((b.status === 'completed' || b.status === 'arrived') && when > c.lastVisit) c.lastVisit = when;
    }
    for (const o of db.getOrdersByShopId(shopId)) {
      const c = get(o.user_id, o.user_name, '');
      if (isSettledOrder(o)) c.totalSpent += o.total || 0;
      o.items.forEach(i => c._items.set(i.name, (c._items.get(i.name) || 0) + i.quantity));
      if (!c.joinDate || o.created_at < c.joinDate) c.joinDate = o.created_at;
      if (o.created_at > c.lastVisit) c.lastVisit = o.created_at;
    }
    const customers = [...map.values()].map(c => {
      const fav = [...c._items.entries()].sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((e: any) => e[0]);
      const { _items, ...rest } = c;
      return { ...rest, favoriteItems: fav, points: Math.floor(rest.totalSpent / 10000) };
    });
    res.json({ customers: customers.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit)) });
  });

  // ---------- reviews (real reviews of this shop) ----------
  app.get('/api/merchant/shops/:id/reviews', ...shopOnly, (req: AuthRequest, res: Response) => {
    const reviews = db.getReviewsByShopId(req.params.id).map((r: any) => ({
      id: r.id,
      customerName: r.userName,
      customerAvatar: r.userAvatar,
      rating: r.metrics?.accuracy || r.rating || 5,
      comment: r.content,
      date: r.date,
      shopReply: r.shop_reply ? { content: r.shop_reply, date: r.replied_at || '' } : undefined
    }));
    res.json({ reviews });
  });

  // ---------- analytics (computed only from real data) ----------
  app.get('/api/merchant/shops/:id/insights', ...shopOnly, (req: AuthRequest, res: Response) => {
    const shopId = req.params.id;
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 14));
    const bookings = db.getBookingsByShopId(shopId);
    const orders = db.getOrdersByShopId(shopId);
    const settledOrders = orders.filter(isSettledOrder);
    const reviews = db.getReviewsByShopId(shopId);

    const series: { date: string; revenue: number; bookings: number; guests: number; orders: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      series.push({ date: d, revenue: 0, bookings: 0, guests: 0, orders: 0 });
    }
    const idx = new Map(series.map((s, i) => [s.date, i]));
    for (const o of settledOrders) {
      const i = idx.get(dayKey(o.created_at));
      if (i !== undefined) {
        series[i].revenue += o.total || 0;
        series[i].orders++;
      }
    }
    for (const b of bookings) {
      if (b.status === 'cancelled' || b.status === 'rejected') continue;
      const i = idx.get(b.date);
      if (i !== undefined) {
        series[i].bookings++;
        series[i].guests += b.guests;
      }
    }

    const itemCount = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const o of settledOrders) for (const it of o.items) {
      const cur = itemCount.get(it.name) || { name: it.name, quantity: 0, revenue: 0 };
      cur.quantity += it.quantity;
      cur.revenue += (it.price || 0) * it.quantity;
      itemCount.set(it.name, cur);
    }
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, bookings: 0 }));
    bookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected').forEach(b => hours[Number(b.time.slice(0, 2))].bookings++);

    const today = now.toISOString().slice(0, 10);
    const totalRevenue = settledOrders.reduce((s, o) => s + (o.total || 0), 0);
    const ratings = reviews.map((r: any) => r.metrics?.accuracy).filter((x: any) => typeof x === 'number');
    res.json({
      totals: {
        revenue: totalRevenue,
        todayRevenue: settledOrders.filter(o => dayKey(o.created_at) === today).reduce((s, o) => s + (o.total || 0), 0),
        orders: settledOrders.length,
        bookings: bookings.length,
        activeBookings: bookings.filter(b => isActiveBooking(b.status)).length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        todayBookings: bookings.filter(b => b.date === today && b.status !== 'cancelled' && b.status !== 'rejected').length,
        cancelledBookings: bookings.filter(b => b.status === 'cancelled' || b.status === 'rejected').length,
        customers: new Set([...bookings.map(b => b.user_id), ...orders.map(o => o.user_id)]).size,
        reviews: reviews.length,
        averageRating: ratings.length ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10 : null,
        menuItems: db.getShopCollection(shopId, 'menu').length,
        activeVouchers: shopVouchersAsRecords(shopId).length
      },
      series,
      topItems: [...itemCount.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
      hours,
      recentBookings: bookings.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)
    });
  });
}
