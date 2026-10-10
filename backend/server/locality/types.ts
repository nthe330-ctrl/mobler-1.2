export type RightsStatus = 'granted' | 'unverified' | 'denied';

export type PlaceStatus =
  | 'pending_review'   // passed the automatic quality gate, waiting for an admin
  | 'disqualified'     // failed the gate (not a café, <3 photos, <10 reviews, unclear category, missing rights)
  | 'published'        // approved; served to every user
  | 'rejected'         // an admin rejected it
  | 'unpublished';     // was published, taken down (admin or retention)

export interface SourceRef {
  source: string;          // adapter/source id, e.g. "osm", "mock_dev", "gpm:partner_sites"
  source_ref?: string;     // id inside that source (only stored when the source allows it)
  fetched_at: string;
  attribution?: string;
}

export interface PhotoRecord {
  id: string;
  url: string;
  source: string;
  rights_status: RightsStatus;
  attribution?: string;
  fetched_at: string;
  expires_at?: string;
  removed_by_admin?: boolean;
}

export interface ReviewRecord {
  id: string;
  /** Hash of source + author + text so the same review is never counted twice. */
  dedupe_hash: string;
  rating?: number;
  text?: string;
  date?: string;
  language?: string;
  author?: string;
  source: string;
  rights_status: RightsStatus;
  fetched_at: string;
  expires_at?: string;
  removed_by_admin?: boolean;
}

export interface QualityReport {
  passed: boolean;
  is_cafe: boolean;
  category_verified?: string;
  usable_photos: number;
  usable_reviews: number;
  thresholds: { photos: number; reviews: number };
  reasons: string[];
  /** Rights problems the admin should see. */
  rights_warnings: string[];
  evaluated_at: string;
}

export interface LocalityPlace {
  id: string;
  dedupe_key: string;
  status: PlaceStatus;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cell_id: string;
  categories: string[];
  phone?: string;
  website?: string;
  opening_hours?: string;
  rating_avg?: number;
  sources: SourceRef[];
  photos: PhotoRecord[];
  reviews: ReviewRecord[];
  quality: QualityReport;
  request_ids: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  /** Base data must be refreshed (or the place unpublished) after this. */
  expires_at?: string;
  admin_edits?: Record<string, unknown>;
}

export type RequestState = 'queued' | 'running' | 'awaiting_review' | 'completed' | 'failed' | 'cancelled';

export interface EnrichmentRequest {
  id: string;
  idempotency_key: string;
  cell_id: string;
  category: 'cafe';
  keyword: string;
  state: RequestState;
  trigger: 'user_search' | 'manual_refresh' | 'admin' | 'stale';
  requesters: { requester: string; at: string }[];
  request_count: number;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error?: string;
  sources_tried: string[];
  /** Sources not used for this job and why (disabled, quota, circuit open). */
  skipped_sources?: string[];
  result?: { candidates: number; cafes: number; passed: number; disqualified: number; merged: number; created: number };
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
}

export interface CellCoverage {
  cell_id: string;
  category: 'cafe';
  scanned_at: string;
  fresh_until: string;
  sources: string[];
  candidates_found: number;
}

export interface ModerationLog {
  id: string;
  place_id: string;
  action: 'approve' | 'reject' | 'edit' | 'unpublish' | 'remove_photo' | 'remove_review' | 'retention_expire' | 'reevaluate';
  admin_id: string;
  admin_name: string;
  at: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  note?: string;
  status_before?: PlaceStatus;
  status_after?: PlaceStatus;
}

export interface UsageDay {
  date: string;
  counters: Record<string, number>;
}

export interface LocalityData {
  version: number;
  places: LocalityPlace[];
  requests: EnrichmentRequest[];
  coverage: CellCoverage[];
  moderation: ModerationLog[];
  usage: UsageDay[];
}
