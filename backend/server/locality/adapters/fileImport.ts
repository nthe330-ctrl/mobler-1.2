import fs from 'fs';
import path from 'path';
import { localityConfig } from '../config';
import { AdapterJob, AdapterResult, RawCandidate, SourceAdapter } from './types';

/**
 * Reads export files dropped into LOCALITY_IMPORT_DIR. This is how GPM Automate (or
 * any other tool) hands data to Mobler without the server needing GPM credentials:
 * the automation writes files in the documented format below, the worker picks them up.
 *
 * File format (JSON):
 * {
 *   "format": "mobler-locality-import/v1",
 *   "origin": "partner_websites",            // must exist in source-rights.json → origins
 *   "generator": "GPM Automate script X",     // informational
 *   "exported_at": "2026-10-09T10:00:00Z",
 *   "places": [ { name, address, lat, lng, categories[], phone?, website?, opening_hours?,
 *                 photos?: [{url, attribution?}], reviews?: [{rating?, text?, date?, language?, author?}] } ]
 * }
 * Rights are resolved from the declared origin; an undeclared or unverified origin
 * means nothing from that file is stored.
 */
export const FILE_FORMAT = 'mobler-locality-import/v1';

export const fileImportAdapter: SourceAdapter = {
  id: 'file_import',
  label: 'Tệp nhập (GPM Automate export…)',
  status() {
    if (!localityConfig.importDir) return { enabled: false, reason: 'Chưa đặt LOCALITY_IMPORT_DIR' };
    if (!fs.existsSync(localityConfig.importDir)) return { enabled: false, reason: 'Thư mục LOCALITY_IMPORT_DIR không tồn tại' };
    return { enabled: true };
  },
  async fetch(job: AdapterJob): Promise<AdapterResult> {
    const dir = localityConfig.importDir;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).slice(0, 200);
    const out: RawCandidate[] = [];
    const { south, west, north, east } = job.bounds;
    for (const f of files) {
      let parsed: any;
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
      } catch {
        continue; // malformed file — reported by the admin "sources" view through counts
      }
      if (parsed?.format !== FILE_FORMAT || !Array.isArray(parsed.places) || typeof parsed.origin !== 'string') continue;
      for (const p of parsed.places) {
        if (typeof p?.lat !== 'number' || typeof p?.lng !== 'number') continue;
        if (p.lat < south || p.lat >= north || p.lng < west || p.lng >= east) continue;
        out.push({
          source_ref: p.source_ref ? String(p.source_ref) : undefined,
          origin: parsed.origin,
          name: String(p.name || ''),
          address: p.address ? String(p.address) : '',
          lat: p.lat,
          lng: p.lng,
          categories: Array.isArray(p.categories) ? p.categories.map(String) : [],
          phone: p.phone,
          website: p.website,
          opening_hours: p.opening_hours,
          rating_avg: typeof p.rating_avg === 'number' ? p.rating_avg : undefined,
          photos: Array.isArray(p.photos) ? p.photos.filter((x: any) => x && typeof x.url === 'string') : [],
          reviews: Array.isArray(p.reviews) ? p.reviews : []
        });
      }
    }
    return { candidates: out };
  }
};
