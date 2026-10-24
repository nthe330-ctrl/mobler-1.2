import crypto from 'crypto';
import { db, UserRecord } from './db';
import {
  ACHIEVEMENTS, AchievementDef, AchievementStats, EMPTY_STATS, buildProgress
} from '../../shared/achievements';
import { ShopLoyalty, buildShopLoyalty } from '../../shared/shopLoyalty';
import { CHECKED_IN_STATUSES as CHECKED_IN_BOOKING_STATUSES } from '../../shared/booking';
import { POINTS_PER_VISIT, POINTS_PER_REVIEW, POINTS_REVIEW_PHOTO_BONUS, resolveRank } from '../../shared/ranks';

/**
 * A booking counts from the moment the guest is really checked in — that is, when the shop
 * scanned the guest's QR and the booking moved to `arrived` — and keeps counting once the
 * visit is wrapped up as `completed`.
 *
 * Counting both statuses is what makes mission progress idempotent: every metric below is
 * RECOMPUTED from the bookings table, and a booking holds exactly one status at a time, so
 * the same visit contributes exactly 1 whether it currently reads `arrived` or `completed`.
 * Re-scanning the code, reloading the page or the shop later pressing "Hoàn tất" therefore
 * cannot advance a bar twice. Rewards are additionally guarded by user.achievements.unlocked.
 *
 * `pending`, `confirmed`, `cancelled` and `rejected` never count — no visit happened.
 */
const VISIT_STATUSES = CHECKED_IN_BOOKING_STATUSES;
const CHECKED_IN_STATUSES = CHECKED_IN_BOOKING_STATUSES;

export interface PersonalVoucher {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'percent' | 'fixed' | 'bogo';
  discount_value: number;
  max_discount?: number;
  min_order?: number;
  source: 'achievement';
  achievement_id: string;
  status: 'active' | 'used' | 'expired';
  created_at: string;
  expires_at: string;
}

/** Pull a district/area name out of a free-text Vietnamese address. */
export function extractDistrict(address: string): string | null {
  const a = String(address || '');
  const quan = /\bqu[aậ]n\s*([0-9]{1,2})\b/i.exec(a);
  if (quan) return `Quận ${quan[1]}`;
  const named = ['Bình Thạnh', 'Thủ Đức', 'Phú Nhuận', 'Gò Vấp', 'Tân Bình', 'Tân Phú', 'Bình Tân', 'Hóc Môn', 'Củ Chi', 'Nhà Bè', 'Bình Chánh', 'Cần Giờ', 'Hoàn Kiếm', 'Ba Đình', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Tây Hồ', 'Hải Châu', 'Thanh Khê', 'Ngũ Hành Sơn', 'Sơn Trà'];
  const lower = a.toLowerCase();
  for (const d of named) if (lower.includes(d.toLowerCase())) return d;
  return null;
}

/** Great-circle distance between two coordinates, in km. */
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Cumulative distance travelled between consecutive check-ins, in km.
 * Visits are walked in chronological order; two check-ins at the same shop add 0,
 * and a shop without coordinates is skipped rather than guessed.
 */
function travelDistanceKm(visits: { shop_id: string; date: string; time: string }[]): number {
  const points = visits
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map(v => db.getShopById(v.shop_id)?.location)
    .filter((l): l is { lat: number; lng: number } => !!l && Number.isFinite(l.lat) && Number.isFinite(l.lng));
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceKm(points[i - 1], points[i]);
  return Math.round(total * 10) / 10;
}

/** Compute every achievement metric for a customer from their real bookings & reviews. */
export function computeStats(userId: string): AchievementStats {
  const bookings = db.getBookingsByUserId(userId);
  const visits = bookings.filter(b => VISIT_STATUSES.includes(b.status));
  const checkedIn = bookings.filter(b => CHECKED_IN_STATUSES.includes(b.status));

  const shopVisitCount = new Map<string, number>();
  const districts = new Set<string>();
  for (const b of visits) {
    shopVisitCount.set(b.shop_id, (shopVisitCount.get(b.shop_id) || 0) + 1);
    const shop = db.getShopById(b.shop_id);
    const d = extractDistrict(shop?.address || b.shop_address || '');
    if (d) districts.add(d);
  }

  const reviews = db.getRawDb().reviews.filter((r: any) => r.userId === userId);
  const photos = reviews.reduce((s: number, r: any) => s + (Array.isArray(r.images) ? r.images.length : 0), 0);
  const reviewsWithPhoto = reviews.filter((r: any) => Array.isArray(r.images) && r.images.length > 0).length;
  const likes = reviews.reduce((s: number, r: any) => s + (Number(r.likes) || 0), 0);

  return {
    shops_visited: shopVisitCount.size,
    reviews_with_photo: reviewsWithPhoto,
    photos_posted: photos,
    morning_bookings: visits.filter(b => b.time < '08:00').length,
    vip_shops: [...shopVisitCount.values()].filter(n => n >= 5).length,
    districts_visited: districts.size,
    travel_distance_km: travelDistanceKm(visits),
    review_likes: likes,
    night_bookings: checkedIn.filter(b => b.time >= '23:00').length
  };
}

function getUnlocked(user: UserRecord): Record<string, string> {
  return (user as any).achievements?.unlocked || {};
}

/**
 * Mission rewards accumulate into `mission_points`, NOT into `points`.
 *
 * `points` is recomputed from scratch on every sync (see syncUserAchievements) as
 * visits × POINTS_PER_VISIT + mission_points. Keeping the two sources apart is what
 * makes the total idempotent: if mission rewards were added straight onto `points`,
 * the next recompute would overwrite them, and adding visit points onto the same
 * running field would double-count on every re-scan or reload.
 *
 * Existing accounts are migrated once, in syncUserAchievements.
 */
function grantReward(user: UserRecord, def: AchievementDef, now: string): PersonalVoucher | null {
  user.mission_points = (user.mission_points || 0) + def.reward.points;
  if (!def.reward.voucher) return null;
  const v = def.reward.voucher;
  const voucher: PersonalVoucher = {
    id: `pv-${crypto.randomBytes(5).toString('hex')}`,
    code: `MB-${def.id.replace('ach-', 'A')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    title: v.title,
    description: v.description,
    discount_type: v.discount_type,
    discount_value: v.discount_value,
    max_discount: v.max_discount,
    min_order: v.min_order,
    source: 'achievement',
    achievement_id: def.id,
    status: 'active',
    created_at: now,
    expires_at: new Date(Date.now() + v.valid_days * 86400000).toISOString()
  };
  (user as any).wallet_vouchers = [voucher, ...((user as any).wallet_vouchers || [])];
  return voucher;
}

export interface SyncResult {
  stats: AchievementStats;
  newlyUnlocked: { id: string; title: string; icon: string; rewardLabel: string }[];
  /** Points gained by THIS sync — 0 when nothing changed. Drives the "+N điểm" feedback. */
  pointsEarned: number;
  /** The guest's new total. */
  points: number;
  /** Set only when this sync crossed into a higher tier, otherwise null. */
  rankedUp: import('../../shared/ranks').RankTier | null;
}

/**
 * Recompute a customer's achievements and grant rewards for any that were just completed.
 * Idempotent: a reward is granted exactly once (tracked in user.achievements.unlocked).
 */
export function syncUserAchievements(userId: string): SyncResult {
  const user = db.findUserById(userId);
  if (!user || user.account_type !== 'customer') return { stats: EMPTY_STATS, newlyUnlocked: [], pointsEarned: 0, points: 0, rankedUp: null };
  const stats = computeStats(userId);
  const unlocked = { ...getUnlocked(user) };
  const now = new Date().toISOString();
  const newlyUnlocked: SyncResult['newlyUnlocked'] = [];

  /* One-time migration. Before visit points existed, mission rewards were added straight
     onto `points`, so for an existing account that total IS its mission total. Seed
     `mission_points` from it once; without this, the recompute below would wipe rewards
     people had already earned. Guests who have earned nothing start at 0 either way. */
  if (user.mission_points === undefined) {
    user.mission_points = user.points || 0;
  }
  const pointsBefore = user.points || 0;

  for (const def of ACHIEVEMENTS) {
    if (unlocked[def.id]) continue;
    if ((stats[def.metric] ?? 0) >= def.target) {
      unlocked[def.id] = now;
      grantReward(user, def, now);
      if (!user.badges?.includes(def.title)) user.badges = [...(user.badges || []), def.title];
      newlyUnlocked.push({ id: def.id, title: def.title, icon: def.icon, rewardLabel: def.rewardLabel });
    }
  }

  /* Derive the total rather than adding to it. Both terms are recomputed from durable
     facts — the bookings table and the unlocked-missions map — so calling this twice
     yields the same number. A second QR scan, a page reload, or the shop pressing
     "Hoàn tất" after check-in cannot inflate it. */
  const visits = db.getBookingsByUserId(userId).filter(b => VISIT_STATUSES.includes(b.status)).length;
  const reviewCount = db.getRawDb().reviews.filter((r: any) => r.userId === userId).length;
  user.points =
    visits * POINTS_PER_VISIT +
    reviewCount * POINTS_PER_REVIEW +
    (stats.reviews_with_photo || 0) * POINTS_REVIEW_PHOTO_BONUS +
    (user.mission_points || 0);

  // Persist whenever the total moved, not only when a mission unlocked — otherwise the
  // points earned by finishing a booking would be recomputed forever and never saved.
  if (newlyUnlocked.length > 0 || !(user as any).achievements || user.points !== pointsBefore) {
    (user as any).achievements = { unlocked, updated_at: now };
    db.updateUser(user.id, {
      points: user.points,
      mission_points: user.mission_points,
      badges: user.badges,
      achievements: (user as any).achievements,
      wallet_vouchers: (user as any).wallet_vouchers
    } as any);
  }
  /* The client needs to know what just changed, not just the new total: the celebration
     screen shows the delta, and the rank-up card only appears on a real promotion. */
  const rankBefore = resolveRank(pointsBefore);
  const rankAfter = resolveRank(user.points);
  return {
    stats,
    newlyUnlocked,
    pointsEarned: user.points - pointsBefore,
    points: user.points,
    rankedUp: rankAfter.level > rankBefore.level ? rankAfter.current : null
  };
}

/**
 * Per-shop loyalty titles, computed from the same real activity as the global missions:
 * checked-in bookings (`arrived` or `completed`) and this customer's own reviews. Shops the
 * customer has never actually checked in at are left out entirely — no title to show yet.
 */
export function getShopLoyalty(userId: string): ShopLoyalty[] {
  const visits = db.getBookingsByUserId(userId).filter(b => VISIT_STATUSES.includes(b.status));
  const reviews = db.getRawDb().reviews.filter((r: any) => r.userId === userId);

  const byShop = new Map<string, { visitDates: string[]; reviewDates: (string | null)[]; name: string; image?: string }>();

  for (const b of visits) {
    const shop = db.getShopById(b.shop_id);
    const entry = byShop.get(b.shop_id) || {
      visitDates: [],
      reviewDates: [],
      name: shop?.name || b.shop_name,
      image: shop?.coverImage || shop?.images?.[0] || b.shop_image
    };
    // The visit happened at QR check-in, not on the date the table was booked for — a
    // reservation date can sit in the future, a real check-in never can. Fall back to the
    // completion stamp for visits recorded before check-in was tracked.
    const history = b.status_history || [];
    const arrivedAt = history.filter(h => h.status === 'arrived').pop()?.at;
    const completedAt = history.filter(h => h.status === 'completed').pop()?.at;
    entry.visitDates.push(arrivedAt || completedAt || b.date);
    byShop.set(b.shop_id, entry);
  }

  for (const r of reviews) {
    const entry = byShop.get((r as any).shop_id);
    // Only count reviews for shops the customer has actually checked in at.
    if (!entry) continue;
    entry.reviewDates.push((r as any).created_at || null);
  }

  return [...byShop.entries()]
    .map(([shop_id, e]) =>
      buildShopLoyalty({
        shop_id,
        shop_name: e.name,
        shop_image: e.image,
        visitDates: e.visitDates,
        reviewDates: e.reviewDates
      })
    )
    .sort((a, b) => b.visits - a.visits || a.shop_name.localeCompare(b.shop_name));
}

/** Full achievement list with live progress for display. */
export function getUserAchievements(userId: string) {
  const user = db.findUserById(userId);
  const stats = computeStats(userId);
  const unlocked = user ? getUnlocked(user) : {};
  return buildProgress(stats, unlocked);
}

export function expireAndListWalletVouchers(user: UserRecord): PersonalVoucher[] {
  const now = Date.now();
  const list: PersonalVoucher[] = ((user as any).wallet_vouchers || []).map((v: PersonalVoucher) =>
    v.status === 'active' && new Date(v.expires_at).getTime() < now ? { ...v, status: 'expired' } : v
  );
  (user as any).wallet_vouchers = list;
  return list;
}
