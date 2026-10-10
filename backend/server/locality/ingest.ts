import crypto from 'crypto';
import { cellForCoords, haversineMeters, normalizeText } from '../../../shared/locality';
import { localityConfig } from './config';
import { evaluateQuality } from './quality';
import { rightsFor, retentionExpiry } from './rights';
import { localityStore } from './store';
import { RawCandidate } from './adapters/types';
import { LocalityPlace, PlaceStatus } from './types';

const sha = (s: string) => crypto.createHash('sha1').update(s).digest('hex');
const DUPLICATE_RADIUS_M = 80;

/** Words that do not help tell two cafés apart. */
const STOP = new Set(['cafe', 'coffee', 'ca', 'phe', 'quan', 'the', 'and', 'shop', 'roastery', 'house']);

function nameTokens(name: string) {
  return new Set(normalizeText(name).split(' ').filter(t => t && !STOP.has(t)));
}

export function sameName(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.size === 0 || tb.size === 0) return false;
  const inter = [...ta].filter(t => tb.has(t)).length;
  return inter / Math.min(ta.size, tb.size) >= 0.8;
}

/**
 * Stable key built only from our own normalised data (name + ~110 m grid),
 * never from a provider place id.
 */
export function dedupeKey(name: string, lat: number, lng: number) {
  return `${normalizeText(name)}@${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export function findDuplicate(name: string, lat: number, lng: number): LocalityPlace | undefined {
  return localityStore.data.places.find(
    p => haversineMeters(p, { lat, lng }) <= DUPLICATE_RADIUS_M && sameName(p.name, name)
  );
}

export interface IngestSummary {
  candidates: number;
  cafes: number;
  passed: number;
  disqualified: number;
  merged: number;
  created: number;
  skipped_rights: number;
  invalid: number;
  touched_ids: string[];
}

function nextStatus(current: PlaceStatus | undefined, passed: boolean): PlaceStatus {
  if (current === 'rejected') return 'rejected'; // an admin decision is not undone by new data
  if (current === 'published') return passed ? 'published' : 'unpublished';
  if (current === 'unpublished') return passed ? 'pending_review' : 'unpublished';
  return passed ? 'pending_review' : 'disqualified';
}

export function ingestCandidates(adapterId: string, candidates: RawCandidate[], defaultOrigin: string | undefined, requestId: string): IngestSummary {
  const summary: IngestSummary = { candidates: candidates.length, cafes: 0, passed: 0, disqualified: 0, merged: 0, created: 0, skipped_rights: 0, invalid: 0, touched_ids: [] };
  const now = new Date();
  const nowIso = now.toISOString();

  for (const c of candidates) {
    if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number' || Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) {
      summary.invalid++;
      continue;
    }
    const originRaw = c.origin || defaultOrigin;
    const origin = originRaw && originRaw !== adapterId ? originRaw : undefined;
    const sourceId = origin ? `${adapterId}:${origin}` : adapterId;
    const rights = rightsFor(adapterId, origin);

    // Without the right to store business data we keep nothing at all from this record.
    if (rights.business_data !== 'granted') {
      summary.skipped_rights++;
      continue;
    }

    const name = String(c.name || '').trim();
    const categories = [...new Set((c.categories || []).map(x => String(x).trim()).filter(Boolean))];
    let place = name ? findDuplicate(name, c.lat, c.lng) : undefined;
    const isNew = !place;

    if (!place) {
      place = {
        id: `plc_${sha(dedupeKey(name || 'unnamed', c.lat, c.lng)).slice(0, 14)}`,
        dedupe_key: dedupeKey(name || 'unnamed', c.lat, c.lng),
        status: 'disqualified',
        name,
        address: c.address || '',
        lat: Number(c.lat.toFixed(6)),
        lng: Number(c.lng.toFixed(6)),
        cell_id: cellForCoords(c.lat, c.lng).id,
        categories,
        sources: [],
        photos: [],
        reviews: [],
        quality: evaluateQuality({ name, categories, photos: [], reviews: [], sources: [] }),
        request_ids: [],
        created_at: nowIso,
        updated_at: nowIso
      };
      localityStore.data.places.push(place);
    }

    // ---- merge basic fields (admin edits always win) ----
    const edited = place.admin_edits || {};
    const fill = (key: 'address' | 'phone' | 'website' | 'opening_hours', value?: string) => {
      if (value && !(key in edited) && !place![key]) (place as any)[key] = value;
    };
    fill('address', c.address);
    fill('phone', c.phone);
    fill('website', c.website);
    fill('opening_hours', c.opening_hours);
    if (!('categories' in edited)) place.categories = [...new Set([...place.categories, ...categories])];
    if (typeof c.rating_avg === 'number' && !place.rating_avg) place.rating_avg = c.rating_avg;

    const existingSource = place.sources.find(s => s.source === sourceId && s.source_ref === c.source_ref);
    const lastMediaFetch = existingSource ? new Date(existingSource.fetched_at).getTime() : 0;
    if (existingSource) existingSource.fetched_at = nowIso;
    else place.sources.push({ source: sourceId, source_ref: c.source_ref, fetched_at: nowIso, attribution: rights.attribution });

    // ---- media: never refreshed more often than mediaRefreshDays per source ----
    const mediaDue = !lastMediaFetch || now.getTime() - lastMediaFetch > localityConfig.mediaRefreshDays * 86400000;
    if (mediaDue || isNew) {
      const expires = retentionExpiry(nowIso, rights);
      for (const ph of c.photos || []) {
        if (!ph?.url || place.photos.some(p => p.url === ph.url)) continue;
        place.photos.push({
          id: `ph_${sha(ph.url).slice(0, 12)}`,
          url: ph.url,
          source: sourceId,
          rights_status: rights.photos,
          attribution: ph.attribution || rights.attribution,
          fetched_at: nowIso,
          expires_at: expires
        });
      }
      for (const rv of c.reviews || []) {
        const hash = sha(`${sourceId}|${rv.author || ''}|${rv.text || ''}|${rv.date || ''}|${rv.rating ?? ''}`);
        if (place.reviews.some(r => r.dedupe_hash === hash)) continue;
        place.reviews.push({
          id: `rv_${hash.slice(0, 12)}`,
          dedupe_hash: hash,
          rating: typeof rv.rating === 'number' ? Math.max(1, Math.min(5, rv.rating)) : undefined,
          text: rv.text ? String(rv.text).slice(0, 2000) : undefined,
          date: rv.date,
          language: rv.language,
          author: rv.author ? String(rv.author).slice(0, 80) : undefined,
          source: sourceId,
          rights_status: rights.reviews,
          fetched_at: nowIso,
          expires_at: expires
        });
      }
    }

    if (!place.request_ids.includes(requestId)) place.request_ids.push(requestId);
    place.quality = evaluateQuality(place);
    place.status = nextStatus(isNew ? undefined : place.status, place.quality.passed);
    place.updated_at = nowIso;

    if (place.quality.is_cafe) summary.cafes++;
    if (place.quality.passed) summary.passed++;
    else summary.disqualified++;
    if (isNew) summary.created++;
    else summary.merged++;
    summary.touched_ids.push(place.id);
  }

  localityStore.save();
  return summary;
}
