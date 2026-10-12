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
  | 'rejected'   // shop declined the request
  | 'no_show';   // grace window expired with no check-in, so the table was released

/** Statuses that hold a table for the given time slot. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'arrived'];

export function isActiveBooking(status: BookingStatus | string): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(status as BookingStatus);
}

/** Allowed status transitions performed by the shop. */
export const SHOP_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['arrived', 'cancelled', 'no_show'],
  arrived: ['completed'],
  completed: [],
  cancelled: [],
  // The shop can take a no-show back when it was recorded by mistake — the customer
  // did turn up and nobody pressed check-in. See NO_SHOW_REVERT_WINDOW_MIN.
  rejected: [],
  no_show: ['arrived', 'cancelled'],
};

export const BOOKING_STATUS_LABEL_VI: Record<BookingStatus, string> = {
  pending: 'Chờ quán xác nhận',
  confirmed: 'Đã xác nhận',
  arrived: 'Đã nhận bàn',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  rejected: 'Quán từ chối',
  no_show: 'Khách không đến',
};

/**
 * How long a confirmed booking keeps its table after the agreed time before the
 * system releases it. The shop may narrow or widen this inside the bounds below,
 * and peak hours use the shorter window because tables are scarcest then.
 */
export const NO_SHOW_GRACE_DEFAULT_MIN = 20;
export const NO_SHOW_GRACE_PEAK_MIN = 15;
export const NO_SHOW_GRACE_MIN_BOUND = 10;
export const NO_SHOW_GRACE_MAX_BOUND = 45;

/** Hours (shop local time) where tables are scarcest, so the grace window shortens. */
export const PEAK_HOURS: number[] = [8, 9, 19, 20];

/** How long before the agreed time the one reminder goes out. */
export const REMINDER_LEAD_MIN = 30;

/** A customer may push the deadline out once per booking by this many minutes. */
export const RUNNING_LATE_EXTENSION_MIN = 15;

/** A shop can undo a no-show it recorded by mistake for this long afterwards. */
export const NO_SHOW_REVERT_WINDOW_MIN = 24 * 60;

/**
 * The moment a confirmed booking stops holding its table, as minutes from midnight
 * on its own date. Callers compare it against the shop's local clock, never the
 * server's or the customer's — a booking is made in the shop's timezone.
 */
export function holdExpiresAtMin(
  booking: Pick<BookingDTO, 'time' | 'late_extension_min'>,
  shopGraceMin?: number
): number {
  return timeToMinutes(booking.time)
    + graceWindowMin(booking.time, shopGraceMin)
    + (booking.late_extension_min || 0);
}

/** The grace window that applies to one booking, in minutes. */
export function graceWindowMin(time: string, shopGraceMin?: number): number {
  const configured = Number.isFinite(shopGraceMin)
    ? Math.min(NO_SHOW_GRACE_MAX_BOUND, Math.max(NO_SHOW_GRACE_MIN_BOUND, Number(shopGraceMin)))
    : NO_SHOW_GRACE_DEFAULT_MIN;
  const hour = Math.floor(timeToMinutes(time) / 60);
  return PEAK_HOURS.includes(hour) ? Math.min(configured, NO_SHOW_GRACE_PEAK_MIN) : configured;
}

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
  /** Minutes the customer pushed the hold out with "I'm on my way". Granted once. */
  late_extension_min?: number;
  /** When the hold was released as a no-show, so the shop's undo window can be checked. */
  no_show_at?: string;
  /** When the "your table is soon" reminder went out, so it is sent exactly once. */
  reminded_at?: string;
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
