/**
 * Approximate location from an IP address using free, key-less providers
 * (tried in order until one answers). Results are cached for an hour.
 * IP location is city-level only (often several km off); GPS is always preferred.
 */

export interface IpLocation {
  lat: number;
  lng: number;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  source: 'ip_lookup';
  provider: string;
  accuracyKm: number;
}

type Provider = { name: string; url: (ip: string) => string; parse: (d: any) => Omit<IpLocation, 'source' | 'provider' | 'accuracyKm'> | null };

const num = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : Number(v));

const PROVIDERS: Provider[] = [
  {
    name: 'ipwho.is',
    url: ip => `https://ipwho.is/${ip}`, // '' → caller's own IP
    parse: d => (d?.success === false ? null : { lat: num(d?.latitude), lng: num(d?.longitude), city: d?.city || '', region: d?.region || '', country: d?.country || '', countryCode: d?.country_code || '' })
  },
  {
    name: 'geojs.io',
    url: ip => (ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : 'https://get.geojs.io/v1/ip/geo.json'),
    parse: d => ({ lat: num(d?.latitude), lng: num(d?.longitude), city: d?.city || '', region: d?.region || '', country: d?.country || '', countryCode: d?.country_code || '' })
  },
  {
    name: 'freeipapi.com',
    url: ip => (ip ? `https://freeipapi.com/api/json/${ip}` : 'https://freeipapi.com/api/json'),
    parse: d => ({ lat: num(d?.latitude), lng: num(d?.longitude), city: d?.cityName || '', region: d?.regionName || '', country: d?.countryName || '', countryCode: d?.countryCode || '' })
  },
  {
    name: 'ipapi.co',
    url: ip => (ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/'),
    parse: d => (d?.error ? null : { lat: num(d?.latitude), lng: num(d?.longitude), city: d?.city || '', region: d?.region || '', country: d?.country_name || '', countryCode: d?.country_code || '' })
  }
];

const cache = new Map<string, { at: number; value: IpLocation }>();
const TTL = 60 * 60 * 1000;
let fetchImpl: typeof fetch = (input, init) => fetch(input, init);

export function __setIpFetch(f: typeof fetch) {
  fetchImpl = f;
}
export function __clearIpCache() {
  cache.clear();
}

/** "::ffff:127.0.0.1" → "127.0.0.1" */
export function normalizeIp(raw: string): string {
  const ip = String(raw || '').trim();
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === '::1' || ip === '0.0.0.0' || ip === 'localhost') return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(ip)) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true; // carrier-grade NAT
  if (/^f[cd][0-9a-f]{2}:/i.test(ip) || /^fe80:/i.test(ip)) return true;
  return false;
}

/** ip = '' means "the public IP this server is reachable from". */
export async function lookupIpLocation(ip: string): Promise<IpLocation | null> {
  const key = ip || 'self';
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  for (const p of PROVIDERS) {
    try {
      const res = await fetchImpl(p.url(ip), {
        headers: { Accept: 'application/json', 'User-Agent': 'Mobler/2.0' },
        signal: AbortSignal.timeout(4000)
      });
      if (!res.ok) continue;
      const parsed = p.parse(await res.json());
      if (!parsed || !Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng) || (parsed.lat === 0 && parsed.lng === 0)) continue;
      const value: IpLocation = { ...parsed, source: 'ip_lookup', provider: p.name, accuracyKm: 25 };
      cache.set(key, { at: Date.now(), value });
      return value;
    } catch {
      // try the next provider
    }
  }
  return null;
}
