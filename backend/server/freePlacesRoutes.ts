import type { Express, Request, Response } from 'express';
import { rateLimit } from './auth';
import { generateFallbackPlaces } from './fallbackPlaces';
import { searchFreeCafes } from './freePlaces';

type Lang = 'zh-TW' | 'th' | 'en' | 'vi';

/**
 * Used whenever Google Places can't answer (no key, quota, network error, 0 results):
 * 1) real cafés from OpenStreetMap (free), 2) only if that fails too, labelled demo data.
 */
export async function freeOrSyntheticPlaces(
  params: { lat: number; lng: number; query?: string; specialModel?: string; style?: string; amenity?: string; language: Lang; radius?: number },
  googleError: string,
  details?: string
) {
  try {
    const r = await searchFreeCafes({
      lat: params.lat,
      lng: params.lng,
      query: params.query,
      specialModel: params.specialModel,
      radius: params.radius || 3000
    });
    if (r.shops.length > 0) {
      return { shops: r.shops, source: 'osm', summary: r.summary, attribution: r.attribution };
    }
    // Keyword/model search with no OSM match: say so honestly instead of inventing shops.
    if (params.query || params.specialModel) {
      return { shops: [], source: 'osm', summary: r.summary, attribution: r.attribution };
    }
  } catch (err: any) {
    console.warn('[freePlaces] OpenStreetMap search failed:', err?.message || err);
  }
  return { shops: generateFallbackPlaces(params), error: googleError, details };
}

export function registerFreePlacesRoutes(app: Express) {
  /**
   * GET /api/places/nearby?lat=..&lng=..&radius=3000&q=...&model=Cat%20Café&limit=30
   * Free, key-less café search (OpenStreetMap / Overpass).
   */
  app.get('/api/places/nearby', rateLimit(60, 60_000), async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'lat và lng không hợp lệ' });
    }
    try {
      const result = await searchFreeCafes({
        lat,
        lng,
        radius: Number(req.query.radius) || 3000,
        query: typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : undefined,
        specialModel: typeof req.query.model === 'string' ? req.query.model : undefined,
        limit: Number(req.query.limit) || 30
      });
      res.json(result);
    } catch (err: any) {
      res.status(502).json({ error: 'Không kết nối được OpenStreetMap, thử lại sau.', details: String(err?.message || err) });
    }
  });
}
