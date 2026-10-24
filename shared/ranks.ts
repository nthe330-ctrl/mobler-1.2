/**
 * MOBLER explorer-rank system.
 *
 * One real currency: `points`, earned only from real activity:
 *   • POINTS_PER_VISIT for every booking the shop actually scanned in, and
 *   • the reward of every unlocked mission.
 * Merely booking earns nothing — a `pending` or `confirmed` booking is not a visit.
 * A new account starts at 0 and climbs the ladder below.
 *
 * The names follow an exploration / adventure arc: from a first-time wanderer
 * to a legend of the city's coffee map. Pure, framework-free so both the server
 * and the client resolve a rank identically.
 */

export interface RankTier {
  /** Stable id, never shown to users. */
  id: string;
  /** Vietnamese title shown on the passport. */
  title: string;
  /** One-line flavour text. */
  subtitle: string;
  /** Emoji badge. */
  icon: string;
  /** Minimum points to hold this rank (inclusive). */
  minPoints: number;
  /** Accent color (used for the ring / gradient). */
  color: string;
}

/** Ordered low → high. The first tier must start at 0. */
export const RANK_TIERS: RankTier[] = [
  { id: 'rank-1', title: 'Bước Chân Khai Phá',   subtitle: 'Những bước chân đầu tiên trên bản đồ cà phê', icon: '👣', minPoints: 0,    color: '#9CA3AF' },
  { id: 'rank-2', title: 'Lữ Khách Mới',         subtitle: 'Bắt đầu rong ruổi khắp các con phố',        icon: '🧭', minPoints: 100,  color: '#5B8C5A' },
  { id: 'rank-3', title: 'Kẻ Khám Phá',          subtitle: 'Bắt đầu lần theo những quán lạ',           icon: '🔎', minPoints: 300,  color: '#2E8B8B' },
  { id: 'rank-4', title: 'Thám Hiểm Giả',        subtitle: 'Đọc bản đồ thành thạo, tìm đâu trúng đó',  icon: '🗺️', minPoints: 500,  color: '#B88645' },
  { id: 'rank-5', title: 'Bậc Thầy Khám Phá',    subtitle: 'Khai phá khắp các vùng đất cà phê',        icon: '⛰️', minPoints: 1500, color: '#C2703D' },
  { id: 'rank-6', title: 'Cao Thủ Trải Nghiệm',  subtitle: 'Mỗi quán đều in dấu chân bạn',             icon: '🧗', minPoints: 2500, color: '#6D4AC2' },
  { id: 'rank-7', title: 'Huyền Thoại Phiêu Lưu', subtitle: 'Tên bạn vang danh giới mê cà phê',        icon: '🏆', minPoints: 5000, color: '#C9A227' },
  { id: 'rank-8', title: 'Kẻ Chinh Phục Bản Đồ', subtitle: 'Chinh phục trọn bản đồ thành phố',         icon: '👑', minPoints: 8000, color: '#D4AF37' }
];

/**
 * Points for one real visit — a booking the shop scanned in (`arrived`, and still counted
 * once it is wrapped up as `completed`).
 *
 * Calibrated against the ladder above: tier 2 sits at 100 points, so a guest sees the bar
 * move about a third of a tier for every finished booking and is promoted on their fourth.
 * That is the whole point of this number — progress has to be visible after ONE visit,
 * otherwise the bar reads as broken. Missions stay as the bigger, rarer jumps on top.
 */
export const POINTS_PER_VISIT = 30;

export interface ResolvedRank {
  points: number;
  /** The tier currently held. */
  current: RankTier;
  /** The index of the current tier (0-based). */
  level: number;
  /** The next tier up, or null when already at the top. */
  next: RankTier | null;
  /** Points still needed to reach `next` (0 when maxed out). */
  pointsToNext: number;
  /** Progress inside the current tier, 0–100. 100 when maxed out. */
  progressPercent: number;
  /** True when the top tier has been reached. */
  isMax: boolean;
}

/** Resolve a point total to its rank, next rank and progress. Never throws. */
export function resolveRank(rawPoints: number | undefined | null): ResolvedRank {
  const points = Math.max(0, Math.floor(Number(rawPoints) || 0));
  let level = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (points >= RANK_TIERS[i].minPoints) level = i;
    else break;
  }
  const current = RANK_TIERS[level];
  const next = RANK_TIERS[level + 1] ?? null;
  if (!next) {
    return { points, current, level, next: null, pointsToNext: 0, progressPercent: 100, isMax: true };
  }
  const span = next.minPoints - current.minPoints;
  const into = points - current.minPoints;
  // Floor so the bar only shows 100% once the next tier is actually reached.
  const progressPercent = span > 0 ? Math.min(99, Math.max(0, Math.floor((into / span) * 100))) : 0;
  return { points, current, level, next, pointsToNext: Math.max(0, next.minPoints - points), progressPercent, isMax: false };
}
