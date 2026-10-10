export interface RawPhoto {
  url: string;
  attribution?: string;
}

export interface RawReview {
  rating?: number;
  text?: string;
  date?: string;
  language?: string;
  author?: string;
}

/** What every source adapter returns — before rights, quality and dedupe checks. */
export interface RawCandidate {
  source_ref?: string;
  /** Per-candidate origin (file imports can mix origins). Falls back to AdapterResult.origin. */
  origin?: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  categories: string[];
  phone?: string;
  website?: string;
  opening_hours?: string;
  rating_avg?: number;
  photos?: RawPhoto[];
  reviews?: RawReview[];
}

export interface AdapterJob {
  cell_id: string;
  bounds: { south: number; west: number; north: number; east: number };
  center: { lat: number; lng: number };
  keyword: string;
}

export interface AdapterResult {
  candidates: RawCandidate[];
  /** Where the data actually comes from (for file imports / GPM). Used for rights checks. */
  origin?: string;
}

export interface AdapterStatus {
  enabled: boolean;
  reason?: string;
}

export interface SourceAdapter {
  id: string;
  label: string;
  status(): AdapterStatus;
  fetch(job: AdapterJob, signal: AbortSignal): Promise<AdapterResult>;
}
