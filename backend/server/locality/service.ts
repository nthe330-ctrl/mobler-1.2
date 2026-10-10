import crypto from 'crypto';
import {
  COVERAGE_LABEL_VI, CoverageStatus, LocalityPlaceDTO, LocalitySearchResponse,
  cellBounds, cellForCoords, neighbourhood, normalizeText, parseCellId
} from '../../../shared/locality';
import { db } from '../db';
import { localityConfig } from './config';
import { localityVersion, onLocalityChanged, subscribeLocality } from './events';
import { usablePhotos, usableReviews, evaluateQuality } from './quality';
import { ACTIVE_STATES, enqueueCell, normalizeKeyword, settleAwaitingRequests } from './queue';
import { rightsFor } from './rights';
import { localityStore } from './store';
import { LocalityPlace, ModerationLog, PlaceStatus } from './types';
import { recordUsage } from './usage';

// ---------------- search cache ----------------
const cache = new Map<string, { at: number; version: number; value: LocalitySearchResponse }>();
subscribeLocality(() => cache.clear());

/** Requesters are stored only as a salted hash — never raw IPs. */
export function requesterId(userId: string | undefined, ip: string | undefined, ua: string | undefined) {
  if (userId) return `u:${userId}`;
  const salt = process.env.JWT_SECRET || 'mobler';
  return `a:${crypto.createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 16)}`;
}

const CAFE_WORDS = new Set(['', 'cafe', 'coffee', 'ca phe', 'quan ca phe', 'quan cafe', 'coffee shop']);

function matchesKeyword(text: string, q: string) {
  if (CAFE_WORDS.has(q)) return true;
  return normalizeText(text).includes(q);
}

function averageRating(reviews: { rating?: number }[]) {
  const rated = reviews.filter(r => typeof r.rating === 'number');
  if (!rated.length) return undefined;
  return Math.round((rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length) * 10) / 10;
}

/** Public projection: only media the source lets us show, and only what an admin has seen. */
export function toDTO(p: LocalityPlace): LocalityPlaceDTO {
  const publishedAt = p.published_at ? new Date(p.published_at).getTime() : 0;
  const approvedOnly = <T extends { fetched_at: string }>(items: T[]) => items.filter(i => new Date(i.fetched_at).getTime() <= publishedAt);
  const photos = approvedOnly(usablePhotos(p.photos));
  const reviews = approvedOnly(usableReviews(p.reviews));
  return {
    id: p.id,
    kind: 'locality',
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    categories: p.categories,
    phone: p.phone,
    website: p.website,
    opening_hours: p.opening_hours,
    rating: averageRating(reviews) ?? p.rating_avg,
    review_count: reviews.length,
    photos: photos.map(ph => ({ id: ph.id, url: ph.url, attribution: ph.attribution })),
    reviews: reviews.slice(0, 20).map(r => ({ id: r.id, rating: r.rating, text: r.text, date: r.date, language: r.language, author: r.author, source: r.source })),
    sources: p.sources.map(s => ({ source: s.source, attribution: s.attribution || rightsFor(s.source.split(':')[0]).attribution, fetched_at: s.fetched_at })),
    updated_at: p.updated_at,
    is_partner: false
  };
}

function partnerDTOs(cellIds: Set<string>): LocalityPlaceDTO[] {
  const out: LocalityPlaceDTO[] = [];
  for (const s of db.getShops()) {
    if (!s.isPartner || !s.location) continue;
    if (!cellIds.has(cellForCoords(s.location.lat, s.location.lng).id)) continue;
    const reviews = db.getReviewsByShopId(s.id);
    out.push({
      id: s.id,
      kind: 'partner',
      name: s.name,
      address: s.address,
      lat: s.location.lat,
      lng: s.location.lng,
      categories: ['cafe'],
      phone: s.phoneNumber,
      website: s.website,
      opening_hours: s.openingHours?.map(o => `${o.day}: ${o.time}`).join('; '),
      rating: s.rating,
      review_count: reviews.length,
      photos: (s.images || []).slice(0, 6).map((url, i) => ({ id: `${s.id}-${i}`, url, attribution: 'Ảnh do quán cung cấp' })),
      reviews: [],
      sources: [{ source: 'mobler_partner', attribution: 'Thông tin do quán đối tác cung cấp trên Mobler Shop', fetched_at: new Date().toISOString() }],
      updated_at: new Date().toISOString(),
      is_partner: true
    });
  }
  return out;
}

export function search(opts: {
  cell: string;
  q?: string;
  page?: number;
  pageSize?: number;
  requester: string;
  enqueue?: boolean;
}): LocalitySearchResponse | { error: string } {
  const center = parseCellId(opts.cell);
  if (!center) return { error: 'Mã khu vực không hợp lệ' };
  const q = normalizeText(opts.q || '').slice(0, 80);
  const page = Math.max(1, Math.floor(opts.page || 1));
  const pageSize = Math.min(localityConfig.maxPageSize, Math.max(1, Math.floor(opts.pageSize || localityConfig.defaultPageSize)));
  recordUsage('locality.search');

  const cells = neighbourhood(center);
  const cellIds = new Set(cells.map(c => c.id));
  const now = new Date();

  // Ask for enrichment of missing/stale cells (idempotent, rate-limited) — never blocks the response.
  if (opts.enqueue !== false) {
    for (const c of cells) {
      const cov = localityStore.data.coverage.find(x => x.cell_id === c.id);
      if (!cov || new Date(cov.fresh_until) <= now) {
        const r = enqueueCell({ cellId: c.id, keyword: q, requester: opts.requester, trigger: cov ? 'stale' : 'user_search' });
        if (r.kind === 'rate_limited' || r.kind === 'queue_full') break;
      }
    }
  }
  settleAwaitingRequests();

  const cacheKey = `${center.id}|${q}|${page}|${pageSize}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.version === localityVersion() && Date.now() - hit.at < localityConfig.searchCacheTtlMs) {
    recordCompleteness(hit.value.status);
    return { ...hit.value, cached: true };
  }

  // ---- coverage ----
  let fresh = 0;
  let stale = 0;
  for (const c of cells) {
    const cov = localityStore.data.coverage.find(x => x.cell_id === c.id);
    if (!cov) continue;
    if (new Date(cov.fresh_until) > now) fresh++;
    else stale++;
  }
  const keyword = normalizeKeyword(q);
  const activeReqs = localityStore.data.requests.filter(
    r => cellIds.has(r.cell_id) && (ACTIVE_STATES as readonly string[]).includes(r.state) && (r.keyword === keyword || r.keyword === '')
  );
  const pendingReview = localityStore.data.places.filter(p => cellIds.has(p.cell_id) && p.status === 'pending_review').length;

  let status: CoverageStatus;
  if (fresh === cells.length && activeReqs.length === 0 && pendingReview === 0) status = 'complete';
  else if (activeReqs.length > 0 || pendingReview > 0) status = 'enriching';
  else if (stale > 0) status = 'stale';
  else if (fresh > 0) status = 'partial';
  else status = 'empty';

  // ---- results: partner shops first, then approved locality places ----
  const published = localityStore.data.places
    .filter(p => p.status === 'published' && cellIds.has(p.cell_id))
    .map(toDTO);
  const all = [...partnerDTOs(cellIds), ...published]
    .filter(p => matchesKeyword(`${p.name} ${p.address} ${p.categories.join(' ')}`, q));
  const start = (page - 1) * pageSize;

  const firstReq = activeReqs.sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const attributions = [...new Set(all.flatMap(p => p.sources.map(s => s.attribution).filter(Boolean) as string[]))];

  let message = COVERAGE_LABEL_VI[status];
  if (status === 'enriching' && pendingReview > 0) message = `${message} — ${pendingReview} quán đang chờ kiểm duyệt`;
  if (status !== 'complete' && all.length > 0) message = `${message}. Đang hiển thị ${all.length} quán đã có.`;

  const response: LocalitySearchResponse = {
    status,
    message,
    cell: center.id,
    cells_total: cells.length,
    cells_fresh: fresh,
    cells_stale: stale,
    places: all.slice(start, start + pageSize),
    page,
    page_size: pageSize,
    total: all.length,
    enrichment: firstReq || pendingReview
      ? { request_id: firstReq?.id || '', state: firstReq?.state || 'awaiting_review', queued_at: firstReq?.created_at || '', pending_review: pendingReview }
      : null,
    allow_google_fallback: localityConfig.allowGoogleFallback && status !== 'complete',
    attributions,
    cached: false
  };
  cache.set(cacheKey, { at: Date.now(), version: localityVersion(), value: response });
  recordCompleteness(status);
  return response;
}

function recordCompleteness(status: CoverageStatus) {
  if (status === 'complete') {
    recordUsage('locality.search_complete');
    recordUsage('locality.google_calls_avoided_est', localityConfig.googleCallsPerAreaSearch);
  } else {
    recordUsage('locality.search_incomplete');
  }
}

export function manualRefresh(cell: string, requester: string) {
  const c = parseCellId(cell);
  // `code` lets each client show the message in its own language; `message` stays
  // as a Vietnamese fallback for logs and any caller that does not localize.
  if (!c) return { ok: false, status: 400, code: 'bad_cell', message: 'Mã khu vực không hợp lệ' };
  const r = enqueueCell({ cellId: c.id, requester, trigger: 'manual_refresh' });
  switch (r.kind) {
    case 'queued':
      return { ok: true, status: 202, code: 'queued', message: 'Đã gửi yêu cầu cập nhật khu vực', request_id: r.request.id };
    case 'joined':
      return { ok: true, status: 202, code: 'joined', message: 'Khu vực này đang được cập nhật', request_id: r.request.id };
    case 'cooldown':
      return { ok: false, status: 429, code: 'cooldown', retry_at: new Date(r.until).toISOString(), message: `Khu vực vừa được cập nhật, có thể làm mới lại sau ${new Date(r.until).toLocaleString('vi-VN')}` };
    case 'rate_limited':
      return { ok: false, status: 429, code: 'rate_limited', message: 'Bạn đã làm mới quá nhiều lần, thử lại sau 1 giờ' };
    case 'queue_full':
      return { ok: false, status: 503, code: 'queue_full', message: 'Hệ thống đang bận, thử lại sau' };
    default:
      return { ok: true, status: 200, code: 'fresh', message: 'Dữ liệu khu vực vẫn còn mới' };
  }
}

// ---------------- admin operations ----------------

function log(entry: Omit<ModerationLog, 'id' | 'at'>) {
  localityStore.data.moderation.push({ id: `mod_${crypto.randomBytes(6).toString('hex')}`, at: new Date().toISOString(), ...entry });
  if (localityStore.data.moderation.length > 20000) localityStore.data.moderation.splice(0, 1000);
}

export function getPlace(id: string) {
  return localityStore.data.places.find(p => p.id === id);
}

export type AdminActor = { id: string; name: string };

function publishExpiry(p: LocalityPlace) {
  const retention = p.sources
    .map(s => rightsFor(s.source.split(':')[0], s.source.includes(':') ? s.source.split(':').slice(1).join(':') : undefined).retention_days)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const days = retention.length ? Math.min(...retention) : 180;
  return new Date(Date.now() + days * 86400000).toISOString();
}

export function approvePlace(id: string, actor: AdminActor, note?: string) {
  const p = getPlace(id);
  if (!p) return { ok: false, status: 404, error: 'Không tìm thấy địa điểm' };
  if (!['pending_review', 'unpublished', 'published'].includes(p.status)) {
    return { ok: false, status: 409, error: `Không thể duyệt địa điểm ở trạng thái ${p.status}` };
  }
  p.quality = evaluateQuality(p);
  if (!p.quality.passed) {
    return { ok: false, status: 409, error: 'Địa điểm chưa đạt chuẩn để xuất bản', reasons: p.quality.reasons };
  }
  const before = p.status;
  p.status = 'published';
  p.published_at = new Date().toISOString();
  p.expires_at = publishExpiry(p);
  p.updated_at = p.published_at;
  log({ place_id: p.id, action: 'approve', admin_id: actor.id, admin_name: actor.name, note, status_before: before, status_after: 'published' });
  localityStore.save();
  onLocalityChanged();
  return { ok: true, place: p };
}

export function setStatusByAdmin(id: string, action: 'reject' | 'unpublish', actor: AdminActor, note?: string) {
  const p = getPlace(id);
  if (!p) return { ok: false, status: 404, error: 'Không tìm thấy địa điểm' };
  if (action === 'reject' && !note) return { ok: false, status: 400, error: 'Cần ghi lý do từ chối' };
  if (action === 'unpublish' && p.status !== 'published') return { ok: false, status: 409, error: 'Địa điểm chưa được xuất bản' };
  const before = p.status;
  const after: PlaceStatus = action === 'reject' ? 'rejected' : 'unpublished';
  p.status = after;
  p.updated_at = new Date().toISOString();
  log({ place_id: p.id, action, admin_id: actor.id, admin_name: actor.name, note, status_before: before, status_after: after });
  localityStore.save();
  onLocalityChanged();
  return { ok: true, place: p };
}

const EDITABLE = ['name', 'address', 'categories', 'phone', 'website', 'opening_hours', 'lat', 'lng'] as const;

export function editPlace(id: string, body: any, actor: AdminActor) {
  const p = getPlace(id);
  if (!p) return { ok: false, status: 404, error: 'Không tìm thấy địa điểm' };
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of EDITABLE) {
    if (!(key in (body || {}))) continue;
    let value = body[key];
    if (key === 'categories') value = Array.isArray(value) ? value.map((v: any) => String(v).trim()).filter(Boolean).slice(0, 10) : p.categories;
    else if (key === 'lat' || key === 'lng') {
      value = Number(value);
      if (!Number.isFinite(value) || Math.abs(value) > (key === 'lat' ? 90 : 180)) continue;
    } else value = String(value ?? '').trim().slice(0, 300);
    if (JSON.stringify((p as any)[key]) === JSON.stringify(value)) continue;
    changes[key] = { from: (p as any)[key], to: value };
    (p as any)[key] = value;
    p.admin_edits = { ...(p.admin_edits || {}), [key]: value };
  }
  if (changes.lat || changes.lng) p.cell_id = cellForCoords(p.lat, p.lng).id;
  for (const pid of Array.isArray(body?.remove_photo_ids) ? body.remove_photo_ids : []) {
    const ph = p.photos.find(x => x.id === pid);
    if (ph && !ph.removed_by_admin) {
      ph.removed_by_admin = true;
      changes[`photo:${pid}`] = { from: 'visible', to: 'removed' };
    }
  }
  for (const rid of Array.isArray(body?.remove_review_ids) ? body.remove_review_ids : []) {
    const rv = p.reviews.find(x => x.id === rid);
    if (rv && !rv.removed_by_admin) {
      rv.removed_by_admin = true;
      changes[`review:${rid}`] = { from: 'visible', to: 'removed' };
    }
  }
  if (Object.keys(changes).length === 0) return { ok: true, place: p, changed: false };

  const before = p.status;
  p.quality = evaluateQuality(p);
  if (p.status === 'published' && !p.quality.passed) p.status = 'unpublished';
  else if ((p.status === 'disqualified' || p.status === 'unpublished') && p.quality.passed) p.status = 'pending_review';
  else if (p.status === 'pending_review' && !p.quality.passed) p.status = 'disqualified';
  p.updated_at = new Date().toISOString();
  log({ place_id: p.id, action: 'edit', admin_id: actor.id, admin_name: actor.name, changes, note: body?.note, status_before: before, status_after: p.status });
  localityStore.save();
  onLocalityChanged();
  return { ok: true, place: p, changed: true };
}

/** Admin view of a place: everything, with rights flags, plus its audit log. */
export function adminPlaceView(p: LocalityPlace) {
  // Content without display rights never leaves the server, not even to admins.
  return {
    ...p,
    photos: p.photos.map(ph => (ph.rights_status === 'granted' ? ph : { ...ph, url: '' })),
    reviews: p.reviews.map(r => (r.rights_status === 'granted' ? r : { ...r, text: undefined, author: undefined })),
    reason_labels: p.quality.reasons,
    moderation: localityStore.data.moderation.filter(m => m.place_id === p.id).slice(-50).reverse(),
    source_rights: [...new Set(p.sources.map(s => s.source))].map(s => {
      const [base, ...rest] = s.split(':');
      return { source: s, rights: rightsFor(base, rest.length ? rest.join(':') : undefined) };
    })
  };
}

// ---------------- retention ----------------

/**
 * Deletes photos/reviews whose retention period has ended, purges places whose
 * source rights were revoked, unpublishes places that no longer pass the gate,
 * and queues a refresh for published places past their expiry.
 */
export function runRetention(actor: AdminActor = { id: 'system', name: 'Retention job' }) {
  const now = Date.now();
  const report = { photos_deleted: 0, reviews_deleted: 0, places_purged: 0, places_unpublished: 0, refresh_queued: 0 };
  const keep: LocalityPlace[] = [];
  for (const p of localityStore.data.places) {
    const revoked = p.sources.some(s => {
      const [base, ...rest] = s.source.split(':');
      return rightsFor(base, rest.length ? rest.join(':') : undefined).business_data === 'denied';
    });
    if (revoked) {
      report.places_purged++;
      log({ place_id: p.id, action: 'retention_expire', admin_id: actor.id, admin_name: actor.name, note: 'Quyền nguồn bị thu hồi — đã xóa toàn bộ bản ghi', status_before: p.status });
      continue;
    }
    const photosBefore = p.photos.length;
    const reviewsBefore = p.reviews.length;
    p.photos = p.photos.filter(x => !x.expires_at || new Date(x.expires_at).getTime() > now);
    p.reviews = p.reviews.filter(x => !x.expires_at || new Date(x.expires_at).getTime() > now);
    report.photos_deleted += photosBefore - p.photos.length;
    report.reviews_deleted += reviewsBefore - p.reviews.length;
    if (photosBefore !== p.photos.length || reviewsBefore !== p.reviews.length) {
      const before = p.status;
      p.quality = evaluateQuality(p);
      if (p.status === 'published' && !p.quality.passed) {
        p.status = 'unpublished';
        report.places_unpublished++;
      } else if (p.status === 'pending_review' && !p.quality.passed) p.status = 'disqualified';
      log({ place_id: p.id, action: 'retention_expire', admin_id: actor.id, admin_name: actor.name, note: `Xóa ${photosBefore - p.photos.length} ảnh, ${reviewsBefore - p.reviews.length} đánh giá hết hạn lưu`, status_before: before, status_after: p.status });
    }
    if (p.status === 'published' && p.expires_at && new Date(p.expires_at).getTime() < now) {
      const r = enqueueCell({ cellId: p.cell_id, requester: 'system:retention', trigger: 'stale' });
      if (r.kind === 'queued') report.refresh_queued++;
    }
    keep.push(p);
  }
  localityStore.data.places = keep;
  localityStore.save();
  onLocalityChanged();
  return report;
}

let retentionTimer: NodeJS.Timeout | null = null;
export function startRetentionSchedule() {
  if (retentionTimer) return;
  retentionTimer = setInterval(() => runRetention(), 6 * 3600_000);
  retentionTimer.unref();
}

export function overview() {
  settleAwaitingRequests();
  const byStatus: Record<string, number> = {};
  localityStore.data.places.forEach(p => (byStatus[p.status] = (byStatus[p.status] || 0) + 1));
  const byState: Record<string, number> = {};
  localityStore.data.requests.forEach(r => (byState[r.state] = (byState[r.state] || 0) + 1));
  const reasons: Record<string, number> = {};
  localityStore.data.places.filter(p => p.status === 'disqualified').forEach(p => p.quality.reasons.forEach(r => (reasons[r] = (reasons[r] || 0) + 1)));
  return {
    places: byStatus,
    requests: byState,
    disqualified_reasons: reasons,
    cells_covered: localityStore.data.coverage.length,
    thresholds: { photos: localityConfig.minPhotos, reviews: localityConfig.minReviews, categories: localityConfig.allowedCategories }
  };
}

export { cellBounds };
