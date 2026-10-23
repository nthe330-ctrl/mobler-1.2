/**
 * End-to-end check of the booking → QR check-in → review → mission-progress flow.
 *
 *   npm run test:checkin
 *
 * Runs the real core routes against a throwaway data directory, so the repository's
 * backend/data/database.json is never read or written.
 *
 * What it pins down:
 *  - a guest's request reaches the shop dashboard, and the shop's confirmation reaches the guest;
 *  - the ticket QR encodes exactly what the scanner decodes;
 *  - `arrived` is reachable ONLY by posting the guest's code to the check-in route — the
 *    generic status route refuses it, so no client-side check can be bypassed;
 *  - check-in rejects a bad code, another shop's code, a customer or anonymous caller,
 *    and bookings that are pending / cancelled / rejected / already arrived;
 *  - a review requires one of the guest's own checked-in bookings at that very shop;
 *  - mission progress moves at check-in, and never moves twice for the same visit —
 *    not on a re-scan, not on a reload, not when the shop later marks the visit complete;
 *  - a visit that does not meet a mission's criteria does not advance it.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';

const PORT = 3996;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-checkin-'));

// The database module resolves DATA_DIR at import time — set the environment first, then
// pull the server in dynamically so this suite can never touch the repository's own data.
process.env.DATA_DIR = dataDir;
process.env.JWT_SECRET = 'checkin-e2e';
process.env.NODE_ENV = 'test';
process.env.LOCALITY_WORKER_ENABLED = 'false';

const express = (await import('express')).default;
const { registerCoreRoutes } = await import('../server/coreRoutes');
const { bookingQrPayload, parseBookingQr, BOOKING_QR_PREFIX } = await import('../../shared/booking');

let passed = 0;
let failed = 0;
function check(name: string, cond: unknown, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`, extra ?? '');
  }
}

async function call(method: string, url: string, body?: unknown, token?: string) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as any };
}

/** Minimal SSE client collecting events. */
function openStream(query: string) {
  const events: { event: string; data: any }[] = [];
  const controller = new AbortController();
  const ready = (async () => {
    const res = await fetch(`${BASE}/realtime/stream?${query}`, { signal: controller.signal });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const ev = /^event: (.*)$/m.exec(chunk)?.[1];
            const data = /^data: (.*)$/m.exec(chunk)?.[1];
            if (ev) events.push({ event: ev, data: data ? JSON.parse(data) : null });
          }
        }
      } catch {
        // aborted
      }
    })();
  })();
  const waitFor = async (pred: (e: { event: string; data: any }) => boolean, ms = 3000) => {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const hit = events.find(pred);
      if (hit) return hit;
      await new Promise(r => setTimeout(r, 25));
    }
    return null;
  };
  return { events, ready, waitFor, close: () => controller.abort() };
}

function isoInDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

/** Book, then have the owning shop confirm — the state a check-in starts from. */
async function bookConfirmed(
  custToken: string,
  shopToken: string,
  shopId: string,
  opts: { date: string; time: string; table_id: string; guests?: number }
) {
  const created = await call('POST', '/bookings', { shop_id: shopId, guests: 2, ...opts }, custToken);
  const id = created.data.booking?.id;
  await call('PUT', `/merchant/bookings/${id}/status`, { status: 'confirmed' }, shopToken);
  return id as string;
}

const stat = (x: any, k: string) => x.data.stats?.[k];
const mission = (x: any, id: string) => x.data.achievements?.find((a: any) => a.id === id);

async function main() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.get('/api/health', (_req: any, res: any) => res.json({ ok: true }));
  registerCoreRoutes(app);
  const server: Server = await new Promise(resolve => {
    const s = app.listen(PORT, () => resolve(s));
  });

  try {
    console.log('\nAccounts and shops');
    const cust = await call('POST', '/customer/auth/register', { name: 'Khách Check-in', phone: '0903000001', password: 'secret1' });
    const T = cust.data.token;
    check('customer registers', cust.status === 201 && !!T, cust.data);
    const other = await call('POST', '/customer/auth/register', { name: 'Khách Khác', phone: '0903000002', password: 'secret2' });
    const T2 = other.data.token;
    const revenueCustomer = await call('POST', '/customer/auth/register', { name: 'Khách Thanh Toán', phone: '0903000003', password: 'secret3' });
    const T3 = revenueCustomer.data.token;

    const shop1 = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Một', phone: '0903000091', email: 'one@shop.vn', password: 'shoppass',
      shop: { name: 'Quán Một', address: '12 Lê Lợi, Bến Nghé, Quận 1, TP.HCM' }
    });
    const S1 = shop1.data.token;
    const shopId = shop1.data.shop.id;
    const shop2 = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Hai', phone: '0903000092', email: 'two@shop.vn', password: 'shoppass',
      shop: { name: 'Quán Hai', address: '30 Nguyễn Huệ, Quận 3, TP.HCM' }
    });
    const S2 = shop2.data.token;
    const shop2Id = shop2.data.shop.id;
    check('two independent shops registered', shop1.status === 201 && shop2.status === 201 && shopId !== shop2Id);

    const custTicket = await call('POST', '/realtime/ticket', undefined, T);
    const custStream = openStream(`ticket=${custTicket.data.ticket}`);
    const shopTicket = await call('POST', '/realtime/ticket', undefined, S1);
    const shopStream = openStream(`ticket=${shopTicket.data.ticket}`);
    await Promise.all([custStream.ready, shopStream.ready]);

    // ============================================================ 1. guest books
    console.log('\n1. Guest books a table; the request reaches the shop dashboard');
    const date = isoInDays(2);
    const created = await call('POST', '/bookings', { shop_id: shopId, date, time: '19:00', guests: 4, table_id: 't3', note: 'Gần cửa sổ' }, T);
    const bookingId = created.data.booking?.id;
    check('booking created as pending', created.status === 201 && created.data.booking.status === 'pending', created.data);
    check('booking appears in the guest history', (await call('GET', '/me/bookings', undefined, T)).data.bookings.some((b: any) => b.id === bookingId));
    const dash = await call('GET', `/merchant/shops/${shopId}/bookings?date=${date}`, undefined, S1);
    const onDash = dash.data.bookings.find((b: any) => b.id === bookingId);
    check('request is on the shop dashboard', !!onDash, dash.data);
    check('dashboard shows the requested time, guests and table', onDash?.time === '19:00' && onDash?.guests === 4 && onDash?.table_id === 't3', onDash);
    check('shop is pushed the new booking live', !!(await shopStream.waitFor(e => e.event === 'booking' && e.data.booking?.id === bookingId && e.data.action === 'created')));

    // ============================================================ 2. shop confirms
    console.log('\n2. Shop confirms; the guest sees it confirmed');
    const confirm = await call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'confirmed' }, S1);
    check('shop confirms the request', confirm.status === 200 && confirm.data.booking.status === 'confirmed', confirm.data);
    check('guest is pushed the confirmation live', !!(await custStream.waitFor(e => e.event === 'booking' && e.data.booking?.id === bookingId && e.data.booking?.status === 'confirmed')));
    const afterConfirm = (await call('GET', '/me/bookings', undefined, T)).data.bookings.find((b: any) => b.id === bookingId);
    check('guest history reads confirmed', afterConfirm?.status === 'confirmed', afterConfirm);
    check('time, guests and table are unchanged by confirmation', afterConfirm?.time === '19:00' && afterConfirm?.guests === 4 && afterConfirm?.table_id === 't3', afterConfirm);

    // ============================================================ Revenue is recognized only after shop settlement
    console.log('\n2b. Pre-orders reach the shop, but revenue waits for actual payment');
    const revenueDate = isoInDays(3);
    const revenueBooking = await call('POST', '/bookings', {
      shop_id: shopId, date: revenueDate, time: '18:00', guests: 2, table_id: 't1', payment_method: 'at_store',
      order: { items: [{ name: 'Món kiểm thử', quantity: 1, price: 12000 }], subtotal: 12000, total: 12000 }
    }, T3);
    const revenueBookingId = revenueBooking.data.booking?.id;
    const revenueDash = await call('GET', `/merchant/shops/${shopId}/bookings?date=${revenueDate}`, undefined, S1);
    const preOrderOnShop = revenueDash.data.bookings.find((b: any) => b.id === revenueBookingId);
    const insightsBeforePayment = await call('GET', `/merchant/shops/${shopId}/insights`, undefined, S1);
    check('shop dashboard receives the booking and its pre-order', !!preOrderOnShop?.order?.items?.length, preOrderOnShop);
    check('unpaid pre-order is excluded from revenue', insightsBeforePayment.data.totals?.revenue === 0, insightsBeforePayment.data.totals);
    await call('PUT', `/merchant/bookings/${revenueBookingId}/status`, { status: 'confirmed' }, S1);
    const confirmedRevenueScan = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(revenueBookingId) }, S1);
    const paymentReceipt = await call('PUT', `/merchant/bookings/${revenueBookingId}/payment`, {}, S1);
    const insightsAfterPayment = await call('GET', `/merchant/shops/${shopId}/insights`, undefined, S1);
    check('shop must check in the guest before recording collected money', confirmedRevenueScan.status === 200, confirmedRevenueScan.data);
    check('shop can confirm actual payment for the pre-order', paymentReceipt.status === 200 && paymentReceipt.data.order?.payment_status === 'paid', paymentReceipt.data);
    check('paid pre-order is counted once as revenue', insightsAfterPayment.data.totals?.revenue === 12000, insightsAfterPayment.data.totals);
    const repeatPayment = await call('PUT', `/merchant/bookings/${revenueBookingId}/payment`, {}, S1);
    const insightsAfterRepeat = await call('GET', `/merchant/shops/${shopId}/insights`, undefined, S1);
    check('repeating payment confirmation is idempotent', repeatPayment.status === 200 && repeatPayment.data.already_paid === true && insightsAfterRepeat.data.totals?.revenue === 12000, repeatPayment.data);

    // ============================================================ 3. the ticket QR
    console.log('\n3. The ticket QR carries exactly what the scanner decodes');
    check('QR payload is MOBLER-BOOKING:<id>', bookingQrPayload(bookingId) === `${BOOKING_QR_PREFIX}${bookingId}`, bookingQrPayload(bookingId));
    check('scanner decodes the ticket payload back to the code', parseBookingQr(bookingQrPayload(bookingId)) === bookingId);
    check('a bare code typed by hand decodes too', parseBookingQr(bookingId) === bookingId);
    check('lower-case manual entry is normalised', parseBookingQr(bookingId.toLowerCase()) === bookingId);
    check('another app’s QR is not a booking code', parseBookingQr('https://example.com/pay?x=1') === null);
    check('empty input is not a booking code', parseBookingQr('   ') === null);

    // ============================================================ 4. check-in
    console.log('\n4. Check-in is validated by the server, not the scanner');
    const noAuth = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bookingId) });
    check('anonymous scan refused (401)', noAuth.status === 401, noAuth.data);
    const asCustomer = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bookingId) }, T);
    check('a customer account cannot check anyone in (403)', asCustomer.status === 403 && asCustomer.data.code === 'WRONG_ACCOUNT_TYPE', asCustomer.data);
    const wrongShop = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bookingId) }, S2);
    check('another shop cannot check in this booking (404)', wrongShop.status === 404 && wrongShop.data.code === 'CHECKIN_CODE_INVALID', wrongShop.data);
    check('the refusal leaks nothing about the booking', !JSON.stringify(wrongShop.data).includes('0903000001') && !wrongShop.data.booking, wrongShop.data);
    const garbage = await call('POST', '/merchant/bookings/check-in', { code: 'https://evil.example/qr' }, S1);
    check('a malformed code is refused (400)', garbage.status === 400 && garbage.data.code === 'CHECKIN_CODE_INVALID', garbage.data);
    const unknown = await call('POST', '/merchant/bookings/check-in', { code: 'MOBLER-BOOKING:BK-ZZZZZZ' }, S1);
    check('a well-formed but unknown code is refused (404)', unknown.status === 404 && unknown.data.code === 'CHECKIN_CODE_INVALID', unknown.data);

    const pendingId = (await call('POST', '/bookings', { shop_id: shopId, date, time: '20:00', guests: 2, table_id: 't4' }, T)).data.booking.id;
    const pendingScan = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(pendingId) }, S1);
    check('an unconfirmed booking cannot be checked in (409)', pendingScan.status === 409 && pendingScan.data.code === 'CHECKIN_NOT_CONFIRMED', pendingScan.data);

    const cancelledId = await bookConfirmed(T, S1, shopId, { date, time: '20:30', table_id: 't5' });
    await call('PUT', `/bookings/${cancelledId}/cancel`, {}, T);
    const cancelledScan = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(cancelledId) }, S1);
    check('a cancelled booking cannot be checked in (409)', cancelledScan.status === 409 && cancelledScan.data.code === 'CHECKIN_INVALID_STATUS', cancelledScan.data);

    const rejectedId = (await call('POST', '/bookings', { shop_id: shopId, date, time: '21:00', guests: 2, table_id: 't6' }, T)).data.booking.id;
    await call('PUT', `/merchant/bookings/${rejectedId}/status`, { status: 'rejected' }, S1);
    const rejectedScan = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(rejectedId) }, S1);
    check('a rejected booking cannot be checked in (409)', rejectedScan.status === 409 && rejectedScan.data.code === 'CHECKIN_INVALID_STATUS', rejectedScan.data);

    const mismatch = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bookingId), expected_booking_id: pendingId }, S1);
    check('a code for a different card is refused (409)', mismatch.status === 409 && mismatch.data.code === 'CHECKIN_CODE_MISMATCH', mismatch.data);

    console.log('\n   the shop cannot set "arrived" without the guest’s code');
    const sneak = await call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'arrived' }, S1);
    check('generic status route refuses arrived (403)', sneak.status === 403 && sneak.data.code === 'CHECKIN_REQUIRES_SCAN', sneak.data);
    const stillConfirmed = (await call('GET', '/me/bookings', undefined, T)).data.bookings.find((b: any) => b.id === bookingId);
    check('the booking really stayed confirmed', stillConfirmed?.status === 'confirmed', stillConfirmed);

    console.log('\n   a real scan checks the guest in');
    const scan = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bookingId), expected_booking_id: bookingId }, S1);
    check('scanning the ticket checks the guest in', scan.status === 200 && scan.data.booking.status === 'arrived', scan.data);
    check('guest is pushed the arrival live', !!(await custStream.waitFor(e => e.event === 'booking' && e.data.booking?.id === bookingId && e.data.booking?.status === 'arrived')));
    check('shop dashboard is pushed the arrival live', !!(await shopStream.waitFor(e => e.event === 'booking' && e.data.booking?.id === bookingId && e.data.booking?.status === 'arrived')));
    check('guest is pushed fresh mission progress live', !!(await custStream.waitFor(e => e.event === 'achievement')));
    const histArrived = scan.data.booking.status_history?.filter((h: any) => h.status === 'arrived') || [];
    check('check-in is recorded once in the history', histArrived.length === 1, histArrived);

    console.log('\n   the state survives a reload and agrees on both sides');
    const guestAfter = (await call('GET', '/me/bookings', undefined, T)).data.bookings.find((b: any) => b.id === bookingId);
    const shopAfter = (await call('GET', `/merchant/shops/${shopId}/bookings?date=${date}`, undefined, S1)).data.bookings.find((b: any) => b.id === bookingId);
    check('guest view reads arrived after reload', guestAfter?.status === 'arrived', guestAfter);
    check('shop view reads arrived after reload', shopAfter?.status === 'arrived', shopAfter);
    check('both sides agree on time, guests and table', guestAfter?.time === shopAfter?.time && guestAfter?.guests === shopAfter?.guests && guestAfter?.table_id === shopAfter?.table_id);
    const tables = await call('GET', `/merchant/shops/${shopId}/tables?date=${date}`, undefined, S1);
    check('the table is marked occupied', tables.data.tables.find((t: any) => t.id === 't3')?.operational_status === 'occupied', tables.data.tables.find((t: any) => t.id === 't3'));

    console.log('\n   scanning the same ticket again changes nothing');
    const rescan = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bookingId) }, S1);
    check('a second scan is refused as already checked in (409)', rescan.status === 409 && rescan.data.code === 'CHECKIN_ALREADY_DONE', rescan.data);
    check('the second scan reports the existing check-in', rescan.data.already_checked_in === true && rescan.data.booking?.status === 'arrived', rescan.data);
    const histAfterRescan = (await call('GET', '/me/bookings', undefined, T)).data.bookings
      .find((b: any) => b.id === bookingId)?.status_history?.filter((h: any) => h.status === 'arrived') || [];
    check('no second check-in was written to the history', histAfterRescan.length === 1, histAfterRescan);

    // ============================================================ 5. reviews
    console.log('\n5. Only a checked-in guest may review, and only their own shop');
    const strangerReview = await call('POST', `/shops/${shopId}/reviews`, { content: 'Chưa từng tới' }, T2);
    check('a guest who never checked in cannot review (403)', strangerReview.status === 403 && strangerReview.data.code === 'REVIEW_REQUIRES_CHECKIN', strangerReview.data);
    const wrongShopReview = await call('POST', `/shops/${shop2Id}/reviews`, { content: 'Quán khác' }, T);
    check('a checked-in guest cannot review a different shop (403)', wrongShopReview.status === 403 && wrongShopReview.data.code === 'REVIEW_REQUIRES_CHECKIN', wrongShopReview.data);
    const anonReview = await call('POST', `/shops/${shopId}/reviews`, { content: 'Ẩn danh' });
    check('an anonymous review is refused (401)', anonReview.status === 401, anonReview.data);
    const shopReview = await call('POST', `/shops/${shopId}/reviews`, { content: 'Tự đánh giá' }, S1);
    check('a shop account cannot post a customer review (403)', shopReview.status === 403, shopReview.data);
    const review = await call('POST', `/shops/${shopId}/reviews`, { content: 'Quán rất đẹp', images: ['https://example.com/1.jpg'] }, T);
    check('the checked-in guest can review the shop', review.status === 201, review.data);
    check('the review is tied to the check-in that earned it', review.data.review?.booking_id === bookingId, review.data.review);
    check('the review shows up on the shop page', (await call('GET', `/shops/${shopId}`)).data.reviews.some((r: any) => r.id === review.data.review.id));
    // One review per visit — otherwise one guest could move the shop's rating at will,
    // since every review recomputes it.
    const again = await call('POST', `/shops/${shopId}/reviews`, { content: 'lần hai' }, T);
    check('the same visit cannot be reviewed twice', again.status === 409 && again.data.code === 'REVIEW_ALREADY_SUBMITTED', again.data);
    const ratingBefore = (await call('GET', `/shops/${shopId}`)).data.shop.reviewCount;
    await call('POST', `/shops/${shopId}/reviews`, { content: 'lần ba' }, T);
    check('a refused review does not change the shop rating count',
      (await call('GET', `/shops/${shopId}`)).data.shop.reviewCount === ratingBefore, { before: ratingBefore });

    // ============================================================ 6. mission progress
    console.log('\n6. Mission progress moves at check-in, exactly once');
    const nightId = await bookConfirmed(T, S1, shopId, { date, time: '23:00', table_id: 't7' });
    const beforeNight = await call('GET', '/me/achievements', undefined, T);
    check('a confirmed-but-not-arrived visit has not counted yet', stat(beforeNight, 'night_bookings') === 0, beforeNight.data.stats);
    check('the night mission is still locked', !mission(beforeNight, 'ach-8')?.achieved, mission(beforeNight, 'ach-8'));

    const nightScan = await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(nightId) }, S1);
    check('the night visit checks in', nightScan.status === 200, nightScan.data);
    const afterNight = await call('GET', '/me/achievements', undefined, T);
    check('progress counted at check-in, without waiting for "Hoàn tất"', stat(afterNight, 'night_bookings') === 1, afterNight.data.stats);
    check('the night mission unlocked at check-in', mission(afterNight, 'ach-8')?.achieved, mission(afterNight, 'ach-8'));
    const rewardsOnce = await call('GET', '/me/rewards', undefined, T);
    const nightPoints = rewardsOnce.data.points;
    const nightVouchers = rewardsOnce.data.vouchers.filter((v: any) => v.achievement_id === 'ach-8').length;
    check('its reward was granted', nightPoints > 0 && nightVouchers === 1, rewardsOnce.data);

    console.log('\n   re-scanning, reloading and completing do not pay twice');
    await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(nightId) }, S1);
    await call('GET', '/me/achievements', undefined, T);
    await call('GET', '/me/achievements', undefined, T);
    const afterRescan = await call('GET', '/me/rewards', undefined, T);
    check('a re-scan adds no points or vouchers', afterRescan.data.points === nightPoints && afterRescan.data.vouchers.filter((v: any) => v.achievement_id === 'ach-8').length === 1, afterRescan.data);
    const reloaded = await call('GET', '/me/achievements', undefined, T);
    check('reloading does not inflate progress', stat(reloaded, 'night_bookings') === 1 && stat(reloaded, 'shops_visited') === 1, reloaded.data.stats);

    const complete = await call('PUT', `/merchant/bookings/${nightId}/status`, { status: 'completed' }, S1);
    check('the shop can still finish the visit after check-in', complete.status === 200 && complete.data.booking.status === 'completed', complete.data);
    const afterComplete = await call('GET', '/me/achievements', undefined, T);
    check('finishing the visit does not count it a second time', stat(afterComplete, 'night_bookings') === 1 && stat(afterComplete, 'shops_visited') === 1, afterComplete.data.stats);
    const rewardsFinal = await call('GET', '/me/rewards', undefined, T);
    check('finishing the visit pays no second reward', rewardsFinal.data.points === nightPoints && rewardsFinal.data.vouchers.filter((v: any) => v.achievement_id === 'ach-8').length === 1, rewardsFinal.data);
    check('the completed visit still counts as a visit', (await call('GET', '/me/shop-loyalty', undefined, T)).data.shops.some((s: any) => s.shop_id === shopId));

    console.log('\n   a visit that does not meet the criteria does not advance the mission');
    const eveningId = await bookConfirmed(T, S1, shopId, { date, time: '18:00', table_id: 't8' });
    await call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(eveningId) }, S1);
    const afterEvening = await call('GET', '/me/achievements', undefined, T);
    check('an 18:00 visit adds nothing to the night mission', stat(afterEvening, 'night_bookings') === 1, afterEvening.data.stats);
    check('an 18:00 visit adds nothing to the morning mission', stat(afterEvening, 'morning_bookings') === 0, afterEvening.data.stats);
    check('the morning mission stays locked', !mission(afterEvening, 'ach-4')?.achieved, mission(afterEvening, 'ach-4'));
    check('a mission far from its target is not marked achieved', !mission(afterEvening, 'ach-1')?.achieved && mission(afterEvening, 'ach-1')?.progress === 1, mission(afterEvening, 'ach-1'));

    console.log('\n   progress is per-guest');
    const otherProgress = await call('GET', '/me/achievements', undefined, T2);
    check('the other guest earned nothing from these visits', stat(otherProgress, 'night_bookings') === 0 && stat(otherProgress, 'shops_visited') === 0, otherProgress.data.stats);
    check('the other guest has no points', (await call('GET', '/me/rewards', undefined, T2)).data.points === 0);

    custStream.close();
    shopStream.close();
  } catch (err) {
    failed++;
    console.error(err);
  } finally {
    server.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

await main();
