/**
 * Releasing holds that nobody turned up for.
 *
 * A confirmed booking is not a permanent claim on a table, it is priority inside a
 * window. When the window closes with no check-in, the table goes back to the floor.
 *
 * The one thing this module deliberately does NOT do is decide whose fault it was.
 * The system can only observe one signal — whether the shop pressed check-in — and
 * silence has two opposite causes: the customer never came, or the customer came and
 * the staff were too busy to press anything. Releasing the table is safe under both
 * readings (worst case a free table is sold again). Blaming the customer is not, so
 * `no_show_count` is only raised when a human at the shop says so, never by this
 * sweeper.
 */

import { BookingRecord, db } from './db';
import { publish, topics } from './realtime';
import { notify, notifyShopStaff } from './notifications';
import { shopClock } from './clock';
import { holdExpiresAtMin, timeToMinutes } from '../../shared/booking';

const SWEEP_INTERVAL_MS = Number(process.env.NO_SHOW_SWEEP_INTERVAL_MS || 120_000);

/**
 * Bookings older than this are swept without notifying anyone. After downtime the
 * first sweep can find a whole backlog at once, and firing a notification for each
 * would land as a burst of stale alarms.
 */
const SILENT_AFTER_MIN = 180;

function graceOf(booking: BookingRecord): number | undefined {
  return db.getShopById(booking.shop_id)?.bookingSettings?.noShowGraceMin;
}

/** Whole days from a booking's date to the shop's today. Both are plain YYYY-MM-DD. */
function daysUntilToday(bookingDate: string, today: string): number {
  const from = Date.parse(`${bookingDate}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

/** Minutes between a booking's hold expiry and the shop's clock. Negative = still held. */
export function minutesPastHold(booking: BookingRecord, clock = shopClock()): number {
  const days = daysUntilToday(booking.date, clock.today);
  // A booking for a later day has not started its window yet.
  if (days < 0) return -Infinity;
  const expiresAt = holdExpiresAtMin(booking, graceOf(booking));
  return days * 24 * 60 + timeToMinutes(clock.now) - expiresAt;
}

function releaseTable(booking: BookingRecord): void {
  if (!booking.table_id) return;
  const table = db.updateTable(booking.shop_id, booking.table_id, {
    operational_status: 'available',
    status: 'empty'
  });
  if (table) publish([topics.shop(booking.shop_id)], 'table', { action: 'updated', table });
}

/** Mark one confirmed booking as a no-show and free its table. Used by the sweeper and by the shop. */
export function recordNoShow(
  booking: BookingRecord,
  by: 'shop' | 'system',
  note?: string
): BookingRecord | null {
  const updated = db.setBookingStatus(booking.id, 'no_show', by, note);
  if (!updated) return null;
  db.updateBooking(updated.id, { no_show_at: new Date().toISOString() });
  releaseTable(updated);

  const fresh = db.getBookingById(updated.id) || updated;
  publish([topics.shop(fresh.shop_id)], 'booking', { action: 'updated', booking: fresh });
  publish([topics.user(fresh.user_id)], 'booking', { action: 'updated', booking: fresh });
  publish([topics.availability(fresh.shop_id)], 'availability', { shop_id: fresh.shop_id, date: fresh.date });
  return fresh;
}

/**
 * One pass over every confirmed booking whose hold has expired.
 * Returns the bookings it released, so tests and the admin view can see the effect.
 */
export function releaseExpiredHolds(): BookingRecord[] {
  const clock = shopClock();
  const expired = db.getRawDb().bookings.filter(
    b => b.status === 'confirmed' && minutesPastHold(b, clock) >= 0
  );

  const released: BookingRecord[] = [];
  for (const booking of expired) {
    const late = minutesPastHold(booking, clock);
    const updated = recordNoShow(booking, 'system', 'Hết thời gian giữ bàn, hệ thống tự nhả bàn');
    if (!updated) continue;
    released.push(updated);

    // A backlog cleared after downtime is swept quietly; nobody needs an alarm about
    // a table that stopped mattering hours ago.
    if (late <= SILENT_AFTER_MIN) {
      notify({
        user_id: updated.user_id,
        shop_id: updated.shop_id,
        type: 'booking',
        title: 'Bàn của bạn đã được nhả',
        message: `Quá giờ hẹn ở ${updated.shop_name} mà chưa thấy bạn nhận bàn, nên bàn đã được mở lại cho khách khác. Bạn vẫn đặt lại được nếu còn chỗ.`
      });
      notifyShopStaff(updated.shop_id, {
        type: 'booking',
        title: 'Bàn được nhả tự động',
        message: `${updated.user_name} chưa nhận bàn lúc ${updated.time}. Bàn đã mở lại. Nếu khách thật ra có đến, bấm "Khách có đến" để gỡ.`
      });
    }
  }
  return released;
}

/**
 * Reliability, recorded but not yet enforced.
 *
 * Phase one deliberately imposes no penalty: with no real traffic yet, blocking
 * customers would cost more than the missed tables do. The shop simply gets to see
 * the history when a request comes in and decides for itself.
 */
export const RELIABILITY_WINDOW_DAYS = 90;

export function countNoShowAgainstCustomer(userId: string, bookingId = '', shopId = ''): void {
  const user = db.findUserById(userId);
  if (!user) return;
  const history = [...(user.no_show_history || []), { booking_id: bookingId, shop_id: shopId, at: new Date().toISOString() }];
  db.updateUser(userId, { no_show_history: history } as any);
}

/** Undo the most recent mark, used when a shop says it recorded one by mistake. */
export function releaseNoShowMark(userId: string, bookingId = ''): void {
  const user = db.findUserById(userId);
  if (!user?.no_show_history?.length) return;
  const history = [...user.no_show_history];
  const idx = bookingId
    ? history.map(h => h.booking_id).lastIndexOf(bookingId)
    : history.length - 1;
  if (idx === -1) return;
  history.splice(idx, 1);
  db.updateUser(userId, { no_show_history: history } as any);
}

/** What a shop sees about a customer when a booking request arrives. */
export function reliabilityOf(userId: string): { noShows: number; completed: number; windowDays: number } {
  const since = Date.now() - RELIABILITY_WINDOW_DAYS * 86_400_000;
  const user = db.findUserById(userId);
  const noShows = (user?.no_show_history || []).filter(h => Date.parse(h.at) >= since).length;
  const completed = db.getRawDb().bookings.filter(
    b => b.user_id === userId && b.status === 'completed' && Date.parse(b.updated_at || b.created_at) >= since
  ).length;
  return { noShows, completed, windowDays: RELIABILITY_WINDOW_DAYS };
}

let timer: NodeJS.Timeout | null = null;

export function startNoShowSweeper(): void {
  if (timer) return;
  const run = () => {
    try {
      const released = releaseExpiredHolds();
      if (released.length) console.log(`[noShow] đã nhả ${released.length} bàn quá giờ giữ`);
    } catch (err) {
      console.error('[noShow] lần quét thất bại:', err);
    }
  };
  run();
  timer = setInterval(run, SWEEP_INTERVAL_MS);
  // Never hold the process open just for the sweeper.
  timer.unref?.();
}

export function stopNoShowSweeper(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
