/**
 * Tests for the free OpenStreetMap café search (no network: Overpass is mocked).
 * Run: npm run test:freeplaces
 */
import { __clearOverpassCache, __setOverpassFetch, searchFreeCafes, normalize } from '../server/freePlaces';
import { freeOrSyntheticPlaces } from '../server/freePlacesRoutes';
import { __clearIpCache, __setIpFetch, isPrivateIp, lookupIpLocation, normalizeIp } from '../server/ipLocation';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) pass++;
  else {
    fail++;
    console.error('✗', name, extra ?? '');
  }
}

const ORIGIN = { lat: 10.7769, lng: 106.7009 };
const ELEMENTS = [
  { type: 'node', id: 1, lat: 10.7772, lon: 106.7012, tags: { amenity: 'cafe', name: 'The Workshop Coffee', 'addr:housenumber': '27', 'addr:street': 'Ngô Đức Kế', 'addr:city': 'Hồ Chí Minh', opening_hours: 'Mo-Su 08:00-21:00', internet_access: 'wlan', website: 'https://example.com' } },
  { type: 'node', id: 2, lat: 10.7801, lon: 106.6990, tags: { amenity: 'cafe', name: 'Cà Phê Mèo Mun', outdoor_seating: 'yes' } },
  { type: 'way', id: 3, center: { lat: 10.7740, lon: 106.7050 }, tags: { amenity: 'cafe', name: 'Highlands Coffee', brand: 'Highlands Coffee', image: 'https://upload.example.org/h.jpg' } },
  { type: 'node', id: 4, lat: 10.7760, lon: 106.6980, tags: { amenity: 'cafe', name: 'Sách Café', wikimedia_commons: 'File:Sach cafe.jpg' } },
  { type: 'node', id: 5, lat: 10.7790, lon: 106.7030, tags: { amenity: 'cafe', name: 'Chocolate House' } },
  { type: 'node', id: 6, lat: 10.7795, lon: 106.7031, tags: { amenity: 'cafe' } }, // no name → dropped
  { type: 'node', id: 1, lat: 10.7772, lon: 106.7012, tags: { amenity: 'cafe', name: 'The Workshop Coffee' } } // duplicate
];

let calls: string[] = [];
let mode: 'ok' | 'firstFails' | 'allFail' | 'empty' = 'ok';
__setOverpassFetch((async (url: any, init: any) => {
  calls.push(String(url));
  const body = decodeURIComponent(String(init?.body || ''));
  if (!body.includes('"amenity"="cafe"')) throw new Error('query must be café-only');
  if (mode === 'allFail' || (mode === 'firstFails' && calls.length === 1)) {
    return new Response('busy', { status: 429 });
  }
  return new Response(JSON.stringify({ elements: mode === 'empty' ? [] : ELEMENTS }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}) as any);

async function main() {
  // normalize
  check('normalize strips diacritics', normalize('Cà Phê Mèo Đen') === 'ca phe meo den');

  // basic search
  __clearOverpassCache();
  calls = [];
  const r = await searchFreeCafes({ ...ORIGIN, radius: 3000 });
  check('returns 5 named, de-duplicated cafés', r.shops.length === 5, r.shops.map(s => s.name));
  check('source is osm', r.source === 'osm');
  check('attribution present', r.attribution.includes('OpenStreetMap'));
  check('sorted by distance', r.shops[0].name === 'The Workshop Coffee', r.shops.map(s => s.distance));
  const ws = r.shops.find(s => s.name === 'The Workshop Coffee')!;
  check('address composed', ws.address === '27 Ngô Đức Kế, Hồ Chí Minh', ws.address);
  check('opening hours kept', ws.openingHours?.[0]?.time === 'Mo-Su 08:00-21:00');
  check('wifi amenity from tags', ws.amenities.includes('Wi-Fi'));
  check('no invented rating', ws.rating === 0 && ws.reviewCount === 0 && ws.reviews.length === 0);
  check('not bookable partner', ws.isPartner === false);
  check('stock photo is labelled', ws.tags.includes('Ảnh minh họa'));
  check('workshop model inferred', ws.specialModels.includes('Workshop Café'));
  const hl = r.shops.find(s => s.name === 'Highlands Coffee')!;
  check('way center used', hl.location?.lat === 10.774);
  check('real OSM image used', hl.coverImage === 'https://upload.example.org/h.jpg' && !hl.tags.includes('Ảnh minh họa'));
  const sach = r.shops.find(s => s.name === 'Sách Café')!;
  check('wikimedia commons image', sach.coverImage.startsWith('https://commons.wikimedia.org/wiki/Special:FilePath/'));
  check('book model inferred', sach.specialModels.includes('Book Café'));
  const choc = r.shops.find(s => s.name === 'Chocolate House')!;
  check('"Chocolate" is not a dog café', !choc.specialModels.includes('Dog Café'));
  check('id prefix', ws.id === 'osm_node_1');
  check('one network call (≥5 results, no widening)', calls.length === 1, calls);

  // cache
  calls = [];
  await searchFreeCafes({ ...ORIGIN, radius: 3000 });
  check('second identical search served from cache', calls.length === 0);

  // filters
  const cat = await searchFreeCafes({ ...ORIGIN, radius: 3000, query: 'cà phê mèo' });
  check('query "cà phê mèo" → cat café only', cat.shops.length === 1 && cat.shops[0].name === 'Cà Phê Mèo Mun', cat.shops.map(s => s.name));
  const model = await searchFreeCafes({ ...ORIGIN, radius: 3000, specialModel: 'Book Café' });
  check('model filter Book Café', model.shops.length === 1 && model.shops[0].name === 'Sách Café');
  const named = await searchFreeCafes({ ...ORIGIN, radius: 3000, query: 'highlands' });
  check('name search', named.shops.length === 1 && named.shops[0].name === 'Highlands Coffee');
  const generic = await searchFreeCafes({ ...ORIGIN, radius: 3000, query: 'quán cà phê gần đây' });
  check('generic query returns all', generic.shops.length === 5);
  const limited = await searchFreeCafes({ ...ORIGIN, radius: 3000, limit: 2 });
  check('limit respected', limited.shops.length === 2);

  // mirror failover
  __clearOverpassCache();
  calls = [];
  mode = 'firstFails';
  const fo = await searchFreeCafes({ ...ORIGIN, radius: 3000 });
  check('falls over to second mirror', fo.shops.length === 5 && calls.length === 2 && calls[0] !== calls[1], calls);

  // widening when few results
  __clearOverpassCache();
  calls = [];
  mode = 'ok';
  const wide = await searchFreeCafes({ ...ORIGIN, radius: 3000, query: 'mèo' });
  check('widens radius once when <5 results', calls.length === 2 && wide.shops.length === 1, calls.length);

  // bad input
  let threw = false;
  try {
    await searchFreeCafes({ lat: 999, lng: 0 });
  } catch {
    threw = true;
  }
  check('invalid coordinates rejected', threw);

  // freeOrSyntheticPlaces
  __clearOverpassCache();
  mode = 'ok';
  const f1: any = await freeOrSyntheticPlaces({ ...ORIGIN, language: 'vi' }, 'no key');
  check('fallback uses OSM when Google missing', f1.source === 'osm' && f1.shops.length === 5 && !f1.error);
  check('fallback summary is honest', /OpenStreetMap/.test(f1.summary));

  __clearOverpassCache();
  mode = 'empty';
  const f2: any = await freeOrSyntheticPlaces({ ...ORIGIN, language: 'vi', query: 'mèo' }, 'no key');
  check('keyword search with no OSM match returns empty, not fake shops', f2.shops.length === 0 && f2.source === 'osm');

  __clearOverpassCache();
  mode = 'allFail';
  const prevEnv = process.env.SYNTHETIC_FALLBACK_PLACES;
  process.env.SYNTHETIC_FALLBACK_PLACES = 'true';
  const f3: any = await freeOrSyntheticPlaces({ ...ORIGIN, language: 'vi' }, 'no key');
  check('all mirrors down → labelled synthetic data', f3.shops.length > 0 && f3.shops.every((s: any) => s.isSynthetic) && f3.error === 'no key');
  process.env.SYNTHETIC_FALLBACK_PLACES = prevEnv;

  // ---- IP location ----
  check('::ffff:127.0.0.1 normalised', normalizeIp('::ffff:127.0.0.1') === '127.0.0.1');
  check('private IPs detected', ['127.0.0.1', '::1', '192.168.1.5', '10.0.0.2', '172.20.1.1', '100.64.0.1', 'fd00::1', ''].every(isPrivateIp));
  check('public IP not private', !isPrivateIp('1.53.20.4') && !isPrivateIp('172.32.0.1'));
  const ipCalls: string[] = [];
  __setIpFetch((async (url: any) => {
    ipCalls.push(String(url));
    if (String(url).includes('ipwho.is')) return new Response('rate limited', { status: 429 });
    return new Response(JSON.stringify({ latitude: '25.0478', longitude: '121.5319', city: 'Taipei', country: 'Taiwan', country_code: 'TW' }), { status: 200 });
  }) as any);
  __clearIpCache();
  const self = await lookupIpLocation('');
  check('self lookup falls over to next provider', self?.provider === 'geojs.io' && self.city === 'Taipei' && Math.abs(self.lat - 25.0478) < 1e-6, self);
  check('self lookup uses no-IP URL', ipCalls[1] === 'https://get.geojs.io/v1/ip/geo.json', ipCalls);
  ipCalls.length = 0;
  await lookupIpLocation('');
  check('ip lookup cached', ipCalls.length === 0);
  __setIpFetch((async () => new Response('down', { status: 503 })) as any);
  __clearIpCache();
  check('all providers down → null (no invented city)', (await lookupIpLocation('1.53.20.4')) === null);

  console.log(`\nfree places: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
