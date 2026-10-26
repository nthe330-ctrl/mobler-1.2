/**
 * A shop's currency setting, and the promise that changing it never rewrites money.
 *
 * Mobler stores every amount as a plain number. Nothing in the number says whether 350
 * means dong, baht or US dollars — that comes from the record it belongs to. So the
 * whole design rests on two things this suite exists to hold in place:
 *
 *   1. An order is stamped with the shop's currency AT THE MOMENT IT IS CREATED, and
 *      keeps that stamp forever. A café that opens in Hanoi, bills 45,000 ₫ orders, then
 *      moves to Taipei and switches to TWD must not find its old orders restated as
 *      NT$45,000 — that is a 40x error in its own books.
 *   2. Changing the setting converts nothing. Menu prices are numbers the shop typed;
 *      after a currency change they are read in the new currency, which is why the
 *      dashboard warns before saving. This suite pins that the numbers are untouched, so
 *      the warning stays true.
 *
 * Plus the ordinary guards: only the four supported ISO codes, only this shop's staff.
 *
 *   npm run test:currency
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { formatMoney, isCurrencyCode, CURRENCY_CODES } from '../../shared/currency';

const PORT = 3994;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-currency-'));

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

function isoInDays(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),     // run from backend/ (npm run test:currency)
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, JWT_SECRET: 'currency-e2e', NODE_ENV: 'test' },
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

    console.log('\nFormatting — one amount, four currencies, four languages');
    {
      // The symbol has to identify the currency on its own, because the dashboard shows
      // a price with no code beside it. A bare "$" for both USD and TWD would not.
      // Intl puts U+00A0 between number and symbol so the pair never breaks across lines.
      // The expectations below spell it out rather than a plain space.
      check('VND in Vietnamese', formatMoney(45000, 'VND', 'vi') === '45.000\u00A0₫', formatMoney(45000, 'VND', 'vi'));
      check('USD keeps its two decimals', formatMoney(12.5, 'USD', 'en') === '$12.50', formatMoney(12.5, 'USD', 'en'));
      check('TWD is NT$, never a bare $', formatMoney(350, 'TWD', 'en') === 'NT$350', formatMoney(350, 'TWD', 'en'));
      check('TWD stays NT$ in Chinese too', formatMoney(350, 'TWD', 'zh-TW') === 'NT$350', formatMoney(350, 'TWD', 'zh-TW'));
      check('THB is ฿, not the letters THB', formatMoney(120, 'THB', 'en') === '฿120', formatMoney(120, 'THB', 'en'));
      check('THB in Thai', formatMoney(120, 'THB', 'th') === '฿120', formatMoney(120, 'THB', 'th'));
      check('USD and TWD can never be confused',
        formatMoney(350, 'USD', 'en') !== formatMoney(350, 'TWD', 'en'));
      check('grouping follows the reader’s language',
        formatMoney(1234567, 'VND', 'vi') === '1.234.567\u00A0₫' && formatMoney(1234567, 'VND', 'en') === '₫1,234,567',
        [formatMoney(1234567, 'VND', 'vi'), formatMoney(1234567, 'VND', 'en')]);
      check('a missing currency reads as the default, not a crash', formatMoney(1000, undefined as any, 'vi') === '1.000\u00A0₫');
      check('a nonsense currency reads as the default too', formatMoney(1000, 'XXX' as any, 'vi') === '1.000\u00A0₫');
      check('NTD is not a storable code (TWD is)', !isCurrencyCode('NTD') && isCurrencyCode('TWD'));
      check('exactly four currencies are offered', CURRENCY_CODES.length === 4);
    }

    console.log('\nAccounts');
    const shopReg = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Tiền', phone: '0904000001', email: 'cur@shop.vn', password: 'shoppass1',
      shop: { name: 'Quán Đổi Tiền', address: '1 Trần Phú' }
    });
    check('shop registers', shopReg.status === 201, shopReg.data);
    const shopId = shopReg.data.shop.id;
    const shopToken = shopReg.data.token;
    check('a new shop already names its currency', shopReg.data.shop.currency_code === 'VND', shopReg.data.shop.currency_code);

    const other = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Khác', phone: '0904000002', email: 'cur2@shop.vn', password: 'shoppass2',
      shop: { name: 'Quán Bên Cạnh', address: '2 Trần Phú' }
    });
    const otherToken = other.data.token;
    const cust = await call('POST', '/customer/auth/register', { name: 'Khách Tiền', phone: '0904000003', password: 'secret1' });
    const custToken = cust.data.token;
    check('customer registers', cust.status === 201);

    console.log('\nOnly the four codes, and only this shop’s staff');
    for (const bad of ['NTD', 'usd', 'EUR', '', 'VND ', 123]) {
      const r = await call('PUT', `/merchant/shops/${shopId}`, { currency_code: bad }, shopToken);
      check(`"${String(bad)}" is refused`, r.status === 400 && r.data.code === 'BAD_CURRENCY', r.status);
    }
    check('the refused writes left the currency alone',
      (await call('GET', `/shops/${shopId}`)).data.shop.currency_code === 'VND');
    check('another shop cannot change this one',
      (await call('PUT', `/merchant/shops/${shopId}`, { currency_code: 'USD' }, otherToken)).status === 403);
    check('a customer cannot change it',
      (await call('PUT', `/merchant/shops/${shopId}`, { currency_code: 'USD' }, custToken)).status === 403);
    check('an anonymous caller cannot change it',
      (await call('PUT', `/merchant/shops/${shopId}`, { currency_code: 'USD' })).status === 401);

    console.log('\nAn order keeps the currency it was taken in');
    // A real order, created while the shop is still on VND.
    const menu = await call('PUT', `/merchant/shops/${shopId}/menu`, {
      items: [{ id: 'm1', name: 'Cà phê sữa', price: 45000, stock: 50, category: 'Cà phê', isAvailable: true }]
    }, shopToken);
    check('shop publishes a 45,000 menu item', menu.status === 200 && menu.data.items[0].price === 45000);

    const made = await call('POST', '/orders', {
      shop_id: shopId, table_id: 't1',
      items: [{ id: 'm1', name: 'Cà phê sữa', price: 45000, quantity: 2 }]
    }, custToken);
    check('customer places an order', made.status === 201, made.data);
    const orderId = made.data.order?.id;
    const orderTotal = made.data.order?.total;
    check('the order is stamped VND at creation', made.data.order?.currency_code === 'VND', made.data.order?.currency_code);
    check('its total is the plain number', orderTotal === 90000, orderTotal);

    // The shop moves to Taipei.
    const moved = await call('PUT', `/merchant/shops/${shopId}`, { currency_code: 'TWD' }, shopToken);
    check('shop switches to TWD', moved.status === 200 && moved.data.shop.currency_code === 'TWD');

    const after = await call('GET', '/me/orders', undefined, custToken);
    const sameOrder = (after.data.orders || []).find((o: any) => o.id === orderId);
    check('the old order is STILL stamped VND', sameOrder?.currency_code === 'VND', sameOrder?.currency_code);
    check('and its amount was not touched', sameOrder?.total === 90000, sameOrder?.total);
    check('so it still reads as dong, not 90,000 Taiwan dollars',
      formatMoney(sameOrder?.total, sameOrder?.currency_code, 'vi') === '90.000\u00A0₫',
      formatMoney(sameOrder?.total, sameOrder?.currency_code, 'vi'));

    console.log('\nChanging the currency converts nothing');
    const menuAfter = await call('GET', `/merchant/shops/${shopId}/menu`, undefined, shopToken);
    check('the menu price is the same number as before', menuAfter.data.items[0].price === 45000, menuAfter.data.items[0].price);
    // This is the honest consequence the dashboard warns about, pinned as a fact:
    check('which now READS as NT$45,000 — a relabel, not a conversion',
      formatMoney(45000, 'TWD', 'en') === 'NT$45,000');

    const nextOrder = await call('POST', '/orders', {
      shop_id: shopId, table_id: 't2',
      items: [{ id: 'm1', name: 'Cà phê sữa', price: 45000, quantity: 1 }]
    }, custToken);
    check('an order placed after the switch is stamped TWD', nextOrder.data.order?.currency_code === 'TWD', nextOrder.data.order?.currency_code);
    check('the two orders carry different currencies side by side',
      sameOrder?.currency_code === 'VND' && nextOrder.data.order?.currency_code === 'TWD');

    console.log('\nAn order created from a booking is stamped the same way');
    {
      // Orders reach the database by two different routes: the customer's own order call,
      // and a booking that carried a pre-order. The second one is easy to miss when adding
      // a field — it did not have the stamp until this case was written.
      const tomorrow = isoInDays(1);
      const booked = await call('POST', '/bookings', {
        shop_id: shopId, date: tomorrow, time: '10:00', guests: 2, table_id: 't3',
        order: { items: [{ id: 'm1', name: 'Cà phê sữa', price: 45000, quantity: 1 }], total: 45000 }
      }, custToken);
      check('customer books a table with a pre-order', booked.status === 201, booked.data);

      const mine = await call('GET', '/me/orders', undefined, custToken);
      const fromBooking = (mine.data.orders || []).find((o: any) => o.booking_id === booked.data.booking?.id);
      check('the booking produced an order', !!fromBooking, (mine.data.orders || []).length);
      // The shop is on TWD by this point in the suite.
      check('and that order carries a currency too', !!fromBooking?.currency_code, fromBooking?.currency_code);
      check('namely the shop’s currency at the time it was taken',
        fromBooking?.currency_code === 'TWD', fromBooking?.currency_code);

      // The BOOKING itself carries money too — a deposit, a pre-order total, a discount —
      // so it needs its own stamp for the same reason the order does. Reading those amounts
      // in the shop's current currency would restate a 45,000₫ pre-order as NT$45,000 the
      // moment the shop switched.
      const bookingRow = booked.data.booking;
      check('the booking itself is stamped as well', !!bookingRow?.currency_code, bookingRow?.currency_code);
      check('with the currency in force when it was made',
        bookingRow?.currency_code === 'TWD', bookingRow?.currency_code);

      // And the stamp must survive the shop changing its mind afterwards.
      await call('PUT', `/merchant/shops/${shopId}`, { currency_code: 'THB' }, shopToken);
      const afterSwitch = await call('GET', `/me/bookings`, undefined, custToken);
      const stillThere = (afterSwitch.data.bookings || []).find((b: any) => b.id === bookingRow?.id);
      check('changing the shop currency does not restate an existing booking',
        stillThere?.currency_code === 'TWD', stillThere?.currency_code);
      // The pre-order total is where the money actually sits on this booking: grand_total
      // is derived from order.subtotal, which this request did not send, so it is 0 here.
      // (The dashboard already reads `grand_total || order.total` for that reason.)
      check('its amounts are the same numbers as before',
        stillThere?.order?.total === 45000, stillThere?.order?.total);
      // Put the shop back where the rest of the suite expects it.
      await call('PUT', `/merchant/shops/${shopId}`, { currency_code: 'TWD' }, shopToken);
    }

    console.log('\nThe setting lives in the database, not the browser');
    check('a guest reading the shop page sees the shop currency',
      (await call('GET', `/shops/${shopId}`)).data.shop.currency_code === 'TWD');
    // Restarting the process is the real test of persistence.
    server.kill();
    await new Promise(r => setTimeout(r, 1200));
    const again = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, JWT_SECRET: 'currency-e2e', NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    again.stdout.on('data', d => (log += d));
    again.stderr.on('data', d => (log += d));
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${BASE}/health`)).ok) break; } catch { /* not up yet */ }
      await new Promise(r => setTimeout(r, 200));
    }
    const reread = await call('GET', `/shops/${shopId}`);
    check('the currency survives a server restart', reread.data.shop.currency_code === 'TWD', reread.data.shop.currency_code);
    const ordersAgain = await call('GET', '/me/orders', undefined, custToken);
    check('and so does each order’s own currency',
      (ordersAgain.data.orders || []).find((o: any) => o.id === orderId)?.currency_code === 'VND');
    again.kill();
  } catch (err) {
    failed++;
    console.error(err);
    console.error(log);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\ncurrency: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
