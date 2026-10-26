import { useEffect, useState } from 'react';
import { http } from '../services/shopApi';
import { useShopAuth } from '../context/ShopAuthContext';
import { useApiError } from '../i18n/apiError';

export interface Insights {
  totals: {
    revenue: number;
    todayRevenue: number;
    orders: number;
    bookings: number;
    activeBookings: number;
    pendingBookings: number;
    todayBookings: number;
    cancelledBookings: number;
    customers: number;
    reviews: number;
    averageRating: number | null;
    menuItems: number;
    activeVouchers: number;
  };
  series: { date: string; revenue: number; bookings: number; guests: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  hours: { hour: number; bookings: number }[];
  recentBookings: any[];
}

/** Numbers computed by the server from this shop's real bookings, orders and reviews. */
export function useInsights(days = 14) {
  const { activeShop } = useShopAuth();
  const [data, setData] = useState<Insights | null>(null);
  // The failure is kept as the thrown object, not as a sentence: the sentence is written
  // during render, so switching language rewrites a visible error instead of leaving the
  // message in whatever language was active when the request failed.
  const [failure, setFailure] = useState<unknown>(null);
  const apiError = useApiError();
  useEffect(() => {
    if (!activeShop) return;
    let alive = true;
    http
      .get<Insights>(`/merchant/shops/${activeShop.id}/insights?days=${days}`)
      .then(d => alive && setData(d))
      .catch(e => alive && setFailure(e));
    return () => {
      alive = false;
    };
  }, [activeShop?.id, days]);
  return { data, error: failure ? apiError(failure) : null };
}

/**
 * REMOVED: this hard-coded the dong into every caller. Money now goes through
 * `useMoney().money` / `formatMoney`, which asks the shop for its currency.
 */
