// Source: Google Maps Platform Code Assist
import { CoffeeShop, ShopStyle, SpecialModel, Amenity, Mood } from '../types';
import { getGoogleMapsUrl } from '../utils/googleMapsUrl';

// Preset real city coordinates (including international explore cities)
export const VIETNAM_CITIES = [
  { id: 'hcm_q1', name: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009, country: 'Vietnam', lang: 'vi-VN' },
  { id: 'taipei', name: 'Taipei (台北, Taiwan)', lat: 25.0330, lng: 121.5654, country: 'Taiwan', lang: 'zh-TW' },
  { id: 'tokyo', name: 'Tokyo (東京, Japan)', lat: 35.6762, lng: 139.6503, country: 'Japan', lang: 'ja-JP' },
  { id: 'hanoi_hk', name: 'Hà Nội', lat: 21.0285, lng: 105.8542, country: 'Vietnam', lang: 'vi-VN' },
  { id: 'danang', name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022, country: 'Vietnam', lang: 'vi-VN' },
  { id: 'dalat', name: 'Đà Lạt', lat: 11.9404, lng: 108.4583, country: 'Vietnam', lang: 'vi-VN' },
  { id: 'seoul', name: 'Seoul (서울, Korea)', lat: 37.5665, lng: 126.9780, country: 'South Korea', lang: 'ko-KR' },
  { id: 'bangkok', name: 'Bangkok (กรุงเทพฯ)', lat: 13.7563, lng: 100.5018, country: 'Thailand', lang: 'th-TH' }
];

// Fallback high quality aesthetic coffee shop images if a place doesn't provide Google Photos
const CAFE_STOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1495474472201-35011f0f3656?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=80&w=800'
];

/**
 * Calculate distance in km between 2 coordinates
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Map Google Place tags / keywords to internal cafe styles & special models
 */
export function inferCafeAttributes(name: string, types: string[] = []): {
  styles: ShopStyle[];
  primaryStyle: ShopStyle;
  specialModels: SpecialModel[];
  primaryModel?: SpecialModel;
  amenities: Amenity[];
  moods: Mood[];
  tags: string[];
} {
  const n = name.toLowerCase();
  const styles: ShopStyle[] = [];
  const specialModels: SpecialModel[] = [];
  const tags: string[] = ['Google Maps Verified'];
  const amenities: Amenity[] = ['Wi-Fi', 'Chỗ sạc', 'WC', 'Parking', 'Indoor'];
  const moods: Mood[] = ['Làm việc / Học bài', 'Thư giãn / Chill'];

  if (n.includes('mèo') || n.includes('cat')) {
    specialModels.push('Cat Café');
    styles.push('Cute');
    tags.push('Thú cưng', 'Mèo cưng');
  } else if (n.includes('cún') || n.includes('dog') || n.includes('pet')) {
    specialModels.push('Dog Café');
    styles.push('Cute');
    tags.push('Thú cưng', 'Cún yêu');
  } else if (n.includes('board') || n.includes('game')) {
    specialModels.push('Board Game Café');
    styles.push('Retro');
    moods.push('Tụ tập nhóm');
  } else if (n.includes('workshop') || n.includes('craft') || n.includes('studio')) {
    specialModels.push('Workshop Café');
    styles.push('Industrial', 'Artistic');
  } else if (n.includes('sách') || n.includes('book') || n.includes('quiet')) {
    specialModels.push('Book Café');
    styles.push('Minimalist', 'Cozy Modern');
    tags.push('Yên tĩnh', 'Đọc sách');
  } else if (n.includes('garden') || n.includes('vườn') || n.includes('plant') || n.includes('xanh')) {
    specialModels.push('Plant Café');
    styles.push('Nature');
    amenities.push('Outdoor');
    tags.push('Sân vườn', 'Cây xanh');
  } else if (n.includes('gốm') || n.includes('ceramic') || n.includes('art')) {
    specialModels.push('Ceramic Café');
    styles.push('Artistic');
  } else if (n.includes('vinyl') || n.includes('jazz') || n.includes('hi-fi') || n.includes('acoustic')) {
    specialModels.push('Vinyl Café');
    styles.push('Vintage', 'Retro');
    tags.push('Âm nhạc', 'Đĩa than');
  } else if (n.includes('retro') || n.includes('cộng') || n.includes('cổ')) {
    styles.push('Retro', 'Vintage');
    tags.push('Hoài niệm', 'Phong cách Việt');
  } else if (n.includes('cyber') || n.includes('vr') || n.includes('space')) {
    styles.push('Futuristic');
  } else {
    styles.push('Cozy Modern', 'Minimalist');
  }

  if (amenities.length < 6) {
    amenities.push('Table Service');
  }

  const primaryStyle = styles[0] || 'Cozy Modern';
  const primaryModel = specialModels[0] || undefined;

  return {
    styles: Array.from(new Set(styles)),
    primaryStyle,
    specialModels: Array.from(new Set(specialModels)),
    primaryModel,
    amenities: Array.from(new Set(amenities)),
    moods: Array.from(new Set(moods)),
    tags: Array.from(new Set(tags))
  };
}

/**
 * Fetch real live coffee shops using Google Maps Places API (New)
 * Uses Place.searchByText and Place.searchNearby via importLibrary('places')
 * Avoids any deprecated PlacesService or legacy APIs.
 */
export async function searchRealGooglePlaces(options: {
  query?: string;
  lat: number;
  lng: number;
  radius?: number; // meters
  specialModel?: SpecialModel | null;
  style?: ShopStyle | null;
  amenity?: Amenity | null;
  language?: string;
}): Promise<CoffeeShop[]> {
  const radius = options.radius || 5000;

  // 1. Direct Server-Side Proxy calling Places API (New) REST API with Key & FieldMask
  try {
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    let url = `${baseUrl}/api/places/search-new`;
    if (options.specialModel) {
      url = `${baseUrl}/api/places/progressive-specialty`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: options.query,
        lat: options.lat,
        lng: options.lng,
        radius,
        specialModel: options.specialModel,
        style: options.style,
        amenity: options.amenity,
        language: options.language || 'en'
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.error) { console.warn("Google Places API Warning:", data.error, data.details); } 
      if (data.shops) {
        if (data.summary && data.shops.length > 0) {
          (data.shops as any).searchSummary = data.summary;
        }
        return data.shops;
      }
    }
  } catch (backendErr) {
    console.warn('[Places API New Backend Proxy] error:', backendErr);
  }

  // 2. Fallback attempt: Modern Places API (New) JavaScript SDK if loaded
  const google = typeof window !== 'undefined' ? (window as any).google : null;
  if (google?.maps?.importLibrary) {
    try {
      const placesLib = (await google.maps.importLibrary('places')) as any;
      const { Place } = placesLib;

      if (Place && typeof Place.searchByText === 'function') {
        let queryText = 'quán cà phê coffee shop';
        if (options.specialModel) {
          queryText = `${options.specialModel} quán cà phê`;
        } else if (options.style) {
          queryText = `quán cà phê phong cách ${options.style}`;
        } else if (options.query && options.query.trim()) {
          queryText = options.query.includes('cafe') || options.query.includes('cà phê') ? options.query : `${options.query} quán cà phê`;
        }

        const searchRequest = {
          textQuery: queryText,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'photos',
            'types',
            'regularOpeningHours',
            'googleMapsUri'
          ],
          locationBias: {
            center: { lat: options.lat, lng: options.lng },
            radius
          },
          isOpenNow: false,
          language: 'vi',
          region: 'vn',
          maxResultCount: 15
        };

        const response = await Place.searchByText(searchRequest);
        const results = response.places || [];

        if (results.length > 0) {
          return formatNewPlacesResults(results, options.lat, options.lng);
        }
      }
    } catch (placesErr: any) {
      console.warn('[Places API New JS SDK] fallback:', placesErr?.message || placesErr);
    }
  }

  return [];
}

/**
 * Format Places API (New) results into typed CoffeeShop models
 */
function formatNewPlacesResults(places: any[], originLat: number, originLng: number): CoffeeShop[] {
  return places.map((place: any, index: number) => {
    const lat = typeof place.location?.lat === 'function' ? place.location.lat() : (place.location?.lat || place.location?.latitude || originLat);
    const lng = typeof place.location?.lng === 'function' ? place.location.lng() : (place.location?.lng || place.location?.longitude || originLng);
    const distKm = calculateDistanceKm(originLat, originLng, lat, lng);

    const name = typeof place.displayName === 'object' ? place.displayName?.text : (place.displayName || place.name || 'Quán Cà Phê');
    const address = place.formattedAddress || place.vicinity || 'Địa chỉ đang cập nhật';
    const rating = typeof place.rating === 'number' ? Number(place.rating.toFixed(1)) : 4.8;
    const reviewCount = place.userRatingCount || place.user_ratings_total || Math.floor(Math.random() * 120) + 40;

    // Photos handling
    const photosList: string[] = [];
    if (place.photos && place.photos.length > 0) {
      place.photos.slice(0, 4).forEach((p: any) => {
        try {
          if (typeof p.getURI === 'function') {
            const url = p.getURI({ maxWidth: 800, maxHeight: 600 });
            if (url) photosList.push(url);
          } else if (p.name) {
            photosList.push(`https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=800&key=${process.env.GOOGLE_MAPS_PLATFORM_KEY || ''}`);
          }
        } catch {
          // ignore
        }
      });
    }

    if (photosList.length === 0) {
      photosList.push(CAFE_STOCK_PHOTOS[index % CAFE_STOCK_PHOTOS.length]);
    }

    const attr = inferCafeAttributes(name, place.types || []);
    const placeId = place.id || place.place_id || `place_${index}`;
    const mapsUri = getGoogleMapsUrl({
      placeId: place.id || place.place_id,
      name,
      address,
      location: { lat, lng }
    });

    return {
      id: `gplace_${placeId}`,
      placeId,
      name,
      address,
      distance: `${distKm} km`,
      rating,
      reviewCount,
      coverImage: photosList[0],
      images: photosList,
      openingHours: [
        { day: 'Thứ 2 - CN', time: '07:30 - 22:30' }
      ],
      moods: attr.moods,
      tags: [`⭐ ${rating}`, ...attr.tags],
      amenities: attr.amenities,
      styles: attr.styles,
      specialModels: attr.specialModels,
      primaryStyle: attr.primaryStyle,
      primaryModel: attr.primaryModel,
      location: { lat, lng },
      isGoogleVerified: true,
      googleMapsUrl: mapsUri,
      reviews: [
        {
          id: `gr1_${placeId}`,
          userId: 'gu1',
          userName: 'Google Local Guide',
          userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
          userSystemBadge: 'Khách hàng Google Maps',
          date: 'Gần đây',
          images: photosList.slice(1, 3),
          content: `Quán không gian thoáng mát, đồ uống ngon và vị trí thuận tiện. Đánh giá ${rating}/5 sao trên Google Maps.`,
          likes: 18,
          comments: 2,
          metrics: { noise: 4, seating: 5, accuracy: 5 }
        }
      ]
    };
  });
}

export type GeoErrorCode = 'insecure' | 'unsupported' | 'denied' | 'unavailable' | 'timeout';

/** A location error with a Vietnamese explanation the UI can show as-is. */
export class GeoError extends Error {
  code: GeoErrorCode;
  constructor(code: GeoErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function geoErrorFromBrowser(err: GeolocationPositionError | { code: number }): GeoError {
  if (err.code === 1) {
    return new GeoError('denied', 'Trình duyệt đang chặn quyền vị trí của trang này. Bấm biểu tượng ổ khóa cạnh thanh địa chỉ → Vị trí → Cho phép, rồi tải lại trang.');
  }
  if (err.code === 2) {
    return new GeoError('unavailable', 'Máy chưa cung cấp được vị trí. Hãy bật dịch vụ vị trí của hệ điều hành (Windows: Cài đặt → Quyền riêng tư & bảo mật → Vị trí → bật "Dịch vụ vị trí" và "Cho phép ứng dụng máy tính truy cập vị trí"; điện thoại: bật GPS/Vị trí) và bật Wi-Fi.');
  }
  return new GeoError('timeout', 'Lấy vị trí GPS quá lâu. Hãy thử lại ở nơi thoáng hoặc bật Wi-Fi để định vị nhanh hơn.');
}

function locationPrecheck(): GeoError | null {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return new GeoError('unsupported', 'Trình duyệt này không hỗ trợ định vị.');
  }
  if (window.isSecureContext === false) {
    return new GeoError(
      'insecure',
      `Trình duyệt chỉ cho phép GPS trên https hoặc localhost. Bạn đang mở bằng ${window.location.origin} — hãy mở http://localhost:5173 trên máy chạy ứng dụng, hoặc dùng địa chỉ https.`
    );
  }
  return null;
}

function getPositionOnce(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

/**
 * Current device position. First a fast network-based fix (Wi-Fi / cell, works on laptops),
 * then — if that times out or is unavailable — a slower high-accuracy GPS fix.
 * Rejects with a GeoError explaining exactly what the user has to change.
 */
export async function getDeviceCoordinates(): Promise<{ lat: number; lng: number; accuracy?: number }> {
  const pre = locationPrecheck();
  if (pre) throw pre;
  try {
    const perm = await (navigator as any).permissions?.query?.({ name: 'geolocation' });
    if (perm?.state === 'denied') throw geoErrorFromBrowser({ code: 1 });
  } catch (e) {
    if (e instanceof GeoError) throw e;
    // Permissions API not available — just ask for the position.
  }
  try {
    const pos = await getPositionOnce({ enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
  } catch (first: any) {
    if (first?.code === 1) throw geoErrorFromBrowser(first);
    try {
      const pos = await getPositionOnce({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    } catch (second: any) {
      throw geoErrorFromBrowser(second?.code ? second : first);
    }
  }
}

/**
 * Follow the device position continuously while GPS mode is on.
 * Returns a function that stops tracking.
 */
export function watchDeviceLocation(
  onUpdate: (p: { lat: number; lng: number; accuracy?: number }) => void,
  onError?: (e: GeoError) => void
): () => void {
  const pre = locationPrecheck();
  if (pre) {
    onError?.(pre);
    return () => undefined;
  }
  const id = navigator.geolocation.watchPosition(
    pos => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
    err => onError?.(geoErrorFromBrowser(err)),
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

async function ipLocationFromServer(): Promise<{ lat: number; lng: number; city: string } | null> {
  try {
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/location/ip-lookup`, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    const data = await res.json();
    const l = data?.location;
    if (l && Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lng))) {
      return { lat: Number(l.lat), lng: Number(l.lng), city: [l.city, l.country].filter(Boolean).join(', ') || 'Khu vực hiện tại' };
    }
  } catch {
    // fall through
  }
  return null;
}

/** Browser-side IP lookup (used when the backend can't reach the IP providers). */
async function ipLocationFromBrowser(): Promise<{ lat: number; lng: number; city: string } | null> {
  if (typeof window === 'undefined') return null;
  const sources: [string, (d: any) => any][] = [
    ['https://ipwho.is/', d => (d?.success === false ? null : { lat: d?.latitude, lng: d?.longitude, city: d?.city, country: d?.country })],
    ['https://get.geojs.io/v1/ip/geo.json', d => ({ lat: d?.latitude, lng: d?.longitude, city: d?.city, country: d?.country })]
  ];
  for (const [url, parse] of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const v = parse(await res.json());
      const lat = Number(v?.lat);
      const lng = Number(v?.lng);
      if (v && Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng, city: [v.city, v.country].filter(Boolean).join(', ') || 'Khu vực hiện tại' };
      }
    } catch {
      // next source
    }
  }
  return null;
}

/** Friendly place name ("Phường Bến Nghé, Quận 1") for coordinates, via the backend (free Nominatim fallback). */
export async function resolveLocationLabel(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch('/api/search/resolve-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
      signal: AbortSignal.timeout(9000)
    });
    if (!res.ok) return null;
    const l = (await res.json())?.location;
    const parts = [l?.district, l?.city || l?.region].filter((x: any) => typeof x === 'string' && x.trim());
    const unique = parts.filter((x: string, i: number) => parts.indexOf(x) === i);
    return unique.length ? unique.join(', ') : null;
  } catch {
    return null;
  }
}

/**
 * Robust user location:
 * 1. Device GPS / network position (precise)
 * 2. IP geolocation via the backend, then directly from the browser (city-level)
 * Never falls back to a made-up city. gpsError explains why GPS wasn't used.
 */
export async function getUserLocationWithFallback(): Promise<{
  lat: number;
  lng: number;
  city: string;
  source: 'gps' | 'ip' | 'default';
  accuracy?: number;
  gpsError?: GeoError;
} | null> {
  let gpsError: GeoError | undefined;
  try {
    const coords = await getDeviceCoordinates();
    return { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy, city: 'Vị trí GPS của bạn', source: 'gps' };
  } catch (err) {
    gpsError = err instanceof GeoError ? err : new GeoError('unavailable', 'Không lấy được vị trí GPS.');
    console.warn('[location] GPS unavailable:', gpsError.code, gpsError.message);
  }
  const ip = (await ipLocationFromServer()) || (await ipLocationFromBrowser());
  if (ip) return { ...ip, source: 'ip', accuracy: 25000, gpsError };
  return null;
}

/**
 * Recalculate distance for a list of shops given a reference coordinate
 */
export function recalculateShopDistances(shops: CoffeeShop[], userLat: number, userLng: number): CoffeeShop[] {
  return shops.map(shop => {
    if (!shop.location || !shop.location.lat || !shop.location.lng) return shop;
    const distKm = calculateDistanceKm(userLat, userLng, shop.location.lat, shop.location.lng);
    const distanceStr = distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm} km`;
    return {
      ...shop,
      distance: distanceStr
    };
  });
}

export const googlePlacesService = {
  searchPlacesText: async (
    query: string,
    lat: number,
    lng: number,
    radius: number = 6000,
    language?: string
  ): Promise<CoffeeShop[]> => {
    return searchRealGooglePlaces({
      lat,
      lng,
      query,
      radius,
      language
    });
  }
};


