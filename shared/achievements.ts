/**
 * Mission system (nhiệm vụ) — shared by the backend (which computes progress and
 * grants rewards from real activity) and the customer app (which displays them).
 *
 * Rules the user asked for:
 *  - Points come ONLY from completing missions. There is no per-booking point drip.
 *  - Each mission has a difficulty (easy / medium / hard) that decides its points.
 *  - Progress counts a visit ONLY when the booking is COMPLETED — i.e. the customer
 *    actually checked in at the shop. Confirmed / arrived alone never count.
 *
 * A new account starts at 0 on every mission. When a mission is completed its reward
 * (points, and sometimes a personal voucher) is granted automatically, exactly once.
 */

export type RewardKind = 'points' | 'voucher';

/** Mission difficulty → how many points completing it is worth. */
export type MissionDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Difficulty is a display label only — each mission carries its own explicit point
 * value below, so two "medium" missions may be worth different amounts.
 */
export const DIFFICULTY_LABEL: Record<MissionDifficulty, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó'
};

export interface AchievementReward {
  points: number;
  /** A personal voucher added to the customer's wallet when the mission unlocks. */
  voucher?: {
    title: string;
    description: string;
    discount_type: 'percent' | 'fixed' | 'bogo';
    discount_value: number;
    max_discount?: number;
    min_order?: number;
    /** Days the reward voucher stays valid after it is granted. */
    valid_days: number;
  };
}

/** Which metric a mission measures. All come from COMPLETED (checked-in) activity. */
export type AchievementMetric =
  | 'shops_visited'       // distinct shops with a COMPLETED booking (checked in)
  | 'reviews_with_photo'  // reviews the customer posted that include at least one photo
  | 'photos_posted'       // total photos across the customer's reviews
  | 'morning_bookings'    // COMPLETED visits that started before 08:00
  | 'vip_shops'           // shops where the customer has 5+ COMPLETED visits
  | 'districts_visited'   // distinct districts of COMPLETED visits
  | 'travel_distance_km'  // cumulative km between consecutively checked-in shops
  | 'review_likes'        // likes received across the customer's reviews
  | 'night_bookings';     // COMPLETED visits at/after 23:00

export interface AchievementDef {
  id: string;
  icon: string;
  difficulty: MissionDifficulty;
  metric: AchievementMetric;
  target: number;
  title: string;
  description: string;
  rewardLabel: string;
  reward: AchievementReward;
}

/** Build a mission's reward label so it always matches its real point value. */
function label(points: number, extra?: string): string {
  const pts = `+${points.toLocaleString('vi-VN')} điểm`;
  return extra ? `${extra} · ${pts}` : pts;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach-8',
    icon: '🌙',
    difficulty: 'easy',
    metric: 'night_bookings',
    target: 1,
    title: 'Cú Đêm Cà Phê',
    description: 'Check-in hoàn tất tại 1 quán sau 23:00',
    rewardLabel: label(300, 'Voucher Đêm Cà Phê'),
    reward: {
      points: 300,
      voucher: { title: 'Thưởng Cú Đêm Cà Phê', description: 'Giảm 25.000đ cho đơn đặt bàn buổi tối', discount_type: 'fixed', discount_value: 25000, min_order: 60000, valid_days: 45 }
    }
  },
  {
    id: 'ach-4',
    icon: '🌅',
    difficulty: 'medium',
    metric: 'morning_bookings',
    target: 3,
    title: 'Thợ Săn Bình Minh',
    description: 'Check-in hoàn tất trước 08:00 sáng 3 lần',
    rewardLabel: label(800, 'Voucher Mua 1 Tặng 1'),
    reward: {
      points: 800,
      voucher: { title: 'Thưởng Thợ Săn Bình Minh', description: 'Mua 1 tặng 1 thức uống (đơn từ 90.000đ)', discount_type: 'bogo', discount_value: 100, min_order: 90000, valid_days: 45 }
    }
  },
  {
    id: 'ach-2',
    icon: '✍️',
    difficulty: 'medium',
    metric: 'reviews_with_photo',
    target: 10,
    title: 'Chuyên Gia Review',
    description: 'Viết 10 bài đánh giá có kèm hình ảnh',
    rewardLabel: label(1000, 'Voucher giảm 20%'),
    reward: {
      points: 1000,
      voucher: { title: 'Thưởng Chuyên Gia Review', description: 'Giảm 20% (tối đa 30.000đ) cho đơn đặt bàn tiếp theo', discount_type: 'percent', discount_value: 20, max_discount: 30000, min_order: 50000, valid_days: 60 }
    }
  },
  {
    id: 'ach-3',
    icon: '📸',
    difficulty: 'medium',
    metric: 'photos_posted',
    target: 15,
    title: 'Nhiếp Ảnh Gia Check-in',
    description: 'Đăng tải 15 bức ảnh trong các bài đánh giá',
    rewardLabel: label(1500, 'Huy hiệu Nhiếp Ảnh Gia'),
    reward: { points: 1500 }
  },
  {
    id: 'ach-1',
    icon: '☕',
    difficulty: 'hard',
    metric: 'shops_visited',
    target: 20,
    title: 'Tín Đồ Cà Phê',
    description: 'Check-in hoàn tất tại 20 quán cà phê khác nhau',
    rewardLabel: label(2000, 'Huy hiệu Tín Đồ'),
    reward: { points: 2000 }
  },
  {
    id: 'ach-5',
    icon: '👑',
    difficulty: 'medium',
    metric: 'vip_shops',
    target: 3,
    title: 'Thần Đèn Cà Phê',
    description: 'Trở thành khách quen (5+ lượt check-in) tại 3 quán trở lên',
    rewardLabel: label(500, 'Huy hiệu Thượng Khách'),
    reward: { points: 500 }
  },
  {
    id: 'ach-6',
    icon: '🗺️',
    difficulty: 'medium',
    metric: 'travel_distance_km',
    target: 30,
    title: 'Thám Hiểm Toàn Thành',
    description: 'Tổng quãng đưởng giữa các quán đã check-in cộng dồn ≥ 30km',
    rewardLabel: label(500, 'Huy hiệu Toàn Thành'),
    reward: { points: 500 }
  },
  {
    id: 'ach-7',
    icon: '💬',
    difficulty: 'hard',
    metric: 'review_likes',
    target: 50,
    title: 'Cộng Đồng Sôi Nổi',
    description: 'Nhận 50 lượt thích trên các bài đánh giá của bạn',
    rewardLabel: label(1500, 'Danh hiệu Reviewer Nổi Bật'),
    reward: { points: 1500 }
  }
];

/** Total points obtainable from completing every mission (used to size the rank ladder). */
export const TOTAL_MISSION_POINTS = ACHIEVEMENTS.reduce((s, a) => s + a.reward.points, 0);

/** The raw counts the engine needs, all measured from real COMPLETED activity. */
export interface AchievementStats {
  shops_visited: number;
  reviews_with_photo: number;
  photos_posted: number;
  morning_bookings: number;
  vip_shops: number;
  districts_visited: number;
  travel_distance_km: number;
  review_likes: number;
  night_bookings: number;
}

export const EMPTY_STATS: AchievementStats = {
  shops_visited: 0,
  reviews_with_photo: 0,
  photos_posted: 0,
  morning_bookings: 0,
  vip_shops: 0,
  districts_visited: 0,
  travel_distance_km: 0,
  review_likes: 0,
  night_bookings: 0
};

export interface AchievementProgress extends AchievementDef {
  progress: number;
  achieved: boolean;
  unlocked_at?: string;
}

export function buildProgress(stats: AchievementStats, unlocked: Record<string, string> = {}): AchievementProgress[] {
  return ACHIEVEMENTS.map(a => {
    const progress = Math.min(stats[a.metric] ?? 0, a.target);
    return {
      ...a,
      progress,
      achieved: (stats[a.metric] ?? 0) >= a.target || !!unlocked[a.id],
      unlocked_at: unlocked[a.id]
    };
  });
}
