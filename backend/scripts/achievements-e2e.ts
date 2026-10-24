/**
 * End-to-end check of personal achievements: progress from real activity,
 * rewards (points + personal vouchers) granted once, vouchers usable once.
 *
 *   npm run test:achievements
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ACHIEVEMENTS } from '../../shared/achievements';
import { bookingQrPayload } from '../../shared/booking';
import { POINTS_PER_VISIT } from '../../shared/ranks';

/** Point value a mission is really worth, read from the mission table itself. */
const missionPoints = (id: string) => ACHIEVEMENTS.find(a => a.id === id)!.reward.points;
/** Points = mission rewards + POINTS_PER_VISIT for each checked-in booking. */
const visitPoints = (n: number) => n * POINTS_PER_VISIT;

const PORT = 3997;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-ach-'));

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

/**
 * Check a booking in the way the shop really does it: confirm, then post the guest's own
 * booking code to the check-in route. `arrived` is not reachable any other way.
 */
async function checkIn(shopToken: string, bookingId: string) {
  return call('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bookingId) }, shopToken);
}

/** Drive a booking pending → confirmed → arrived (QR scan) → completed. */
async function complete(shopToken: string, bookingId: string) {
  await call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'confirmed' }, shopToken);
  await checkIn(shopToken, bookingId);
  await call('PUT', `/merchant/bookings/${bookingId}/status`, { status: 'completed' }, shopToken);
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
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, JWT_SECRET: 'ach-e2e', NODE_ENV: 'test', LOCALITY_WORKER_ENABLED: 'false' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  server.stdout.on('data', d => (log += d));
  server.stderr.on('data', d => (log += d));
  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${BASE}/health`)).ok) break; } catch { /* not up */ }
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('\nNew account starts at zero');
    const cust = await call('POST', '/customer/auth/register', { name: 'Khách Thành Tựu', phone: '0902000001', password: 'secret1' });
    const T = cust.data.token;
    check('new customer has 0 points', cust.data.user.points === 0, cust.data.user);
    const a0 = await call('GET', '/me/achievements', undefined, T);
    check('8 achievements, all at 0 progress', a0.data.achievements.length === 8 && a0.data.achievements.every((a: any) => a.progress === 0 && !a.achieved), a0.data);
    const r0 = await call('GET', '/me/rewards', undefined, T);
    check('no reward vouchers yet', r0.data.points === 0 && r0.data.vouchers.length === 0, r0.data);
    const seeded = await call('POST', '/customer/auth/login', { identifier: '0908123789', password: '123456' });
    const sa = await call('GET', '/me/achievements', undefined, seeded.data.token);
    check('demo customer has no fake progress', sa.data.achieved === 0 && seeded.data.user.points === 0, { achieved: sa.data.achieved, points: seeded.data.user.points });

    const shop = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ', phone: '0902000099', email: 'ach@shop.vn', password: 'shoppass',
      shop: { name: 'Quán Sớm', address: '12 Lê Lợi, Bến Nghé, Quận 1, TP.HCM' }
    });
    const S = shop.data.token;
    const shopId = shop.data.shop.id;
    const ticket = await call('POST', '/realtime/ticket', undefined, T);
    const stream = openStream(`ticket=${ticket.data.ticket}`);
    await stream.ready;

    console.log('\nProgress only counts bookings the guest really checked in to');
    const date = isoInDays(2);
    const morning: string[] = [];
    for (const [i, table] of ['t1', 't2', 't3'].entries()) {
      const b = await call('POST', '/bookings', { shop_id: shopId, date, time: `0${5 + i}:00`, table_id: table, guests: 2 }, T);
      morning.push(b.data.booking.id);
    }
    const dawn = (x: any) => x.data.achievements.find((a: any) => a.id === 'ach-4');
    const a1 = await call('GET', '/me/achievements', undefined, T);
    check('pending bookings do not count yet', dawn(a1).progress === 0, dawn(a1));

    // Confirming alone must NOT count — the guest has not turned up yet.
    await call('PUT', `/merchant/bookings/${morning[0]}/status`, { status: 'confirmed' }, S);
    const a1b = await call('GET', '/me/achievements', undefined, T);
    check('confirmed alone does NOT count', dawn(a1b).progress === 0 && a1b.data.stats.shops_visited === 0, { dawn: dawn(a1b).progress, stats: a1b.data.stats });

    // The QR scan is what counts: progress moves at check-in, before "Hoàn tất".
    await checkIn(S, morning[0]);
    const a1c = await call('GET', '/me/achievements', undefined, T);
    check('a QR check-in counts straight away (1/3)', dawn(a1c).progress === 1 && a1c.data.stats.shops_visited === 1, { dawn: dawn(a1c).progress, stats: a1c.data.stats });

    // Wrapping that visit up must not count it twice, and a second visit adds exactly one.
    await call('PUT', `/merchant/bookings/${morning[0]}/status`, { status: 'completed' }, S);
    const a1d = await call('GET', '/me/achievements', undefined, T);
    check('completing a checked-in visit does not count it twice', dawn(a1d).progress === 1, dawn(a1d));
    await complete(S, morning[1]);
    const a2 = await call('GET', '/me/achievements', undefined, T);
    check('two checked-in morning visits count (2/3)', dawn(a2).progress === 2 && !dawn(a2).achieved, dawn(a2));
    check('visited-shop and district progress update on check-in', a2.data.stats.shops_visited === 1 && a2.data.stats.districts_visited === 1, a2.data.stats);

    console.log('\nCompleting the mission grants its difficulty-based reward exactly once');
    await complete(S, morning[2]);
    const ev = await stream.waitFor(e => e.event === 'achievement' && e.data.unlocked.some((u: any) => u.id === 'ach-4'));
    check('customer is notified live when the check-in unlocks it', !!ev);
    const a3 = await call('GET', '/me/achievements', undefined, T);
    check('Thợ Săn Bình Minh unlocked', dawn(a3).achieved && !!dawn(a3).unlocked_at, dawn(a3));
    const r1 = await call('GET', '/me/rewards', undefined, T);
    // 3 dawn bookings were checked in to unlock ach-4, so the total is the mission
    // reward plus those three visits.
    const dawnPts = missionPoints('ach-4') + visitPoints(3);
    check('mission reward + visit points', r1.data.points === dawnPts, { got: r1.data.points, expected: dawnPts });
    const dawnVoucher = r1.data.vouchers.find((v: any) => v.achievement_id === 'ach-4');
    check('personal BOGO voucher granted', dawnVoucher && dawnVoucher.status === 'active' && dawnVoucher.discount_type === 'bogo', r1.data.vouchers);
    await call('GET', '/me/achievements', undefined, T);
    const r2 = await call('GET', '/me/rewards', undefined, T);
    check('rewards are not granted twice', r2.data.points === dawnPts && r2.data.vouchers.length === 1, r2.data);
    check('a reload does not add visit points either', r2.data.points === dawnPts, r2.data.points);

    console.log('\nReward vouchers are personal and single-use');
    const anon = await call('POST', '/vouchers/validate', { code: dawnVoucher.code, shop_id: shopId, order_value: 100000 });
    check('other people cannot use the voucher', anon.status === 404);
    const ok = await call('POST', '/vouchers/validate', { code: dawnVoucher.code, shop_id: shopId, order_value: 100000 }, T);
    check('owner can validate it', ok.status === 200 && ok.data.calculatedDiscount > 0, ok.data);
    const low = await call('POST', '/vouchers/validate', { code: dawnVoucher.code, shop_id: shopId, order_value: 20000 }, T);
    check('minimum order enforced', low.status === 400);
    const used = await call('POST', '/bookings', {
      shop_id: shopId, date: isoInDays(3), time: '10:00', table_id: 't4', guests: 2,
      order: { items: [{ name: 'Cà phê', quantity: 2, price: 45000 }], subtotal: 90000, total: 90000 },
      deposit_fee: 20000, voucher_applied: { code: dawnVoucher.code, discount: 999999 }, discount_amount: 999999, grand_total: 1
    }, T);
    check('discount recomputed by the server (not client-supplied)', used.data.booking.discount_amount === 45000 && used.data.booking.grand_total === 65000, used.data.booking);
    const r3 = await call('GET', '/me/rewards', undefined, T);
    check('voucher marked used', r3.data.vouchers[0].status === 'used');
    const again = await call('POST', '/vouchers/validate', { code: dawnVoucher.code, shop_id: shopId, order_value: 100000 }, T);
    check('used voucher cannot be reused', again.status === 404);
    const fake = await call('POST', '/bookings', { shop_id: shopId, date: isoInDays(3), time: '14:00', table_id: 't5', guests: 2, deposit_fee: 20000, voucher_applied: { code: 'KHONGCO', discount: 50000 }, discount_amount: 50000 }, T);
    check('unknown voucher codes give no discount', fake.data.booking.discount_amount === 0 && !fake.data.booking.voucher_applied, fake.data.booking);

    console.log('\nMissions need a real QR check-in, and pay for it exactly once');
    const night = await call('POST', '/bookings', { shop_id: shopId, date, time: '23:00', table_id: 't6', guests: 2 }, T);
    const nightId = night.data.booking.id;
    await call('PUT', `/merchant/bookings/${nightId}/status`, { status: 'confirmed' }, S);
    const owl = (x: any) => x.data.achievements.find((a: any) => a.id === 'ach-8');
    const n1 = await call('GET', '/me/achievements', undefined, T);
    check('confirmed alone does not complete the night mission', !owl(n1).achieved, owl(n1));
    const forced = await call('PUT', `/merchant/bookings/${nightId}/status`, { status: 'arrived' }, S);
    check('the shop cannot mark arrival without the guest code', forced.status === 403 && forced.data.code === 'CHECKIN_REQUIRES_SCAN', forced.data);
    const nn1 = await call('GET', '/me/achievements', undefined, T);
    check('the refused attempt granted nothing', !owl(nn1).achieved, owl(nn1));
    await checkIn(S, nightId);
    const n2 = await call('GET', '/me/achievements', undefined, T);
    check('Cú Đêm unlocked at the QR check-in', owl(n2).achieved, owl(n2));
    const r4 = await call('GET', '/me/rewards', undefined, T);
    // + the night booking's own visit (4 checked-in visits in total by now)
    const expected4 = dawnPts + missionPoints('ach-8') + visitPoints(1);
    check('points = missions + one point award per visit', r4.data.points === expected4, { got: r4.data.points, expected: expected4 });
    await checkIn(S, nightId); // re-scan
    await call('PUT', `/merchant/bookings/${nightId}/status`, { status: 'completed' }, S);
    const r4b = await call('GET', '/me/rewards', undefined, T);
    check('re-scanning and completing pay nothing extra', r4b.data.points === expected4, { got: r4b.data.points, expected: expected4 });
    const n3b = await call('GET', '/me/achievements', undefined, T);
    check('the night visit is still counted once', n3b.data.stats.night_bookings === 1, n3b.data.stats);

    console.log('\nReviews and photos');
    /* Images must now be uploaded through /api/me/uploads first: the review route keeps
       only URLs this server issued, so arbitrary off-site links no longer stick. */
    const PNG = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
    const up1 = await call('POST', '/me/uploads', { dataUrl: PNG }, T);
    const up2 = await call('POST', '/me/uploads', { dataUrl: PNG }, T);
    check('guest can upload review photos', up1.status === 201 && up2.status === 201, [up1.status, up2.status]);
    const rv = await call('POST', `/shops/${shopId}/reviews`, { content: 'Quán đẹp', images: [up1.data.url, up2.data.url] }, T);
    check('review accepted', rv.status === 201);
    check('off-site image URLs are dropped', !JSON.stringify(rv.data.review?.images || []).includes('example.com'), rv.data.review?.images);
    const n3 = await call('GET', '/me/achievements', undefined, T);
    check('review-with-photo and photo counts update', n3.data.stats.reviews_with_photo === 1 && n3.data.stats.photos_posted === 2, n3.data.stats);
    const cancelled = await call('POST', '/bookings', { shop_id: shopId, date: isoInDays(4), time: '06:30', table_id: 't7', guests: 2 }, T);
    await call('PUT', `/bookings/${cancelled.data.booking.id}/cancel`, {}, T);
    const n4 = await call('GET', '/me/achievements', undefined, T);
    check('cancelled bookings never count', n4.data.stats.morning_bookings === 3, n4.data.stats);
    check('shop accounts cannot read customer achievements', (await call('GET', '/me/achievements', undefined, S)).status === 403);
    stream.close();
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
