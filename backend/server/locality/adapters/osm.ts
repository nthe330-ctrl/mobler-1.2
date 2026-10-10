import { localityConfig } from '../config';
import { AdapterJob, AdapterResult, RawCandidate, SourceAdapter } from './types';

/**
 * OpenStreetMap via the Overpass API. Only amenity=cafe is requested, so the
 * source itself never returns restaurants or shops. OSM has no photos or reviews,
 * so OSM-only places stay below the quality gate (0 photos / 0 reviews) until
 * licensed photos/reviews are attached from another source.
 * Respect the Overpass usage policy: low volume, identify the app (User-Agent).
 */
export const osmAdapter: SourceAdapter = {
  id: 'osm',
  label: 'OpenStreetMap',
  status() {
    if (!localityConfig.osmEnabled) return { enabled: false, reason: 'LOCALITY_OSM_ENABLED=false' };
    return { enabled: true };
  },
  async fetch(job: AdapterJob, signal: AbortSignal): Promise<AdapterResult> {
    const { south, west, north, east } = job.bounds;
    const bbox = `${south},${west},${north},${east}`;
    const query = `[out:json][timeout:20];(node["amenity"="cafe"](${bbox});way["amenity"="cafe"](${bbox}););out center tags 200;`;
    const res = await fetch(localityConfig.osmEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.LOCALITY_OSM_USER_AGENT || 'Mobler/2.0 (locality data; contact: admin@mobler.vn)'
      },
      body: `data=${encodeURIComponent(query)}`,
      signal
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const json: any = await res.json();
    return { origin: 'osm', candidates: (json.elements || []).map(toCandidate).filter(Boolean) as RawCandidate[] };
  }
};

export function toCandidate(el: any): RawCandidate | null {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const categories: string[] = [];
  if (tags.amenity) categories.push(String(tags.amenity));
  if (tags.cuisine) String(tags.cuisine).split(';').forEach((c: string) => categories.push(c.trim().replace(/_/g, ' ')));
  const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:subdistrict'] || tags['addr:quarter'], tags['addr:district'], tags['addr:city']]
    .filter(Boolean)
    .join(', ');
  return {
    source_ref: `${el.type}/${el.id}`,
    name: tags.name || tags['name:vi'] || tags['name:en'] || '',
    address,
    lat,
    lng,
    categories,
    phone: tags.phone || tags['contact:phone'],
    website: tags.website || tags['contact:website'],
    opening_hours: tags.opening_hours,
    photos: [],
    reviews: []
  };
}
