/**
 * Booking domain types & helpers shared by the backend, the customer app and the shop app.
 * Keeping these in one place guarantees both apps agree on statuses and on how a
 * table/time slot is considered "taken".
 */

export type AccountType = 'customer' | 'shop';

export type BookingStatus =
  | 'pending'    // customer sent the request, waiting for the shop
  | 'confirmed'  // shop accepted
  | 'arrived'    // customer checked in at the shop
  | 'completed'  // visit finished
  | 'cancelled'  // cancelled by customer or shop
  | 'rejected';  // shop declined the request

/** Statuses that hold a table for the given time slot. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'arrived'];

export function isActiveBooking(status: BookingStatus | string): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(status as BookingStatus);
}

/** Allowed status transitions performed by the shop. */
export const SHOP_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['arrived', 'cancelled'],
  arrived: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
};

/**
 * `arrived` is reachable only by scanning (or typing) the guest's booking code at the
 * check-in endpoint, never through the generic status endpoint — the server enforces this,
 * so a shop cannot mark a guest present without the code the guest actually holds.
 */
export const SCAN_ONLY_TRANSITIONS: BookingStatus[] = ['arrived'];

/** Only a confirmed booking can be checked in. */
export const CHECK_IN_FROM_STATUS: BookingStatus = 'confirmed';

/** The guest is physically at the shop: a real check-in has happened. */
export const CHECKED_IN_STATUSES: BookingStatus[] = ['arrived', 'completed'];

export function hasCheckedIn(status: BookingStatus | string): boolean {
  return CHECKED_IN_STATUSES.includes(status as BookingStatus);
}

// ==================== Check-in QR contract ====================

/**
 * The exact text a booking ticket QR encodes and the shop scanner decodes.
 * Customer ticket and shop scanner both go through the helpers below so the two
 * can never drift apart.
 */
export const BOOKING_QR_PREFIX = 'MOBLER-BOOKING:';

/** Payload for the QR printed on the customer's ticket. */
export function bookingQrPayload(bookingId: string): string {
  return `${BOOKING_QR_PREFIX}${String(bookingId || '').trim().toUpperCase()}`;
}

/** A booking code is uppercase alphanumeric with dashes — see generateBookingId on the server. */
const BOOKING_CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{2,63}$/;

/**
 * Extract the booking code from a scanned QR payload or a manually typed code.
 * Accepts the full `MOBLER-BOOKING:<id>` payload or a bare code, and returns null for
 * anything that cannot be a booking code at all (URLs, other apps' QRs, empty input).
 * Whether the code names a real booking is decided by the server, never here.
 */
export function parseBookingQr(raw: string): string | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const withPrefix = /^MOBLER-BOOKING:(.+)$/i.exec(trimmed);
  const code = (withPrefix ? withPrefix[1] : trimmed).trim().toUpperCase();
  return BOOKING_CODE_REGEX.test(code) ? code : null;
}

export const BOOKING_STATUS_LABEL_VI: Record<BookingStatus, string> = {
  pending: 'Chờ quán xác nhận',
  confirmed: 'Đã xác nhận',
  arrived: 'Đã nhận bàn',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  rejected: 'Quán từ chối',
};

export type TableOperationalStatus = 'available' | 'occupied' | 'reserved' | 'locked';

export interface BookingDTO {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_address: string;
  shop_image: string;
  shop_phone?: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  user_avatar?: string;
  table_id?: string;
  table_name?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24h) */
  time: string;
  guests: number;
  status: BookingStatus;
  note?: string;
  shop_note?: string;
  order?: {
    items: { name: string; quantity: number; price: number; options?: string; image?: string }[];
    subtotal?: number;
    total: number;
  };
  voucher_applied?: { code: string; discount: number; label?: string };
  payment_method?: string;
  payment_status?: string;
  deposit_fee?: number;
  discount_amount?: number;
  grand_total?: number;
  status_history?: { status: BookingStatus; at: string; by: AccountType | 'system'; note?: string }[];
  created_at: string;
  updated_at?: string;
}

export interface AvailabilityTable {
  id: string;            // table code inside the shop, e.g. "t1"
  name: string;
  seats: number;
  type: 'round' | 'rect' | 'sofa';
  photo: string;
  operational_status: TableOperationalStatus;
}

export interface AvailabilityResponse {
  shop_id: string;
  date: string;
  slot_duration_min: number;
  /** "today" and "now" in the shop's timezone, so clients can grey out past slots. */
  shop_today: string;
  shop_now: string;
  tables: AvailabilityTable[];
  /** Active bookings for the day — no personal data, only what is needed to compute availability. */
  reservations: { table_id: string; time: string }[];
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Two bookings on the same table clash when their start times are closer than the slot duration. */
export function slotsOverlap(a: string, b: string, durationMin: number): boolean {
  return Math.abs(timeToMinutes(a) - timeToMinutes(b)) < durationMin;
}

/**
 * Pure availability check used by both the server (authoritative) and the customer UI (preview).
 */
export function isTableFree(
  availability: Pick<AvailabilityResponse, 'tables' | 'reservations' | 'slot_duration_min' | 'shop_today' | 'shop_now' | 'date'>,
  tableId: string,
  time: string
): boolean {
  const table = availability.tables.find(t => t.id === tableId);
  if (!table) return false;
  if (table.operational_status === 'locked') return false;
  const isToday = availability.date === availability.shop_today;
  if (isToday) {
    // Past slots cannot be booked (15 minute grace).
    if (timeToMinutes(time) < timeToMinutes(availability.shop_now) - 15) return false;
    // A table that is physically occupied right now blocks slots starting within the slot duration.
    if (
      table.operational_status === 'occupied' &&
      timeToMinutes(time) - timeToMinutes(availability.shop_now) < availability.slot_duration_min
    ) {
      return false;
    }
  }
  return !availability.reservations.some(
    r => r.table_id === tableId && slotsOverlap(r.time, time, availability.slot_duration_min)
  );
}

export const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

export function normalizePhone(phone: string): string {
  return String(phone || '').replace(/[\s.\-()]/g, '');
}

/** Format YYYY-MM-DD as DD/MM/YYYY for display. */
export function formatDateVi(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Local calendar date as YYYY-MM-DD. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
