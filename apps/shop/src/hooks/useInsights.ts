import { useEffect, useState } from 'react';
import { http } from '../services/shopApi';
import { useShopAuth } from '../context/ShopAuthContext';

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
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!activeShop) return;
    let alive = true;
    http
      .get<Insights>(`/merchant/shops/${activeShop.id}/insights?days=${days}`)
      .then(d => alive && setData(d))
      .catch(e => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [activeShop?.id, days]);
  return { data, error };
}

export const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;
