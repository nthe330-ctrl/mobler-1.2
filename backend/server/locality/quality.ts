import { normalizeText } from '../../../shared/locality';
import { localityConfig } from './config';
import { rightsFor } from './rights';
import { LocalityPlace, PhotoRecord, QualityReport, ReviewRecord } from './types';

export const REASON_LABEL_VI: Record<string, string> = {
  name_missing: 'Thiếu tên địa điểm',
  category_missing: 'Thiếu danh mục',
  category_generic: 'Danh mục quá chung chung, không xác nhận được là quán cà phê',
  category_conflict: 'Danh mục mâu thuẫn (vừa quán cà phê vừa loại hình khác)',
  not_cafe: 'Không phải quán cà phê',
  photos_below_min: 'Không đủ ảnh hợp lệ',
  reviews_below_min: 'Không đủ đánh giá hợp lệ',
  rights_business_data: 'Nguồn chưa được cấp quyền lưu thông tin doanh nghiệp'
};

const nowIso = () => new Date().toISOString();

function isLive(item: { removed_by_admin?: boolean; expires_at?: string }, now: number) {
  return !item.removed_by_admin && (!item.expires_at || new Date(item.expires_at).getTime() > now);
}

export function usablePhotos(photos: PhotoRecord[], now = Date.now()): PhotoRecord[] {
  const seen = new Set<string>();
  return photos.filter(p => {
    if (!isLive(p, now) || p.rights_status !== 'granted' || !/^https:\/\//.test(p.url)) return false;
    const key = p.url.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function usableReviews(reviews: ReviewRecord[], now = Date.now()): ReviewRecord[] {
  const seen = new Set<string>();
  return reviews.filter(r => {
    if (!isLive(r, now) || r.rights_status !== 'granted') return false;
    if (!(r.text && r.text.trim().length >= 2) && typeof r.rating !== 'number') return false;
    if (seen.has(r.dedupe_hash)) return false;
    seen.add(r.dedupe_hash);
    return true;
  });
}

/** Decide whether the categories prove this is a café. Never guesses from the name. */
export function classifyCategories(categories: string[]) {
  const norm = categories.map(normalizeText).filter(Boolean);
  const allowed = localityConfig.allowedCategories.map(normalizeText);
  const conflicting = localityConfig.conflictingCategories.map(normalizeText);
  const generic = localityConfig.genericCategories.map(normalizeText);

  const cafeHits = norm.filter(c => allowed.includes(c));
  const conflictHits = norm.filter(c => conflicting.includes(c));
  const specific = norm.filter(c => !generic.includes(c));

  if (norm.length === 0) return { is_cafe: false, reason: 'category_missing' as const };
  if (cafeHits.length > 0 && conflictHits.length > 0) return { is_cafe: false, reason: 'category_conflict' as const, verified: cafeHits[0] };
  if (cafeHits.length > 0) return { is_cafe: true, verified: cafeHits[0] };
  if (conflictHits.length > 0) return { is_cafe: false, reason: 'not_cafe' as const };
  if (specific.length === 0) return { is_cafe: false, reason: 'category_generic' as const };
  return { is_cafe: false, reason: 'not_cafe' as const };
}

export function evaluateQuality(place: Pick<LocalityPlace, 'name' | 'categories' | 'photos' | 'reviews' | 'sources'>): QualityReport {
  const reasons: string[] = [];
  const rightsWarnings: string[] = [];

  if (!place.name || !place.name.trim()) reasons.push('name_missing');

  const cat = classifyCategories(place.categories || []);
  if (!cat.is_cafe && cat.reason) reasons.push(cat.reason);

  for (const s of place.sources) {
    const r = rightsFor(s.source);
    if (r.business_data !== 'granted') {
      reasons.push('rights_business_data');
      rightsWarnings.push(`${s.source}: quyền lưu thông tin doanh nghiệp = ${r.business_data}`);
    }
  }

  const photos = usablePhotos(place.photos);
  const reviews = usableReviews(place.reviews);
  const blockedPhotos = place.photos.filter(p => p.rights_status !== 'granted').length;
  const blockedReviews = place.reviews.filter(r => r.rights_status !== 'granted').length;
  if (blockedPhotos) rightsWarnings.push(`${blockedPhotos} ảnh chưa có quyền sử dụng — không tính, không hiển thị`);
  if (blockedReviews) rightsWarnings.push(`${blockedReviews} đánh giá chưa có quyền sử dụng — không tính, không hiển thị`);

  if (photos.length < localityConfig.minPhotos) reasons.push('photos_below_min');
  if (reviews.length < localityConfig.minReviews) reasons.push('reviews_below_min');

  const unique = [...new Set(reasons)];
  return {
    passed: unique.length === 0,
    is_cafe: cat.is_cafe,
    category_verified: cat.verified,
    usable_photos: photos.length,
    usable_reviews: reviews.length,
    thresholds: { photos: localityConfig.minPhotos, reviews: localityConfig.minReviews },
    reasons: unique,
    rights_warnings: [...new Set(rightsWarnings)],
    evaluated_at: nowIso()
  };
}
