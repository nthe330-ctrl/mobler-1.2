/**
 * The API's error codes, checked against a running server.
 *
 * Why this exists next to `test:i18n`: that suite reads the route files and proves every
 * failure *is written* with a code, and that every code has a translation. It cannot prove
 * the server *sends* one — a validation branch that is never reached, a middleware that
 * answers before the handler, or a code shadowed by an earlier `return` would all pass a
 * static read and still hand the dashboard an untranslatable error. So this suite makes the
 * requests for real and reads what comes back over HTTP.
 *
 * What a failure here means, concretely: a staff member in Taipei or Bangkok sees a
 * Vietnamese sentence on an otherwise translated screen, at the moment something has
 * already gone wrong. That is the worst moment for the interface to switch languages.
 *
 * Two things are asserted for every case: the HTTP status, and `code`. The Vietnamese
 * `error` string is deliberately NOT asserted — it stays as the fallback for older clients
 * and the customer app, and pinning its wording here would make rewording it a test
 * failure for no benefit.
 *
 *   npm run test:api-errors
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { isShopErrorCode, SHOP_ERROR_CODES } from '../../shared/apiErrors';

const PORT = 3993;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-apierr-'));

let passed = 0;
let failed = 0;
/** Codes this run actually saw come back, so the end can report what stayed unexercised. */
const seen = new Set<string>();

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
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (data?.code) seen.add(data.code);
  return { status: res.status, data };
}

/** One failure: the status and the code the dashboard will translate. */
async function expectCode(
  name: string,
  want: { status: number; code: string },
  req: () => Promise<{ status: number; data: any }>
) {
  const r = await req();
  const ok = r.status === want.status && r.data?.code === want.code;
  check(`${name} → ${want.status} ${want.code}`, ok, { got: { status: r.status, code: r.data?.code }, error: r.data?.error });
  return r;
}

function isoInDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(), // backend/
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, JWT_SECRET: 'apierr-e2e', NODE_ENV: 'test' },
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

    // ---------------------------------------------------------------- accounts
    console.log('\nSigning up a shop: every refused field names itself');
    const base = {
      owner_name: 'Chủ Lỗi', phone: '0905000001', email: 'err@shop.vn', password: 'shoppass1',
      shop: { name: 'Quán Mã Lỗi', address: '9 Lê Lợi' }
    };
    await expectCode('no owner name', { status: 400, code: 'OWNER_NAME_REQUIRED' },
      () => call('POST', '/shop/auth/register', { ...base, owner_name: '  ' }));
    await expectCode('phone is not a phone', { status: 400, code: 'PHONE_INVALID' },
      () => call('POST', '/shop/auth/register', { ...base, phone: 'abc' }));
    await expectCode('password too short', { status: 400, code: 'PASSWORD_TOO_SHORT' },
      () => call('POST', '/shop/auth/register', { ...base, password: '12345' }));
    await expectCode('email is malformed', { status: 400, code: 'EMAIL_INVALID' },
      () => call('POST', '/shop/auth/register', { ...base, email: 'not-an-email' }));
    await expectCode('a shop account needs an email', { status: 400, code: 'SHOP_EMAIL_REQUIRED' },
      () => call('POST', '/shop/auth/register', { ...base, email: '' }));
    await expectCode('no shop name', { status: 400, code: 'SHOP_NAME_REQUIRED' },
      () => call('POST', '/shop/auth/register', { ...base, shop: { ...base.shop, name: ' ' } }));
    await expectCode('no shop address', { status: 400, code: 'SHOP_ADDRESS_REQUIRED' },
      () => call('POST', '/shop/auth/register', { ...base, shop: { ...base.shop, address: '' } }));

    const reg = await call('POST', '/shop/auth/register', base);
    check('the valid registration succeeds', reg.status === 201, reg.data);
    const shopId: string = reg.data.shop.id;
    const token: string = reg.data.token;

    await expectCode('the same phone twice', { status: 409, code: 'SHOP_ACCOUNT_EXISTS' },
      () => call('POST', '/shop/auth/register', { ...base, email: 'other@shop.vn' }));

    console.log('\nSigning in');
    await expectCode('no credentials at all', { status: 400, code: 'LOGIN_FIELDS_REQUIRED' },
      () => call('POST', '/shop/auth/login', {}));
    await expectCode('wrong password', { status: 401, code: 'LOGIN_BAD_CREDENTIALS' },
      () => call('POST', '/shop/auth/login', { identifier: base.phone, password: 'wrongpass' }));

    // A customer account signing in to the shop app is a different mistake with a
    // different fix, so it gets its own code rather than "wrong password".
    const cust = await call('POST', '/customer/auth/register',
      { name: 'Khách Lỗi', phone: '0905000009', password: 'secret1' });
    check('a customer account exists for the next case', cust.status === 201, cust.data);
    const custToken: string = cust.data.token;
    await expectCode('a customer signing in to the shop app', { status: 401, code: 'LOGIN_WRONG_APP' },
      () => call('POST', '/shop/auth/login', { identifier: '0905000009', password: 'secret1' }));

    await expectCode('a retired endpoint', { status: 410, code: 'ENDPOINT_RETIRED' },
      () => call('POST', '/auth/login', { identifier: base.phone, password: base.password }));

    // ------------------------------------------------------- session & permission
    console.log('\nSession and permission, the paths every screen goes through');
    await expectCode('no token', { status: 401, code: 'AUTH_REQUIRED' },
      () => call('GET', `/merchant/shops/${shopId}/bookings`));
    await expectCode('a token that is not a token', { status: 401, code: 'TOKEN_INVALID' },
      () => call('GET', `/merchant/shops/${shopId}/bookings`, undefined, 'not.a.real.token'));
    await expectCode('a customer token on a shop route', { status: 403, code: 'WRONG_ACCOUNT_TYPE' },
      () => call('GET', `/merchant/shops/${shopId}/bookings`, undefined, custToken));

    const other = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Bên Cạnh', phone: '0905000002', email: 'err2@shop.vn', password: 'shoppass2',
      shop: { name: 'Quán Bên Cạnh', address: '10 Lê Lợi' }
    });
    const otherToken: string = other.data.token;
    await expectCode('another shop reaching into this one', { status: 403, code: 'SHOP_FORBIDDEN' },
      () => call('GET', `/merchant/shops/${shopId}/tables`, undefined, otherToken));
    // A shop id that does not exist answers 403, not 404, and that is deliberate: a shop
    // account must not be able to use this route to learn which ids are real. So
    // SHOP_NOT_FOUND stays unreachable for ordinary staff — it is for an admin, or a client
    // holding an id that was valid before the database was reseeded. Pinned here because an
    // "improvement" to return 404 would quietly turn the route into a probe.
    {
      const ghost = await call('GET', '/merchant/shops/shop-does-not-exist/tables', undefined, token);
      check('a non-existent shop is indistinguishable from a forbidden one → 403 SHOP_FORBIDDEN',
        ghost.status === 403 && ghost.data?.code === 'SHOP_FORBIDDEN',
        { status: ghost.status, code: ghost.data?.code });
    }

    // ------------------------------------------------------------ shop settings
    console.log('\nRegional settings');
    await expectCode('an unsupported currency', { status: 400, code: 'BAD_CURRENCY' },
      () => call('PUT', `/merchant/shops/${shopId}`, { currency_code: 'NTD' }, token));

    // ---------------------------------------------------------------- bookings
    console.log('\nBookings');
    await expectCode('a booking id that does not exist', { status: 404, code: 'BOOKING_NOT_FOUND' },
      () => call('PUT', '/merchant/bookings/bk-nope/status', { status: 'confirmed' }, token));

    // A real booking, so the status rules can be exercised rather than simulated.
    const avail = await call('GET', `/merchant/shops/${shopId}/tables`, undefined, token);
    const tableCode: string | undefined = avail.data?.tables?.[0]?.id;
    check('the new shop has a table to book', !!tableCode, avail.data?.tables?.length);
    const booking = await call('POST', '/bookings', {
      shop_id: shopId, date: isoInDays(1), time: '10:00', guests: 2, table_code: tableCode
    }, custToken);
    check('a customer booking is created', booking.status === 201, booking.data);
    const bookingId: string = booking.data?.booking?.id;

    // Presence needs the guest's own QR; the shop cannot assert it by sending a status.
    await expectCode('marking a guest present without a scan', { status: 403, code: 'CHECKIN_REQUIRES_SCAN' },
      () => call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'arrived' }, token));
    // The two states travel as fields so each language can order the sentence its own way.
    const bad = await expectCode('a transition the rules forbid', { status: 409, code: 'BOOKING_BAD_TRANSITION' },
      () => call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'completed' }, token));
    check('the forbidden transition names both states separately',
      bad.data?.detail?.from === 'pending' && bad.data?.detail?.to === 'completed', bad.data?.detail);

    await expectCode('a QR code that is not one', { status: 400, code: 'CHECKIN_CODE_INVALID' },
      () => call('POST', '/merchant/bookings/check-in', { code: '!!' }, token));
    await expectCode('a well-formed code for no booking here', { status: 404, code: 'CHECKIN_CODE_INVALID' },
      () => call('POST', '/merchant/bookings/check-in', { code: 'BK-NOTHERE-1' }, token));

    const confirmed = await call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'confirmed' }, token);
    check('the shop can confirm its own booking', confirmed.status === 200, confirmed.data);
    const mismatch = await expectCode('a code that is not the selected booking’s', { status: 409, code: 'CHECKIN_CODE_MISMATCH' },
      () => call('POST', '/merchant/bookings/check-in', { code: bookingId, expected_booking_id: 'bk-someone-else' }, token));
    check('the mismatch says which code was expected', !!mismatch.data?.detail?.expected, mismatch.data?.detail);

    console.log('\nCheck-in states, walked through on real bookings');
    {
      // A second booking left unconfirmed, so "not confirmed yet" is a real state rather
      // than a hypothesis.
      const pending = await call('POST', '/bookings', {
        shop_id: shopId, date: isoInDays(2), time: '11:00', guests: 2, table_code: tableCode
      }, custToken);
      check('a second booking is created', pending.status === 201, pending.data);
      await expectCode('scanning a booking the shop has not confirmed', { status: 409, code: 'CHECKIN_NOT_CONFIRMED' },
        () => call('POST', '/merchant/bookings/check-in', { code: pending.data.booking.id }, token));

      // Payment before the guest is even confirmed, and then with nothing pre-ordered.
      await expectCode('recording payment on a pending booking', { status: 409, code: 'PAYMENT_INVALID_BOOKING' },
        () => call('PUT', `/merchant/bookings/${pending.data.booking.id}/payment`, {}, token));
      await expectCode('recording payment with no pre-order', { status: 409, code: 'PAYMENT_NO_ORDER' },
        () => call('PUT', `/merchant/bookings/${bookingId}/payment`, {}, token));

      // The real scan, then the same code again: the second must change nothing.
      const scan = await call('POST', '/merchant/bookings/check-in', { code: bookingId }, token);
      check('a confirmed booking checks in by its code', scan.status === 200, scan.data);
      const again = await expectCode('the same code scanned twice', { status: 409, code: 'CHECKIN_ALREADY_DONE' },
        () => call('POST', '/merchant/bookings/check-in', { code: bookingId }, token));
      check('the repeat scan names the guest as a field', !!again.data?.detail?.name, again.data?.detail);

      // Once the visit is finished, the ticket is spent. The status travels as the raw
      // value so the dashboard writes it in the reader's language.
      const done = await call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'completed' }, token);
      check('the visit can be completed', done.status === 200, done.data);
      const spent = await expectCode('scanning a finished booking', { status: 409, code: 'CHECKIN_INVALID_STATUS' },
        () => call('POST', '/merchant/bookings/check-in', { code: bookingId }, token));
      check('the spent ticket sends the status as a raw value',
        spent.data?.detail?.status === 'completed', spent.data?.detail);
    }

    // --------------------------------------------------- tables, menu, vouchers
    console.log('\nTables, menu, vouchers, reviews');
    await expectCode('a table status that is not one of the four', { status: 400, code: 'TABLE_STATUS_INVALID' },
      () => call('PUT', `/merchant/shops/${shopId}/tables/${tableCode}/status`, { operational_status: 'exploded' }, token));
    await expectCode('a table code that does not exist', { status: 404, code: 'TABLE_NOT_FOUND' },
      () => call('PUT', `/merchant/shops/${shopId}/tables/NOPE/status`, { operational_status: 'locked' }, token));
    await expectCode('a product that does not exist', { status: 404, code: 'PRODUCT_NOT_FOUND' },
      () => call('PUT', '/merchant/products/prod-nope/toggle-availability', { is_available: false }, token));
    await expectCode('an order that does not exist', { status: 404, code: 'ORDER_NOT_FOUND' },
      () => call('PUT', '/merchant/orders/ord-nope/status', { status: 'paid' }, token));
    await expectCode('a review that does not exist', { status: 404, code: 'REVIEW_NOT_FOUND' },
      () => call('POST', '/merchant/reviews/rev-nope/reply', { reply: 'xin chào' }, token));

    await expectCode('a menu that is not a list', { status: 400, code: 'MENU_ITEMS_INVALID' },
      () => call('PUT', `/merchant/shops/${shopId}/menu`, { items: 'not a list' }, token));
    const tooMany = await expectCode('a menu past the limit', { status: 400, code: 'MENU_TOO_MANY' },
      () => call('PUT', `/merchant/shops/${shopId}/menu`,
        { items: Array.from({ length: 301 }, (_, i) => ({ id: `m${i}`, name: `Món ${i}`, price: 1000 })) }, token));
    check('the limit travels as a number, not inside the sentence', tooMany.data?.detail?.limit === 300, tooMany.data?.detail);
    await expectCode('vouchers that are not a list', { status: 400, code: 'VOUCHER_ITEMS_INVALID' },
      () => call('PUT', `/merchant/shops/${shopId}/vouchers`, { items: 42 }, token));
    const vTooMany = await expectCode('vouchers past the limit', { status: 400, code: 'VOUCHER_TOO_MANY' },
      () => call('PUT', `/merchant/shops/${shopId}/vouchers`,
        { items: Array.from({ length: 201 }, (_, i) => ({ code: `V${i}`, discount: 10 })) }, token));
    check('the voucher limit is its own field', vTooMany.data?.detail?.limit === 200, vTooMany.data?.detail);

    await expectCode('an upload that is not an image', { status: 400, code: 'UPLOAD_BAD_TYPE' },
      () => call('POST', `/merchant/shops/${shopId}/uploads`, { dataUrl: 'data:text/plain;base64,aGVsbG8=' }, token));
    // Two different limits, and they must not be confused. base64 decodes to 3/4 of its
    // length: 5MB of it is ~3.75MB of image, which clears the route's own 3MB check while
    // still fitting inside the 6mb body limit, so the ROUTE is what refuses it.
    const overImageLimit = 'A'.repeat(5 * 1024 * 1024);
    const tooLarge = await expectCode('an image over the image size limit', { status: 413, code: 'UPLOAD_TOO_LARGE' },
      () => call('POST', `/merchant/shops/${shopId}/uploads`, { dataUrl: `data:image/png;base64,${overImageLimit}` }, token));
    check('the size limit is sent as its own field', !!tooLarge.data?.detail?.limit, tooLarge.data?.detail);

    console.log('\nRejected before any route runs');
    {
      // Past the body limit the request never reaches the handler: the body parser throws,
      // and the last-resort handler answers. It used to flatten that to 500 INTERNAL_ERROR,
      // which told a shop with an oversized photo that the system was broken — and in a
      // code the dashboard could not translate.
      const overBodyLimit = 'A'.repeat(9 * 1024 * 1024);
      await expectCode('a body past the parser limit', { status: 413, code: 'PAYLOAD_TOO_LARGE' },
        () => call('POST', `/merchant/shops/${shopId}/uploads`, { dataUrl: `data:image/png;base64,${overBodyLimit}` }, token));

      const res = await fetch(`${BASE}/merchant/shops/${shopId}/menu`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{"items": [' // deliberately truncated
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (data?.code) seen.add(data.code);
      check('malformed JSON → 400 BAD_JSON', res.status === 400 && data?.code === 'BAD_JSON',
        { status: res.status, code: data?.code });
    }

    // --------------------------------------------------------------- rate limit
    console.log('\nRate limiting answers with a code too');
    {
      // The sign-in limiter allows 20 per minute per ip+path; the 21st must still be
      // something the dashboard can say in Thai.
      let limited: { status: number; data: any } | null = null;
      for (let i = 0; i < 30 && !limited; i++) {
        const r = await call('POST', '/shop/auth/login', { identifier: base.phone, password: 'wrongpass' });
        if (r.status === 429) limited = r;
      }
      check('the limiter eventually answers 429 RATE_LIMITED',
        !!limited && limited.data?.code === 'RATE_LIMITED', limited?.data ?? 'never hit the limit');
    }

    // ----------------------------------------------------------- the whole shape
    console.log('\nEvery code that came back is one the dashboard knows');
    {
      const unknown = [...seen].filter(c => !isShopErrorCode(c));
      check('no response carried a code outside SHOP_ERROR_CODES', unknown.length === 0, unknown);
      // Not every code can be provoked over HTTP from here (a storage outage, a lost
      // network, a dead database). Those are listed rather than asserted, so the gap is
      // visible instead of being mistaken for coverage.
      const notExercised = SHOP_ERROR_CODES.filter(c => !seen.has(c));
      console.log(`    (${seen.size}/${SHOP_ERROR_CODES.length} codes seen over HTTP; not exercised here: ${notExercised.join(', ')})`);
    }
  } catch (err) {
    failed++;
    console.error(err);
    console.error(log);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\napi-errors: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
