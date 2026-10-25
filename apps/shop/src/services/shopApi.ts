import { HttpClient } from '@shared/api/http';
import { AvailabilityResponse, BookingDTO, BookingStatus, TableOperationalStatus } from '@shared/booking';
import { CoffeeShop } from '@shared/types';

/** Shop-app session is stored separately from the customer app's session. */
export const http = new HttpClient('mobler_shop_token');

export interface ShopUser {
  id: string;
  account_type: 'shop';
  phone: string;
  email: string;
  name: string;
  avatar: string;
  roles: string[];
  owned_shops: string[];
}

export interface ShopRegistration {
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  shop: {
    name: string;
    address: string;
    phone?: string;
    openingHours?: string;
    description?: string;
    coverImage?: string;
    lat?: number;
    lng?: number;
  };
}

export const shopApi = {
  async register(payload: ShopRegistration) {
    const res = await http.post<{ token: string; user: ShopUser; shop: CoffeeShop }>('/shop/auth/register', payload);
    http.setToken(res.token);
    return res;
  },

  async login(identifier: string, password: string) {
    const res = await http.post<{ token: string; user: ShopUser }>('/shop/auth/login', { identifier, password });
    http.setToken(res.token);
    return res;
  },

  logout() {
    http.setToken(null);
  },

  me() {
    return http.get<{ user: ShopUser; shops: CoffeeShop[] }>('/auth/me');
  },

  updateShop(shopId: string, updates: Partial<CoffeeShop>) {
    return http.put<{ shop: CoffeeShop }>(`/merchant/shops/${shopId}`, updates);
  },

  /**
   * Uploads one photo and returns the URL to store on the shop. The server decides where
   * the bytes land — local disk or an S3 bucket — so the caller only ever handles the URL
   * it gets back. It rejects anything that is not a JPG/PNG/WEBP/GIF, and anything over 3MB.
   */
  uploadImage(shopId: string, dataUrl: string) {
    return http.post<{ url: string }>(`/merchant/shops/${shopId}/uploads`, { dataUrl });
  },

  getBookings(shopId: string, date?: string) {
    return http.get<{ bookings: BookingDTO[]; clock: { today: string; now: string } }>(
      `/merchant/shops/${shopId}/bookings${date ? `?date=${date}` : ''}`
    );
  },

  getTables(shopId: string, date: string) {
    return http.get<AvailabilityResponse>(`/merchant/shops/${shopId}/tables?date=${date}`);
  },

  setBookingStatus(bookingId: string, status: BookingStatus, note?: string) {
    return http.put<{ booking: BookingDTO }>(`/merchant/bookings/${bookingId}/status`, { status, note });
  },

  setTableStatus(shopId: string, tableCode: string, operational_status: TableOperationalStatus) {
    return http.put<{ table: any }>(`/merchant/shops/${shopId}/tables/${tableCode}/status`, { operational_status });
  },

  getAnalytics(shopId: string) {
    return http.get<{ metrics: Record<string, number> }>(`/merchant/shops/${shopId}/analytics`);
  }
};
