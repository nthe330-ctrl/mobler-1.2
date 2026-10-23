import { CoffeeShop, SpecialModel, Amenity } from '../../shared/types';

/**
 * Free café search: OpenStreetMap data through the public Overpass API.
 * No API key, no account, no cost. Data © OpenStreetMap contributors (ODbL).
 *
 * Only amenity=cafe is requested, so results are always cafés.
 * OSM has no ratings, reviews or (usually) photos, so none are invented here:
 * rating/reviewCount stay 0 and a stock photo is labelled "Ảnh minh họa".
 *
 * Overpass etiquette: results are cached, identical requests are shared,
 * calls are spaced at least 1 s apart and several public mirrors are tried in turn.
 */

const DEFAULT_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

function endpoints(): string[] {
  const env = process.env.OVERPASS_ENDPOINTS;
  if (env) return env.split(',').map(s => s.trim()).filter(Boolean);
  return DEFAULT_ENDPOINTS;
}

const USER_AGENT = process.env.OVERPASS_USER_AGENT || 'Mobler/2.0 (cafe finder; contact: admin@mobler.vn)';
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 300;
const MIN_INTERVAL_MS = 1000;
const MAX_RADIUS_M = 8000;

const STOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&q=80&w=800'
];

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const cache = new Map<string, { at: number; elements: OsmElement[] }>();
const inflight = new Map<string, Promise<OsmElement[]>>();
let lastCallAt = 0;
let fetchImpl: typeof fetch = (input, init) => fetch(input, init);

/** Test hook: replace the network call. */
export function __setOverpassFetch(f: typeof fetch) {
  fetchImpl = f;
}
export function __clearOverpassCache() {
  cache.clear();
  inflight.clear();
  lastCallAt = 0;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Lower-case and strip Vietnamese diacritics so "Mèo" matches "meo". */
export function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

async function callOverpass(query: string): Promise<OsmElement[]> {
  let lastErr: unknown = null;
  for (const url of endpoints()) {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT, Accept: 'application/json' },
        body: `data=${encodeURIComponent(query)}`,
        signal: ctrl.signal
      });
      if (!res.ok) throw new Error(`Overpass ${url} HTTP ${res.status}`);
      const json: any = await res.json();
      return Array.isArray(json?.elements) ? json.elements : [];
    } catch (err) {
      lastErr = err;
      console.warn('[freePlaces] Overpass mirror failed:', (err as any)?.message || err);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('All Overpass mirrors failed');
}

/** Fetch raw OSM cafés around a point (cached ~30 min per ~100 m cell + radius). */
export async function fetchOsmCafes(lat: number, lng: number, radiusM: number): Promise<OsmElement[]> {
  const radius = Math.max(200, Math.min(MAX_RADIUS_M, Math.round(radiusM || 3000)));
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.elements;
  const pending = inflight.get(key);
  if (pending) return pending;

  const query =
    `[out:json][timeout:20];` +
    `nwr["amenity"="cafe"]["name"](around:${radius},${lat.toFixed(6)},${lng.toFixed(6)});` +
    `out center tags 300;`;
  const p = callOverpass(query)
    .then(elements => {
      cache.set(key, { at: Date.now(), elements });
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
      return elements;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Keyword groups for the special café models (diacritic-free). */
const MODEL_KEYWORDS: Partial<Record<SpecialModel, string[]>> = {
  'Cat Café': ['meo', 'cat', 'meow', 'neko'],
  'Dog Café': ['cun', 'dog', 'puppy', 'pet'],
  'Board Game Café': ['board game', 'boardgame', 'game'],
  'Book Café': ['sach', 'book', 'books', 'thu vien', 'library'],
  'Plant Café': ['vuon', 'garden', 'plant', 'xanh', 'green', 'cay'],
  'Ceramic Café': ['gom', 'ceramic', 'pottery'],
  'Vinyl Café': ['vinyl', 'dia than', 'acoustic', 'jazz', 'record'],
  'Workshop Café': ['workshop', 'studio', 'craft'],
  'Anime Café': ['anime', 'manga', 'cosplay']
};

const GENERIC_WORDS = ['quan', 'ca phe', 'caphe', 'cafe', 'coffee', 'shop', 'tiem', 'gan day', 'gan toi', 'near me', 'nearby'];

function isGenericQuery(q: string): boolean {
  let rest = ` ${normalize(q)} `;
  for (const w of GENERIC_WORDS) rest = rest.split(` ${w} `).join(' ');
  return rest.trim().length === 0;
}

function haystack(tags: Record<string, string>): string {
  return normalize([tags.name, tags['name:vi'], tags['name:en'], tags.brand, tags.cuisine, tags.description, tags.theme].filter(Boolean).join(' '));
}

function modelsFor(tags: Record<string, string>): SpecialModel[] {
  const text = ` ${haystack(tags).replace(/[^a-z0-9/ ]+/g, ' ')} `;
  const out: SpecialModel[] = [];
  for (const [model, words] of Object.entries(MODEL_KEYWORDS) as [SpecialModel, string[]][]) {
    if (words.some(w => text.includes(` ${w} `))) out.push(model);
  }
  return out;
}

function amenitiesFor(tags: Record<string, string>): Amenity[] {
  const a: Amenity[] = [];
  if (tags.internet_access && tags.internet_access !== 'no') a.push('Wi-Fi');
  if (tags.outdoor_seating === 'yes') a.push('Outdoor');
  if (tags.indoor_seating === 'yes' || tags.air_conditioning === 'yes') a.push('Indoor');
  if (tags.toilets === 'yes') a.push('WC');
  if (tags.parking || tags['parking:motorcycle']) a.push('Parking');
  return a;
}

function photosFor(tags: Record<string, string>): string[] {
  const out: string[] = [];
  if (tags.image && /^https:\/\//i.test(tags.image)) out.push(tags.image);
  const commons = tags.wikimedia_commons;
  if (commons && /^File:/i.test(commons)) {
    out.push(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commons.replace(/^File:/i, ''))}?width=800`);
  }
  return out;
}

function addressFor(tags: Record<string, string>): string {
  if (tags['addr:full']) return tags['addr:full'];
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [street, tags['addr:subdistrict'] || tags['addr:quarter'] || tags['addr:ward'], tags['addr:district'], tags['addr:city']]
    .filter(Boolean)
    .join(', ');
}

function toShop(el: OsmElement, originLat: number, originLng: number, index: number): CoffeeShop | null {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const name = tags['name:vi'] || tags.name || tags['name:en'];
  if (typeof lat !== 'number' || typeof lng !== 'number' || !name) return null;

  const realPhotos = photosFor(tags);
  const images = realPhotos.length ? realPhotos : [STOCK_PHOTOS[index % STOCK_PHOTOS.length]];
  const models = modelsFor(tags);
  const d = distKm(originLat, originLng, lat, lng);
  const tagList = ['OpenStreetMap'];
  if (!realPhotos.length) tagList.push('Ảnh minh họa');
  if (tags.brand) tagList.push(tags.brand);
  if (tags.cuisine) tags.cuisine.split(';').slice(0, 2).forEach(c => tagList.push(c.trim().replace(/_/g, ' ')));

  return {
    id: `osm_${el.type}_${el.id}`,
    placeId: `osm:${el.type}/${el.id}`,
    name,
    address: addressFor(tags) || 'Địa chỉ chưa cập nhật trên OpenStreetMap',
    distance: `${d.toFixed(1)} km`,
    rating: 0,
    reviewCount: 0,
    coverImage: images[0],
    images,
    openingHours: tags.opening_hours ? [{ day: 'Giờ mở cửa', time: tags.opening_hours }] : undefined,
    moods: [],
    tags: tagList,
    amenities: amenitiesFor(tags),
    styles: [],
    specialModels: models,
    primaryModel: models[0],
    reviews: [],
    location: { lat, lng },
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    phoneNumber: tags.phone || tags['contact:phone'],
    website: tags.website || tags['contact:website'],
    isPartner: false,
    isGoogleVerified: false,
    description: 'Dữ liệu © OpenStreetMap contributors',
    ...({ source: 'osm', distanceKm: Number(d.toFixed(2)) } as any)
  };
}

export interface FreeSearchParams {
  lat: number;
  lng: number;
  radius?: number;
  query?: string;
  specialModel?: string | null;
  limit?: number;
}

export interface FreeSearchResult {
  shops: CoffeeShop[];
  source: 'osm';
  summary: string;
  attribution: string;
}

/**
 * Search real cafés around a point. If fewer than 5 are found the radius is
 * widened once (3 km → 6 km style), mirroring the Google search behaviour.
 */
export async function searchFreeCafes(p: FreeSearchParams): Promise<FreeSearchResult> {
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error('invalid coordinates');
  }
  const limit = Math.max(1, Math.min(60, p.limit || 30));
  const query = (p.query || '').trim();
  const model = p.specialModel && MODEL_KEYWORDS[p.specialModel as SpecialModel] ? (p.specialModel as SpecialModel) : null;

  const filter = (shops: CoffeeShop[]) => {
    if (model) return shops.filter(s => s.specialModels.includes(model));
    if (query && !isGenericQuery(query)) {
      const q = normalize(query);
      // A query naming a model ("cà phê mèo") matches by model; otherwise by name/brand text.
      const qModel = (Object.entries(MODEL_KEYWORDS) as [SpecialModel, string[]][]).find(([, words]) => words.some(w => ` ${q} `.includes(` ${w} `)));
      if (qModel) return shops.filter(s => s.specialModels.includes(qModel[0]));
      const words = q.split(/\s+/).filter(w => w.length > 1 && !GENERIC_WORDS.includes(w));
      return shops.filter(s => {
        const text = normalize(`${s.name} ${s.address} ${s.tags.join(' ')}`);
        return words.every(w => text.includes(w));
      });
    }
    return shops;
  };

  const baseRadius = Math.max(500, Math.min(MAX_RADIUS_M, Number(p.radius) || 3000));
  const radii = baseRadius < MAX_RADIUS_M ? [baseRadius, MAX_RADIUS_M] : [baseRadius];
  let found: CoffeeShop[] = [];
  let usedRadius = baseRadius;
  for (const r of radii) {
    usedRadius = r;
    const elements = await fetchOsmCafes(lat, lng, r);
    const seen = new Set<string>();
    const all = elements
      .map((el, i) => toShop(el, lat, lng, i))
      .filter((s): s is CoffeeShop => !!s && !seen.has(s.id) && !!seen.add(s.id));
    found = filter(all);
    if (found.length >= 5) break;
  }

  found.sort((a, b) => ((a as any).distanceKm ?? 0) - ((b as any).distanceKm ?? 0));
  const shops = found.slice(0, limit);
  const km = (usedRadius / 1000).toFixed(usedRadius % 1000 ? 1 : 0);
  return {
    shops,
    source: 'osm',
    summary: shops.length
      ? `Tìm thấy ${shops.length} quán cà phê thật trong bán kính ${km} km (nguồn OpenStreetMap, miễn phí).`
      : `Chưa có quán phù hợp trong bán kính ${km} km trên OpenStreetMap.`,
    attribution: '© OpenStreetMap contributors'
  };
}
