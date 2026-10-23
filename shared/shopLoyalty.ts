/**
 * Per-shop loyalty titles ("Danh hiệu tại <quán>") — shared by the backend, which computes
 * them from real activity, and the customer app, which only renders what it is given.
 *
 * Same rule as the global missions in achievements.ts: a visit counts ONLY when the booking
 * is COMPLETED (the customer actually checked in). Pending/confirmed/arrived never count.
 * Reviews are counted per shop, from reviews this customer wrote for that shop.
 */

export type ShopTitleId = 'new' | 'regular' | 'vip' | 'soulmate';

export interface ShopTitleDef {
  id: ShopTitleId;
  /** Completed visits required at this shop. */
  visits: number;
  /** Reviews for this shop the customer must also have written. */
  reviews?: number;
  title: string;
  description: string;
  /** Perk this tier unlocks — shown as "next reward" while it is still locked. */
  reward: string;
  /** i18n keys; the Vietnamese strings above are the fallbacks. */
  tierKey: string;
  titleKey: string;
  descKey: string;
  rewardKey: string;
}

export const SHOP_TITLES: ShopTitleDef[] = [
  {
    id: 'new',
    visits: 1,
    title: 'Khách Mới',
    description: 'Ghé quán lần đầu tiên',
    reward: 'Nước chào mừng',
    tierKey: 'storeTier.new',
    titleKey: 'storeAch.newTitle',
    descKey: 'storeAch.newDesc',
    rewardKey: 'storeReward.welcomeDrink'
  },
  {
    id: 'regular',
    visits: 5,
    title: 'Khách Quen',
    description: 'Ghé quán 5 lần',
    reward: 'Giảm 10% hóa đơn',
    tierKey: 'storeTier.regular',
    titleKey: 'storeAch.regularTitle',
    descKey: 'storeAch.regularDesc',
    rewardKey: 'storeReward.discount10'
  },
  {
    id: 'vip',
    visits: 10,
    reviews: 2,
    title: 'Khách Ruột (VIP)',
    description: 'Ghé quán 10 lần & viết 2 review',
    reward: 'Bánh ngọt miễn phí',
    tierKey: 'storeTier.vip',
    titleKey: 'storeAch.vipTitle',
    descKey: 'storeAch.vipDesc',
    rewardKey: 'storeReward.freePastry'
  },
  {
    id: 'soulmate',
    visits: 20,
    title: 'Tri Kỷ Cà Phê',
    description: 'Ghé quán 20 lần',
    reward: 'Ưu đãi Tri Kỷ giảm 20%',
    tierKey: 'storeTier.soulmate',
    titleKey: 'storeAch.soulmateTitle',
    descKey: 'storeAch.soulmateDesc',
    rewardKey: 'storeReward.soulmate'
  }
];

/** Real activity at one shop, as measured by the backend. */
export interface ShopActivity {
  shop_id: string;
  shop_name: string;
  shop_image?: string;
  /**
   * When each COMPLETED visit actually happened — an ISO timestamp of the check-in, or a
   * plain YYYY-MM-DD for older bookings with no status history. Sorted here.
   */
  visitDates: string[];
  /** Timestamps of this customer's reviews for this shop. Undated legacy reviews are `null`. */
  reviewDates: (string | null)[];
}

export interface ShopTitleProgress {
  id: ShopTitleId;
  title: string;
  description: string;
  titleKey: string;
  descKey: string;
  achieved: boolean;
  /** "15/20", or "1/2 review" when visits are met but reviews are the blocker. */
  progress: string;
  /** DD/MM/YYYY of the moment every requirement was met. Omitted when still locked. */
  date?: string;
}

export interface ShopLoyalty {
  shop_id: string;
  shop_name: string;
  shop_image?: string;
  visits: number;
  reviews: number;
  /** Highest title reached. Every shop in the list has at least one completed visit. */
  tierId: ShopTitleId;
  tier: string;
  tierKey: string;
  /** The perk being worked toward — the next tier's, or the top tier's once maxed. */
  nextReward: string;
  nextRewardKey: string;
  /** 0–100 toward the next title; 100 once every title is unlocked. */
  progress: number;
  /** Completed visits still needed for the next title; 0 when maxed or already met. */
  visitsToNext: number;
  /** Reviews still needed for the next title; 0 when maxed or already met. */
  reviewsToNext: number;
  titles: ShopTitleProgress[];
}

/** YYYY-MM-DD or a full ISO timestamp → DD/MM/YYYY. */
function formatDmy(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

/**
 * Turn one shop's raw activity into the titles the profile screen shows.
 *
 * A title unlocks at the moment its LAST requirement was met, so the date shown for
 * "10 visits & 2 reviews" is whichever of those two came second — not simply the 10th visit.
 */
export function buildShopLoyalty(activity: ShopActivity): ShopLoyalty {
  const visitDates = [...activity.visitDates].sort();
  const reviewDates = activity.reviewDates.filter((d): d is string => !!d).sort();
  const undatedReviews = activity.reviewDates.length - reviewDates.length;
  const visits = visitDates.length;
  const reviews = activity.reviewDates.length;

  const titles: ShopTitleProgress[] = SHOP_TITLES.map(def => {
    const needReviews = def.reviews || 0;
    const achieved = visits >= def.visits && reviews >= needReviews;

    let date: string | undefined;
    if (achieved) {
      const visitMilestone = visitDates[def.visits - 1];
      // Undated legacy reviews can't be placed on the timeline, so fall back to the visit
      // date rather than inventing one.
      const reviewMilestone =
        needReviews > 0 && undatedReviews === 0 ? reviewDates[needReviews - 1] : undefined;
      // Visit and review timestamps may differ in precision, so compare at day level.
      const last =
        reviewMilestone && visitMilestone && reviewMilestone.slice(0, 10) > visitMilestone.slice(0, 10)
          ? reviewMilestone
          : visitMilestone;
      if (last) date = formatDmy(last);
    }

    // Show whichever requirement is actually holding the title back.
    const reviewsAreBlocker = visits >= def.visits && reviews < needReviews;
    const progress = reviewsAreBlocker
      ? `${reviews}/${needReviews} review`
      : `${Math.min(visits, def.visits)}/${def.visits}`;

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      titleKey: def.titleKey,
      descKey: def.descKey,
      achieved,
      progress,
      date
    };
  });

  const achievedDefs = SHOP_TITLES.filter((_, i) => titles[i].achieved);
  const current = achievedDefs[achievedDefs.length - 1] || SHOP_TITLES[0];
  const next = SHOP_TITLES.find((_, i) => !titles[i].achieved);

  const visitsToNext = next ? Math.max(0, next.visits - visits) : 0;
  const reviewsToNext = next ? Math.max(0, (next.reviews || 0) - reviews) : 0;

  let progress = 100;
  if (next) {
    const visitRatio = Math.min(1, visits / next.visits);
    const reviewRatio = next.reviews ? Math.min(1, reviews / next.reviews) : 1;
    progress = Math.round(Math.min(visitRatio, reviewRatio) * 100);
  }

  return {
    shop_id: activity.shop_id,
    shop_name: activity.shop_name,
    shop_image: activity.shop_image,
    visits,
    reviews,
    tierId: current.id,
    tier: current.title,
    tierKey: current.tierKey,
    nextReward: (next || current).reward,
    nextRewardKey: (next || current).rewardKey,
    progress,
    visitsToNext,
    reviewsToNext,
    titles
  };
}
