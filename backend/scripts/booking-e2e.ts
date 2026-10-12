/**
 * End-to-end check of the shared backend: separate customer/shop accounts,
 * real-time booking events (SSE) and slot-conflict protection.
 *
 * Starts its own server on a throwaway data directory:  npm run test:booking
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { graceWindowMin, holdExpiresAtMin } from '../../shared/booking';

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-e2e-'));

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
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(), // run from backend/ (npm run test:booking)
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, JWT_SECRET: 'e2e-secret', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  server.stdout.on('data', d => (log += d));
  server.stderr.on('data', d => (log += d));

  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(`${BASE}/health`)).ok) break;
      } catch {
        // not up yet
      }
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('\nAccounts');
    const custA = await call('POST', '/customer/auth/register', { name: 'Khách A', phone: '0901000001', password: 'secret1' });
    check('customer A registers', custA.status === 201 && custA.data.user.account_type === 'customer', custA.data);
    const custB = await call('POST', '/customer/auth/register', { name: 'Khách B', phone: '0901000002', email: 'b@test.vn', password: 'secret2' });
    check('customer B registers', custB.status === 201);
    const dup = await call('POST', '/customer/auth/register', { name: 'Dup', phone: '0901 000 001', password: 'secret1' });
    check('duplicate customer phone rejected (409)', dup.status === 409);
    const weak = await call('POST', '/customer/auth/register', { name: 'Weak', phone: '0901000009', password: '123' });
    check('short password rejected (400)', weak.status === 400);

    const shopReg = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Quán Test',
      phone: '0901000001', // same phone as customer A: shop accounts are separate
      email: 'owner@test.vn',
      password: 'shoppass',
      shop: { name: 'Quán Test E2E', address: '1 Lê Lợi, Q1', openingHours: '07:00 - 22:00' }
    });
    check('shop registers (same phone as a customer is allowed)', shopReg.status === 201 && shopReg.data.user.account_type === 'shop', shopReg.data);
    const shopId = shopReg.data.shop?.id;
    const shopToken = shopReg.data.token;

    const shopList = await call('GET', '/shops');
    check('new shop is visible to the customer app', shopList.data.shops.some((s: any) => s.id === shopId && s.isPartner));

    const custLoginOnShop = await call('POST', '/shop/auth/login', { identifier: 'b@test.vn', password: 'secret2' });
    check('customer credentials cannot log into shop app', custLoginOnShop.status === 401 && /khách hàng/.test(custLoginOnShop.data.error), custLoginOnShop.data);
    const shopLogin = await call('POST', '/shop/auth/login', { identifier: '0901000001', password: 'shoppass' });
    check('shop login with its own password', shopLogin.status === 200 && shopLogin.data.user.account_type === 'shop');
    const custLogin = await call('POST', '/customer/auth/login', { identifier: '0901000001', password: 'secret1' });
    check('customer login with same phone gets the customer account', custLogin.status === 200 && custLogin.data.user.account_type === 'customer');
    const demoShop = await call('POST', '/shop/auth/login', { identifier: '0912345678', password: '123456' });
    check('seeded demo shop account logs in (real bcrypt hash)', demoShop.status === 200);
    const bypass = await call('POST', '/customer/auth/login', { identifier: '0908123789', password: 'wrong' });
    check('wrong password rejected (no bypass)', bypass.status === 401);
    const legacy = await call('POST', '/auth/login', { roleType: 'owner' });
    check('legacy quick-login endpoint disabled (410)', legacy.status === 410);

    const tA = custA.data.token;
    const tB = custB.data.token;

    console.log('\nAccess control');
    check('shop token cannot create bookings', (await call('POST', '/bookings', { shop_id: shopId }, shopToken)).status === 403);
    check('customer token cannot use merchant API', (await call('GET', `/merchant/shops/${shopId}/bookings`, undefined, tA)).status === 403);
    check('other shop cannot read this shop bookings', (await call('GET', `/merchant/shops/${shopId}/bookings`, undefined, demoShop.data.token)).status === 403);

    console.log('\nReal-time booking');
    const ticketShop = await call('POST', '/realtime/ticket', undefined, shopToken);
    const shopStream = openStream(`ticket=${ticketShop.data.ticket}`);
    const ticketA = await call('POST', '/realtime/ticket', undefined, tA);
    const custStream = openStream(`ticket=${ticketA.data.ticket}`);
    const publicStream = openStream(`watch=${shopId}`);
    await Promise.all([shopStream.ready, custStream.ready, publicStream.ready]);
    check('streams ready', !!(await shopStream.waitFor(e => e.event === 'ready')) && !!(await publicStream.waitFor(e => e.event === 'ready')));
    const reuse = await fetch(`${BASE}/realtime/stream?ticket=${ticketShop.data.ticket}`);
    check('stream ticket is single-use', reuse.status === 401);

    const date = isoInDays(2);
    const bookA = await call('POST', '/bookings', { shop_id: shopId, date, time: '19:00', guests: 4, table_id: 't3', note: 'Gần cửa sổ' }, tA);
    check('customer A books t3 19:00 (pending)', bookA.status === 201 && bookA.data.booking.status === 'pending', bookA.data);
    const bookingId = bookA.data.booking?.id;

    const shopGot = await shopStream.waitFor(e => e.event === 'booking' && e.data.booking.id === bookingId && e.data.action === 'created');
    check('shop app receives the new booking instantly', !!shopGot);
    const pubGot = await publicStream.waitFor(e => e.event === 'availability' && e.data.shop_id === shopId);
    check('customers viewing the floor plan get an availability ping', !!pubGot);
    check('public ping carries no personal data', pubGot && !JSON.stringify(pubGot.data).includes('0901000001'));

    const avail = await call('GET', `/shops/${shopId}/availability?date=${date}`);
    check('availability shows t3 reserved at 19:00', avail.data.reservations.some((r: any) => r.table_id === 't3' && r.time === '19:00'));

    const clash = await call('POST', '/bookings', { shop_id: shopId, date, time: '19:30', guests: 2, table_id: 't3' }, tB);
    check('customer B cannot double-book t3 at 19:30 (409)', clash.status === 409 && clash.data.code === 'SLOT_TAKEN', clash.data);
    const later = await call('POST', '/bookings', { shop_id: shopId, date, time: '21:00', guests: 2, table_id: 't3' }, tB);
    check('customer B can book t3 at 21:00 (after slot)', later.status === 201, later.data);
    const auto = await call('POST', '/bookings', { shop_id: shopId, date, time: '19:00', guests: 5 }, tB);
    check('auto-assign picks a free table that fits 5 guests (sofa t5)', auto.status === 201 && auto.data.booking.table_id === 't5', auto.data);

    const past = await call('POST', '/bookings', { shop_id: shopId, date: isoInDays(-2), time: '10:00', table_id: 't1' }, tB);
    check('past date rejected', past.status === 400);
    const nonPartner = await call('POST', '/bookings', { shop_id: 'ChIJ-google-place', date, time: '10:00' }, tB);
    check('non-partner shop rejected', nonPartner.status === 404 && nonPartner.data.code === 'SHOP_NOT_PARTNER');

    const confirm = await call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'confirmed' }, shopToken);
    check('shop confirms booking', confirm.status === 200 && confirm.data.booking.status === 'confirmed');
    const custGot = await custStream.waitFor(e => e.event === 'booking' && e.data.booking.id === bookingId && e.data.booking.status === 'confirmed');
    check('customer app receives the confirmation instantly', !!custGot);
    const badTransition = await call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'completed' }, shopToken);
    check('invalid status transition rejected (confirmed → completed)', badTransition.status === 409);

    const lock = await call('PUT', `/merchant/shops/${shopId}/tables/t4/status`, { operational_status: 'locked' }, shopToken);
    check('shop locks table t4', lock.status === 200);
    const lockedBook = await call('POST', '/bookings', { shop_id: shopId, date, time: '15:00', table_id: 't4' }, tB);
    check('locked table cannot be booked', lockedBook.status === 409);

    const cancelOther = await call('PUT', `/bookings/${bookingId}/cancel`, {}, tB);
    check('customer B cannot cancel A’s booking', cancelOther.status === 404);
    const cancel = await call('PUT', `/bookings/${bookingId}/cancel`, {}, tA);
    check('customer A cancels', cancel.status === 200 && cancel.data.booking.status === 'cancelled');
    const shopCancel = await shopStream.waitFor(e => e.event === 'booking' && e.data.booking.id === bookingId && e.data.booking.status === 'cancelled');
    check('shop app sees the cancellation instantly', !!shopCancel);
    // Customer A just cancelled, so A is the one free to take the slot again.
    // Customer B still holds 19:00 and 21:00 from earlier, and one person may not
    // hold two overlapping slots — that rule is checked on its own below.
    const rebook = await call('POST', '/bookings', { shop_id: shopId, date, time: '19:00', table_id: 't3' }, tA);
    check('slot is free again after cancellation', rebook.status === 201);
    const doubleHold = await call('POST', '/bookings', { shop_id: shopId, date, time: '19:30', table_id: 't2' }, tA);
    check('one customer cannot hold two overlapping slots', doubleHold.status === 409 && doubleHold.data.code === 'OVERLAPPING_HOLD');
    check('the clash names the booking it collides with', doubleHold.data.conflict?.booking_id === rebook.data.booking.id);

    const pause = await call('PUT', `/merchant/shops/${shopId}`, { bookingSettings: { acceptingBookings: false } }, shopToken);
    check('shop pauses online bookings', pause.status === 200 && pause.data.shop.bookingSettings.acceptingBookings === false);
    const paused = await call('POST', '/bookings', { shop_id: shopId, date, time: '09:00', table_id: 't1' }, tA);
    check('bookings refused while paused', paused.status === 409 && paused.data.code === 'SHOP_PAUSED');

    const mine = await call('GET', '/me/bookings', undefined, tA);
    check('customer sees own bookings only', mine.data.bookings.every((b: any) => b.user_id === custA.data.user.id));

    console.log('\nShop data starts empty & is owned by the shop');
    const freshShop = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Mới', phone: '0901000777', email: 'new@shop.vn', password: 'newshop1',
      shop: { name: 'Quán Mới Tinh', address: '9 Hai Bà Trưng' }
    });
    const nsId = freshShop.data.shop.id;
    const nsT = freshShop.data.token;
    const ins = await call('GET', `/merchant/shops/${nsId}/insights`, undefined, nsT);
    check('new shop has zero revenue/bookings/customers', ins.data.totals.revenue === 0 && ins.data.totals.bookings === 0 && ins.data.totals.customers === 0, ins.data.totals);
    check('new shop menu is empty', (await call('GET', `/merchant/shops/${nsId}/menu`, undefined, nsT)).data.items.length === 0);
    check('new shop has no vouchers', (await call('GET', `/merchant/shops/${nsId}/vouchers`, undefined, nsT)).data.items.length === 0);
    check('new shop has no customers', (await call('GET', `/merchant/shops/${nsId}/customers`, undefined, nsT)).data.customers.length === 0);
    check('new shop has no reviews', (await call('GET', `/merchant/shops/${nsId}/reviews`, undefined, nsT)).data.reviews.length === 0);
    check('customer app sees an empty menu for the new shop', (await call('GET', `/shops/${nsId}/menu`)).data.items.length === 0);
    const put1 = await call('PUT', `/merchant/shops/${nsId}/menu`, { items: [
      { id: 'm1', name: 'Cà phê sữa', price: 30000, stock: 10, category: 'Cà phê', isAvailable: true, image: 'https://example.com/a.jpg' },
      { id: 'm2', name: 'Bạc xỉu', price: 35000, stock: 10, category: 'Cà phê', isAvailable: true, image: 'javascript:alert(1)' }
    ] }, nsT);
    check('owner adds menu items', put1.status === 200 && put1.data.items.length === 2);
    check('unsafe image URLs are dropped', put1.data.items[1].image === '');
    check('customer app now sees the menu', (await call('GET', `/shops/${nsId}/menu`)).data.items.length === 2);
    const put2 = await call('PUT', `/merchant/shops/${nsId}/menu`, { items: put1.data.items.filter((m: any) => m.id !== 'm2') }, nsT);
    check('owner deletes a menu item', put2.data.items.length === 1 && put2.data.items[0].id === 'm1');
    check('deleted item gone for customers', (await call('GET', `/shops/${nsId}/menu`)).data.items.length === 1);
    check('another shop cannot change this menu', (await call('PUT', `/merchant/shops/${nsId}/menu`, { items: [] }, shopToken)).status === 403);
    check('customer cannot change a menu', (await call('PUT', `/merchant/shops/${nsId}/menu`, { items: [] }, tA)).status === 403);
    const vput = await call('PUT', `/merchant/shops/${nsId}/vouchers`, { items: [{ code: 'mo cua', title: 'Khai trương', discountType: 'fixed', discountValue: 10000, minOrderValue: 0, status: 'active' }] }, nsT);
    check('owner creates a voucher', vput.data.items[0]?.code === 'MOCUA');
    const vlist = await call('GET', `/vouchers?shopId=${nsId}`);
    check('active shop voucher is visible to customers', vlist.data.vouchers.some((v: any) => v.code === 'MOCUA'));
    const up = await call('POST', `/merchant/shops/${nsId}/uploads`, { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }, nsT);
    check('owner uploads a menu photo', up.status === 201 && /\/api\/media\/uploads\//.test(up.data.url));
    const badUp = await call('POST', `/merchant/shops/${nsId}/uploads`, { dataUrl: 'data:text/html;base64,PGgxPg==' }, nsT);
    check('non-image uploads rejected', badUp.status === 400);

    console.log('\nThe grace window itself');
    {
      check('a quiet hour gets the full default window', graceWindowMin('14:00') === 20);
      check('a peak hour gets the shorter window', graceWindowMin('09:00') === 15);
      check('a shop can widen its own window', graceWindowMin('14:00', 40) === 40);
      check('but never past the upper bound', graceWindowMin('14:00', 600) === 45);
      check('nor below the lower bound', graceWindowMin('14:00', 1) === 10);
      check('peak still caps a shop that asked for longer', graceWindowMin('19:00', 40) === 15);
      check('the hold ends at the agreed time plus the window',
        holdExpiresAtMin({ time: '14:00' }) === 14 * 60 + 20);
      check('an extension pushes the hold out',
        holdExpiresAtMin({ time: '14:00', late_extension_min: 15 }) === 14 * 60 + 35);
    }

    console.log('\nHolds expire, and the blame does not follow automatically');
    {
      // An earlier case paused this shop; take it off pause before booking again.
      await call('PUT', `/merchant/shops/${shopId}`, { bookingSettings: { acceptingBookings: true } }, shopToken);
      // Tomorrow, so the booking is valid whatever time of day the suite runs.
      const tomorrow = isoInDays(1);
      const nsBooking = await call('POST', '/bookings', { shop_id: shopId, date: tomorrow, time: '09:00', guests: 2, table_id: 't1' }, tA);
      check('booking created for the sweeper to find', nsBooking.status === 201, nsBooking.data);
      const holdId = nsBooking.data.booking.id;
      await call('PUT', `/merchant/bookings/${holdId}/status`, { status: 'confirmed' }, shopToken);

      const lateOk = await call('POST', `/me/bookings/${holdId}/running-late`, {}, tA);
      check('customer can push the hold out once', lateOk.status === 200 && lateOk.data.extended_min === 15);
      const lateTwice = await call('POST', `/me/bookings/${holdId}/running-late`, {}, tA);
      check('the extension is granted only once', lateTwice.status === 409);
      const lateOther = await call('POST', `/me/bookings/${holdId}/running-late`, {}, tB);
      check('nobody can extend someone else’s hold', lateOther.status === 404);

      const noShow = await call('PUT', `/merchant/bookings/${holdId}/status`, { status: 'no_show' }, shopToken);
      check('shop can record a no-show on a confirmed booking', noShow.status === 200 && noShow.data.booking.status === 'no_show');
      const custSaw = await custStream.waitFor(e => e.event === 'booking' && e.data.booking.id === holdId && e.data.booking.status === 'no_show');
      check('customer app hears the hold was released', !!custSaw);

      const freed = await call('GET', `/merchant/shops/${shopId}/tables?date=${tomorrow}`, undefined, shopToken);
      check('the table goes back to available', freed.data.tables.find((x: any) => x.id === 't1')?.operational_status === 'available');

      const listed = await call('GET', `/merchant/shops/${shopId}/bookings?date=${tomorrow}`, undefined, shopToken);
      check('the shop sees the customer’s record', (listed.data.reliability?.[nsBooking.data.booking.user_id]?.noShows || 0) === 1);

      const undo = await call('PUT', `/merchant/bookings/${holdId}/status`, { status: 'arrived' }, shopToken);
      check('shop can take a wrongly recorded no-show back', undo.status === 200 && undo.data.booking.status === 'arrived');
      const afterUndo = await call('GET', `/merchant/shops/${shopId}/bookings?date=${tomorrow}`, undefined, shopToken);
      check('undoing clears the mark from the customer', (afterUndo.data.reliability?.[nsBooking.data.booking.user_id]?.noShows || 0) === 0);

      const notes = await call('GET', '/me/notifications', undefined, tA);
      check('the customer has a durable record of what happened', notes.status === 200 && notes.data.notifications.length > 0);
      check('unread count is reported', notes.data.unread > 0);
      const first = notes.data.notifications[0];
      const read = await call('POST', `/me/notifications/${first.id}/read`, {}, tA);
      check('a notification can be marked read', read.status === 200 && read.data.changed === true);
      const readAll = await call('POST', '/me/notifications/read-all', {}, tA);
      check('all notifications can be cleared at once', readAll.status === 200 && readAll.data.unread === 0);
      const otherInbox = await call('GET', '/me/notifications', undefined, tB);
      check('one person never sees another’s notifications',
        otherInbox.data.notifications.every((n: any) => n.id !== first.id));
    }

    console.log('\nThe shop declares its own amenities');
    {
      const ok = await call('PUT', `/merchant/shops/${shopId}`, { amenities: ['Wi-Fi', 'Điều hòa', 'Điều hòa'] }, shopToken);
      check('a shop can declare amenities', ok.status === 200);
      check('duplicates are collapsed', JSON.stringify(ok.data.shop.amenities) === JSON.stringify(['Wi-Fi', 'Điều hòa']));
      const bad = await call('PUT', `/merchant/shops/${shopId}`, { amenities: ['Wi-Fi', 'Có bể bơi'] }, shopToken);
      check('an unknown amenity is refused rather than stored', bad.status === 400 && bad.data.code === 'UNKNOWN_AMENITY');
      const stillThere = await call('GET', `/shops/${shopId}`);
      check('the refused write changed nothing', JSON.stringify(stillThere.data.shop?.amenities || stillThere.data.amenities) === JSON.stringify(['Wi-Fi', 'Điều hòa']));

      const grace = await call('PUT', `/merchant/shops/${shopId}`, { bookingSettings: { noShowGraceMin: 600 } }, shopToken);
      check('a shop cannot set a grace window past the bound', grace.data.shop.bookingSettings.noShowGraceMin === 45);
      const grace2 = await call('PUT', `/merchant/shops/${shopId}`, { bookingSettings: { noShowGraceMin: 30 } }, shopToken);
      check('a shop can set its own grace window', grace2.data.shop.bookingSettings.noShowGraceMin === 30);
    }

    console.log('\nPush reaches a closed tab, without ever leaking the private key');
    {
      const key = await call('GET', '/push/key');
      check('the public VAPID key is served', key.status === 200 && key.data.enabled === true && key.data.publicKey.length > 80);
      check('the private key is never part of that answer',
        !JSON.stringify(key.data).toLowerCase().includes('private'));

      const anon = await call('POST', '/me/push/subscribe', { subscription: { endpoint: 'https://example.com/x', keys: { p256dh: 'a', auth: 'b' } } });
      check('an anonymous browser cannot subscribe', anon.status === 401);

      const bad = await call('POST', '/me/push/subscribe', { subscription: { endpoint: 'https://example.com/x' } }, tA);
      check('a subscription without keys is refused', bad.status === 400);

      const sub = { endpoint: 'https://push.example.com/abc', keys: { p256dh: 'BPublicKeyHere', auth: 'AuthSecret' } };
      const ok = await call('POST', '/me/push/subscribe', { subscription: sub }, tA);
      check('a browser can subscribe', ok.status === 201);
      const again = await call('POST', '/me/push/subscribe', { subscription: sub }, tA);
      check('re-subscribing the same browser does not duplicate it', again.status === 201);

      const off = await call('POST', '/me/push/unsubscribe', { endpoint: sub.endpoint }, tA);
      check('a browser can unsubscribe', off.status === 200 && off.data.removed === true);
      const offAgain = await call('POST', '/me/push/unsubscribe', { endpoint: sub.endpoint }, tA);
      check('unsubscribing twice is harmless', offAgain.status === 200 && offAgain.data.removed === false);
    }

    shopStream.close();
    custStream.close();
    publicStream.close();
  } catch (err) {
    failed++;
    console.error(err);
    console.error(log);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
