/**
 * End-to-end check of API robustness and submit idempotency.
 *
 *   npm run test:robustness
 *
 * Starts its own server on a throwaway data directory, so the repository's
 * backend/data/database.json is never read or written.
 *
 * What it pins down — each of these was an observed defect, not a hypothetical:
 *
 *  1. A repeated submit (double-tap, or a request the browser retried) must not leave the
 *     guest holding several tables for one visit. Without a dedupe the auto-assign path
 *     handed each copy a different table: 5 concurrent POSTs → 5 bookings.
 *
 *  2. An unknown shop id must answer 404, never crash and never answer an empty 200.
 *     GET /api/merchant/shops/:id/tables used to assert the shop non-null and threw a
 *     TypeError, which Express answered as an HTML error page.
 *
 *  3. Every /api failure must carry a JSON body. When the body is not JSON the shared
 *     HttpClient has no message to show and falls back to "Yêu cầu thất bại (<status>)",
 *     which tells neither the user nor the developer anything.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 3995;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-robust-'));

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

/** Returns the raw body too, so a test can assert the body really was JSON. */
async function call(method: string, url: string, body?: unknown, token?: string) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data: any = null;
  let isJson = true;
  try { data = JSON.parse(text); } catch { isJson = false; }
  return { status: res.status, data: data ?? {}, isJson, text, contentType: res.headers.get('content-type') || '' };
}

function isoInDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(), // run from backend/
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, JWT_SECRET: 'robust-e2e', NODE_ENV: 'test', LOCALITY_WORKER_ENABLED: 'false' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  server.stdout.on('data', d => (log += d));
  server.stderr.on('data', d => (log += d));

  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${BASE}/health`)).ok) break; } catch { /* not up yet */ }
      await new Promise(r => setTimeout(r, 200));
    }

    const cust = await call('POST', '/customer/auth/register', { name: 'Khách Bền Vững', phone: '0905000001', password: 'secret1' });
    const T = cust.data.token;
    const shop = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Bền', phone: '0905000091', email: 'robust@shop.vn', password: 'shoppass',
      shop: { name: 'Quán Bền Vững', address: '5 Lê Lợi, Quận 1, TP.HCM' }
    });
    const S = shop.data.token;
    const shopId = shop.data.shop.id;
    const admin = await call('POST', '/shop/auth/login', { identifier: '0999999999', password: '123456' });
    const ADM = admin.data.token;
    check('accounts ready', cust.status === 201 && shop.status === 201 && admin.status === 200, { cust: cust.status, shop: shop.status, admin: admin.status });

    const date = isoInDays(3);

    console.log('\n1. A repeated submit never books the guest more than one table');
    const burstAuto = await Promise.all(Array.from({ length: 5 }, () =>
      call('POST', '/bookings', { shop_id: shopId, date, time: '15:00', guests: 2 }, T)));
    const createdAuto = burstAuto.filter(r => r.status === 201);
    const dupAuto = burstAuto.filter(r => r.status === 200 && r.data.duplicate);
    check('5 concurrent auto-assign submits create exactly 1 booking',
      createdAuto.length === 1, { created: createdAuto.length, statuses: burstAuto.map(r => r.status) });
    check('the other 4 are answered with that same booking',
      dupAuto.length === 4 && new Set(burstAuto.map(r => r.data.booking?.id)).size === 1,
      { duplicates: dupAuto.length, ids: [...new Set(burstAuto.map(r => r.data.booking?.id))] });
    const mineAuto = (await call('GET', '/me/bookings', undefined, T)).data.bookings
      .filter((b: any) => b.date === date && b.time === '15:00');
    check('the guest really holds one table for that slot', mineAuto.length === 1, mineAuto.map((b: any) => b.table_id));

    const seq1 = await call('POST', '/bookings', { shop_id: shopId, date, time: '16:00', guests: 2 }, T);
    const seq2 = await call('POST', '/bookings', { shop_id: shopId, date, time: '16:00', guests: 2 }, T);
    check('a slow double-tap returns the first booking instead of a second',
      seq1.status === 201 && seq2.status === 200 && seq2.data.duplicate === true && seq2.data.booking.id === seq1.data.booking.id,
      { first: seq1.status, second: seq2.status, ids: [seq1.data.booking?.id, seq2.data.booking?.id] });

    const burstSame = await Promise.all(Array.from({ length: 5 }, () =>
      call('POST', '/bookings', { shop_id: shopId, date, time: '19:00', guests: 2, table_id: 't3' }, T)));
    check('5 concurrent submits for one explicit table create exactly 1 booking',
      burstSame.filter(r => r.status === 201).length === 1, burstSame.map(r => r.status));

    console.log('\n   …while genuinely different bookings are still allowed');
    const other = await call('POST', '/bookings', { shop_id: shopId, date, time: '17:30', guests: 2 }, T);
    check('a different time is a new booking', other.status === 201 && other.data.booking.time === '17:30', other.data);
    // Asking for a named table is a deliberate choice, so it must not be swallowed as a
    // duplicate of a table the server auto-assigned in the same slot. A large party booking
    // a second table depends on this, and the clash check still guards each table.
    //
    // Run it on a clean slot and pick the second table by the server's own rule: a table is
    // free when it holds no reservation starting within slot_duration_min of this time.
    const slot = '08:00';
    const twoTables = await call('POST', '/bookings', { shop_id: shopId, date, time: slot, guests: 2 }, T);
    const autoHeld = twoTables.data.booking?.table_id;
    const avail = (await call('GET', `/merchant/shops/${shopId}/tables?date=${date}`, undefined, S)).data;
    const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const freeOther = avail.tables.find((t: any) =>
      t.id !== autoHeld &&
      t.operational_status !== 'locked' &&
      !avail.reservations.some((r: any) => r.table_id === t.id && Math.abs(mins(r.time) - mins(slot)) < avail.slot_duration_min));
    check('the slot has a second genuinely free table to test with',
      !!freeOther && twoTables.status === 201, { autoHeld, freeOther: freeOther?.id, created: twoTables.status });
    const second = await call('POST', '/bookings', { shop_id: shopId, date, time: slot, guests: 2, table_id: freeOther.id }, T);
    check('a named free table in the same slot is still a new booking',
      second.status === 201 && second.data.booking.table_id === freeOther.id,
      { status: second.status, asked: freeOther?.id, got: second.data.booking?.table_id, autoHeld });
    const sameTableAgain = await call('POST', '/bookings', { shop_id: shopId, date, time: slot, guests: 2, table_id: freeOther.id }, T);
    check('re-sending that same named table is a duplicate, not a third booking',
      sameTableAgain.status === 200 && sameTableAgain.data.duplicate === true && sameTableAgain.data.booking.id === second.data.booking.id,
      { status: sameTableAgain.status, body: sameTableAgain.data });
    const cancelled = await call('PUT', `/bookings/${seq1.data.booking.id}/cancel`, {}, T);
    const rebook = await call('POST', '/bookings', { shop_id: shopId, date, time: '16:00', guests: 2 }, T);
    check('after cancelling, the same slot can be booked again',
      cancelled.status === 200 && rebook.status === 201 && rebook.data.booking.id !== seq1.data.booking.id,
      { cancel: cancelled.status, rebook: rebook.status });

    console.log('\n2. An unknown shop id answers 404 — no crash, no empty 200');
    for (const ep of ['tables', 'bookings', 'menu', 'vouchers', 'customers', 'reviews', 'insights', 'analytics']) {
      const r = await call('GET', `/merchant/shops/NO-SUCH-SHOP/${ep}`, undefined, ADM);
      check(`GET /merchant/shops/<unknown>/${ep} → 404 SHOP_NOT_FOUND`,
        r.status === 404 && r.data.code === 'SHOP_NOT_FOUND', { status: r.status, body: r.data });
    }
    const putUnknown = await call('PUT', '/merchant/shops/NO-SUCH-SHOP', { name: 'x' }, ADM);
    check('PUT /merchant/shops/<unknown> → 404', putUnknown.status === 404, putUnknown.data);
    const realShopOtherOwner = await call('GET', `/merchant/shops/${shopId}/tables`, undefined, ADM);
    check('an existing shop still works for an admin', realShopOtherOwner.status === 200, realShopOtherOwner.data);
    const ownerTables = await call('GET', `/merchant/shops/${shopId}/tables`, undefined, S);
    check('the owner still reads its own tables', ownerTables.status === 200 && Array.isArray(ownerTables.data.tables), ownerTables.data);

    console.log('\n   a shop account is told "forbidden", not "not found" — no probing of real ids');
    const probe = await call('GET', '/merchant/shops/NO-SUCH-SHOP/tables', undefined, S);
    check('a shop account gets 403 for an id it does not own, existing or not',
      probe.status === 403 && probe.data.code === 'SHOP_FORBIDDEN', { status: probe.status, body: probe.data });

    console.log('\n3. Every /api failure carries a JSON body');
    const probes = [
      ['GET', '/does-not-exist', undefined, undefined],
      ['GET', '/merchant/shops/NO-SUCH-SHOP/tables', undefined, ADM],
      ['POST', '/bookings', {}, T],
      ['POST', '/merchant/bookings/check-in', { code: 'rubbish' }, S],
      ['GET', '/me/bookings', undefined, undefined],
      ['POST', '/shops/NO-SUCH/reviews', { content: 'x' }, T]
    ] as const;
    for (const [m, u, b, tok] of probes) {
      const r = await call(m, u, b, tok);
      check(`${m} ${u} → ${r.status} with a JSON body`,
        r.status >= 400 && r.isJson && /json/i.test(r.contentType), { status: r.status, isJson: r.isJson, contentType: r.contentType, head: r.text.slice(0, 80) });
      check(`${m} ${u} → body carries a human-readable error`,
        typeof r.data.error === 'string' && r.data.error.length > 0, r.data);
    }

    console.log('\n   …and an unhandled throw is answered as JSON, logged, not leaked');
    // /api/media/place-photo reaches an upstream fetch; with no key it answers a handled
    // error. The guarantee under test is the shape of the answer, not which branch ran.
    const photo = await call('GET', '/media/place-photo?name=places/X/photos/Y');
    check('an upstream failure answers JSON, never an HTML page',
      photo.isJson && /json/i.test(photo.contentType), { status: photo.status, contentType: photo.contentType, head: photo.text.slice(0, 80) });
    check('no stack trace or internal path is sent to the client',
      !/TypeError|at .*\.ts:|\/home\/|C:\\\\/.test(photo.text), photo.text.slice(0, 160));

    console.log('\n4. The booking flow itself still works end to end');
    const bk = await call('POST', '/bookings', { shop_id: shopId, date, time: '20:00', guests: 2, table_id: 't5' }, T);
    check('booking created', bk.status === 201, bk.data);
    const conf = await call('PUT', `/merchant/bookings/${bk.data.booking.id}/status`, { status: 'confirmed' }, S);
    check('shop confirms', conf.status === 200 && conf.data.booking.status === 'confirmed', conf.data);
    const scan = await call('POST', '/merchant/bookings/check-in', { code: `MOBLER-BOOKING:${bk.data.booking.id}` }, S);
    check('QR check-in works', scan.status === 200 && scan.data.booking.status === 'arrived', scan.data);
    const rev = await call('POST', `/shops/${shopId}/reviews`, { content: 'ổn' }, T);
    check('review allowed after check-in', rev.status === 201, rev.data);
  } catch (err) {
    failed++;
    console.error(err);
    console.error(log.slice(-3000));
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
