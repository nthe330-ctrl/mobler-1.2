import { CoffeeShop, Review, MenuItem, Table } from '@shared/types';
import { HttpClient } from '@shared/api/http';
import { AvailabilityResponse, BookingDTO } from '@shared/booking';
import { LocalitySearchResponse } from '@shared/locality';
import { ResolvedRank } from '@shared/ranks';
import { ShopLoyalty } from '@shared/shopLoyalty';

/** Customer-app session is stored separately from the shop app's session. */
const TOKEN_KEY = 'mobler_customer_token';
export const http = new HttpClient(TOKEN_KEY);

export interface UserAccount {
  id: string;
  phone: string;
  email: string;
  name: string;
  avatar: string;
  title: string;
  location: string;
  account_type: 'customer';
  membership_tier?: string;
  roles: string[];
  badges: string[];
  points: number;
  level: string;
  notifyPromos: boolean;
  notifyBookings: boolean;
  created_at?: string;
}

export type BookingData = BookingDTO;

export interface VoucherData {
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

class ApiService {
  public getToken(): string | null {
    return http.getToken();
  }

  private request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return http.request<T>(endpoint, options);
  }

  // ================= AUTH (customer accounts only) =================
  public async register(payload: { phone: string; email?: string; password: string; name: string }) {
    const res = await http.post<{ token: string; user: UserAccount }>('/customer/auth/register', payload);
    http.setToken(res.token);
    return res;
  }

  public async login(payload: { identifier: string; password: string }) {
    const res = await http.post<{ token: string; user: UserAccount }>('/customer/auth/login', payload);
    http.setToken(res.token);
    return res;
  }

  public async getMe() {
    return this.request<{ user: UserAccount; favorites: string[] }>('/auth/me');
  }

  // ================= ACHIEVEMENTS & REWARDS =================
  public async getAchievements() {
    return this.request<{ achievements: any[]; stats: Record<string, number>; total: number; achieved: number; points: number; rank: ResolvedRank }>('/me/achievements');
  }

  public async getRewards() {
    return this.request<{ points: number; badges: string[]; vouchers: any[] }>('/me/rewards');
  }

  public async getShopLoyalty() {
    return this.request<{ shops: ShopLoyalty[] }>('/me/shop-loyalty');
  }

  public async updateProfile(updates: Partial<UserAccount>) {
    return http.put<{ message: string; user: UserAccount }>('/auth/profile', updates);
  }

  public logout() {
    http.setToken(null);
  }

  // ================= LOCALITY DATA (internal-first) =================
  /** `cell` is a coarse grid id computed on the device — raw GPS never leaves the phone here. */
  public async localitySearch(cell: string, q = '', page = 1, enqueue = true) {
    const params = new URLSearchParams({ cell, q, page: String(page), page_size: '50', enqueue: String(enqueue) });
    return this.request<LocalitySearchResponse>(`/locality/search?${params.toString()}`);
  }

  /** The shop's own menu (created in the shop app). Empty if the shop has not added items yet. */
  public async getShopMenu(shopId: string) {
    return this.request<{ items: (MenuItem & { sizeOptions?: any[]; sugarOptions?: string[]; iceOptions?: string[] })[] }>(`/shops/${encodeURIComponent(shopId)}/menu`);
  }

  public async localityRefresh(cell: string) {
    return http.post<{ ok: boolean; code?: string; message: string; retry_at?: string }>('/locality/refresh', { cell });
  }

  public reportGoogleFallback() {
    return http.post('/locality/usage/google-fallback').catch(() => undefined);
  }

  // ================= LIVE AVAILABILITY =================
  public async getAvailability(shopId: string, date: string) {
    return this.request<AvailabilityResponse & { accepting_bookings: boolean }>(
      `/shops/${encodeURIComponent(shopId)}/availability?date=${encodeURIComponent(date)}`
    );
  }

  // ================= SHOPS & CATALOG =================
  public async getShops(params: {
    q?: string;
    mood?: string;
    style?: string;
    specialModel?: string;
    amenity?: string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.mood && params.mood !== 'all') query.append('mood', params.mood);
    if (params.style) query.append('style', params.style);
    if (params.specialModel) query.append('specialModel', params.specialModel);
    if (params.amenity) query.append('amenity', params.amenity);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ shops: CoffeeShop[]; total: number; userFavorites: string[] }>(`/shops${queryString}`);
  }

  public async getShopDetail(shopId: string) {
    return this.request<{
      shop: CoffeeShop;
      products: MenuItem[];
      tables: Table[];
      reviews: Review[];
      vouchers: VoucherData[];
      isFavorite: boolean;
    }>(`/shops/${shopId}`);
  }

  public async addReview(shopId: string, payload: { content: string; rating: number; images?: string[]; metrics?: any }) {
    return this.request<{ message: string; review: Review }>(`/shops/${shopId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async toggleFavorite(shopId: string) {
    return this.request<{ isFavorite: boolean }>(`/shops/${shopId}/favorites`, {
      method: 'POST'
    });
  }

  public async getMyFavorites() {
    return this.request<{ favorites: CoffeeShop[] }>('/me/favorites');
  }

  // ================= BOOKINGS & ORDERS =================
  public async getMyBookings() {
    return this.request<{ bookings: BookingData[] }>('/me/bookings');
  }

  public async createBooking(payload: {
    shop_id: string;
    date: string;
    time: string;
    guests: number;
    table_id?: string;
    table_name?: string;
    note?: string;
    order?: any;
    voucher_applied?: any;
    payment_method?: string;
    deposit_fee?: number;
    discount_amount?: number;
    grand_total?: number;
  }) {
    return this.request<{ message: string; booking: BookingData; achievements_unlocked?: { id: string; title: string; icon: string; rewardLabel: string }[] }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public async cancelBooking(bookingId: string, reason?: string) {
    return this.request<{ message: string; booking: BookingData }>(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
  }

  public async getMyOrders() {
    return this.request<{ orders: any[] }>('/me/orders');
  }

  public async createOrder(payload: any) {
    return this.request<{ message: string; order: any }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // ================= VOUCHERS =================
  public async getVouchers(shopId?: string) {
    return this.request<{ vouchers: VoucherData[] }>(`/vouchers${shopId ? `?shopId=${shopId}` : ''}`);
  }

  public async validateVoucher(code: string, shop_id?: string, order_value?: number) {
    return this.request<{ valid: boolean; voucher: VoucherData; calculatedDiscount: number }>('/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify({ code, shop_id, order_value })
    });
  }

  public async executeSearchPipeline(params: {
    query: string;
    uiLanguage?: string;
    latitude?: number | null;
    longitude?: number | null;
    cityName?: string | null;
  }) {
    return this.request<{
      intent: any;
      resolvedLocation: any;
      localizedQuery: any;
      discoveryCount: number;
      strictPassedCount: number;
      rejectedCount: number;
      isFallbackApplied: boolean;
      fallbackNotice?: string;
      results: CoffeeShop[];
      formattedResults: any[];
    }>('/search/pipeline', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  public async executeAiSearchPipeline(params: {
    query: string;
    uiLanguage?: string;
    latitude?: number | null;
    longitude?: number | null;
    source?: 'GPS' | 'IP' | 'UI_FALLBACK';
    cityName?: string | null;
    countryCode?: string | null;
    bypassGooglePlaces?: boolean;
  }) {
    return this.request<{
      query: string;
      search_intent: {
        place_type: 'cafe';
        experience_mode: string[];
        intent: string[];
        features: string[];
        activities: string[];
        constraints: string[];
        negative_constraints: string[];
        normalized_keywords: string[];
        localized_keywords: string[];
        search_language: string;
        location: {
          source: 'GPS' | 'IP' | 'UI_FALLBACK';
          country: string;
          region: string;
          city: string;
          latitude: number | null;
          longitude: number | null;
        };
        google_queries: string[];
      };
      location_source: string;
      search_language: string;
      google_queries_used: string[];
      results: CoffeeShop[];
      total_results: number;
      parsedQuery?: any;
      rankedResults?: any[];
      searchContext?: any;
    }>('/search/ai-pipeline', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  public async executeSearchEngine(params: {
    query: string;
    latitude?: number | null;
    longitude?: number | null;
    cityName?: string | null;
    countryCode?: string | null;
    source?: 'GPS' | 'IP' | 'QUERY_EXTRACTED' | 'UI_FALLBACK';
    uiLanguage?: string;
    candidateShops?: CoffeeShop[];
  }) {
    return this.request<{
      query: string;
      parsedQuery: any;
      totalFound: number;
      strictPassedCount: number;
      rankedResults: {
        shop: CoffeeShop;
        scoreBreakdown: any;
        verification: any;
        matchHighlight: string;
      }[];
      searchContext: any;
    }>('/search/engine', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  public async getMapsKeyStatus() {
    return this.request<{
      hasKey: boolean;
      valid: boolean;
      billingEnabled: boolean;
      reason: string;
      message: string;
    }>('/maps/status');
  }

  public async validateMapsKey(apiKey: string) {
    return this.request<{
      hasKey: boolean;
      valid: boolean;
      billingEnabled: boolean;
      reason: string;
      message: string;
    }>('/maps/validate-key', {
      method: 'POST',
      body: JSON.stringify({ apiKey })
    });
  }
}

export const api = new ApiService();

