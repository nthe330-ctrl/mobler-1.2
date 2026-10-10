/**
 * Locality data — shared between backend, customer app and admin app.
 *
 * Privacy: the customer app converts GPS coordinates into a coarse grid cell
 * (~1.1 km) on the device and only sends the cell id to the server.
 */

/** Grid size in degrees. 0.01° ≈ 1.1 km of latitude. */
export const CELL_SIZE_DEG = 0.01;

export interface CellRef {
  id: string;        // e.g. "c1077_10670"
  latIdx: number;
  lngIdx: number;
}

export function cellForCoords(lat: number, lng: number): CellRef {
  const latIdx = Math.floor(lat / CELL_SIZE_DEG);
  const lngIdx = Math.floor(lng / CELL_SIZE_DEG);
  return { id: `c${latIdx}_${lngIdx}`, latIdx, lngIdx };
}

export function parseCellId(id: string): CellRef | null {
  const m = /^c(-?\d{1,6})_(-?\d{1,6})$/.exec(String(id || ''));
  if (!m) return null;
  const latIdx = Number(m[1]);
  const lngIdx = Number(m[2]);
  if (Math.abs(latIdx * CELL_SIZE_DEG) > 90 || Math.abs(lngIdx * CELL_SIZE_DEG) > 180) return null;
  return { id, latIdx, lngIdx };
}

export function cellBounds(cell: CellRef) {
  const south = cell.latIdx * CELL_SIZE_DEG;
  const west = cell.lngIdx * CELL_SIZE_DEG;
  return { south, west, north: south + CELL_SIZE_DEG, east: west + CELL_SIZE_DEG };
}

export function cellCenter(cell: CellRef) {
  const b = cellBounds(cell);
  return { lat: (b.south + b.north) / 2, lng: (b.west + b.east) / 2 };
}

/** The cell plus its 8 neighbours (a ~3.3 km square). */
export function neighbourhood(cell: CellRef, radius = 1): CellRef[] {
  const out: CellRef[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const latIdx = cell.latIdx + dy;
      const lngIdx = cell.lngIdx + dx;
      out.push({ id: `c${latIdx}_${lngIdx}`, latIdx, lngIdx });
    }
  }
  return out;
}

export type CoverageStatus =
  | 'complete'   // every cell scanned recently — results come only from the internal store
  | 'partial'    // some cells covered, others missing; an enrichment request may be queued
  | 'enriching'  // a request is queued/running/awaiting admin review
  | 'stale'      // data exists but is past its freshness window; refresh queued when allowed
  | 'empty';     // nothing internal yet

export const COVERAGE_LABEL_VI: Record<CoverageStatus, string> = {
  complete: 'Dữ liệu khu vực đầy đủ',
  partial: 'Mới có một phần dữ liệu khu vực',
  enriching: 'Đang bổ sung dữ liệu khu vực',
  stale: 'Dữ liệu khu vực đã cũ, đang chờ cập nhật',
  empty: 'Chưa có dữ liệu cho khu vực này'
};

export interface LocalityPhotoDTO {
  id: string;
  url: string;
  attribution?: string;
}

export interface LocalityReviewDTO {
  id: string;
  rating?: number;
  text?: string;
  date?: string;
  language?: string;
  author?: string;
  source: string;
}

export interface LocalityPlaceDTO {
  id: string;
  kind: 'partner' | 'locality';
  name: string;
  address: string;
  lat: number;
  lng: number;
  categories: string[];
  phone?: string;
  website?: string;
  opening_hours?: string;
  rating?: number;
  review_count: number;
  photos: LocalityPhotoDTO[];
  reviews: LocalityReviewDTO[];
  sources: { source: string; attribution?: string; fetched_at: string }[];
  updated_at: string;
  is_partner: boolean;
}

export interface LocalitySearchResponse {
  status: CoverageStatus;
  message: string;
  cell: string;
  cells_total: number;
  cells_fresh: number;
  cells_stale: number;
  places: LocalityPlaceDTO[];
  page: number;
  page_size: number;
  total: number;
  enrichment?: { request_id: string; state: string; queued_at: string; pending_review: number } | null;
  /** Server policy: may the client still use the paid Google search as a fallback? */
  allow_google_fallback: boolean;
  attributions: string[];
  cached: boolean;
}

/** Strip accents and punctuation so names compare reliably ("Cà Phê Mây" → "ca phe may"). */
export function normalizeText(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
