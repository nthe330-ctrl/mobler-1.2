/**
 * Does the no-show sweeper actually run?
 *
 * The sweeper lives in server/noShow.ts, but nothing releases a single table unless
 * server.ts calls startNoShowSweeper() on boot. That one line is easy to lose in a merge
 * and impossible to notice: the app keeps working, holds simply never expire. So this
 * suite asserts the wiring from the outside, through the HTTP API.
 *
 * It runs in two phases on one throwaway data directory:
 *   1. a real booking is made and confirmed through the API, then the server is stopped;
 *   2. that booking's date is moved to yesterday on disk — minutesPastHold() counts whole
 *      days, so a booking dated yesterday is past its hold whatever the wall clock says —
 *      and the server is started again with a one-second sweep interval.
 *
 * What it checks is the rule that matters: the sweeper releases the table, tells the
 * customer, and does NOT count the miss against them, because silence is not proof of
 * absence. Only a deliberate press by the shop does that.
 *
 *   npm run test:sweeper
 */
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 3996;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-sweeper-'));
const DB_FILE = path.join(dataDir, 'database.json');

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

let log = '';

/** Boot a server on the shared data directory and wait for /health. */
async function startServer(extraEnv: Record<string, string> = {}): Promise<ChildProcess> {
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(), // run from backend/ (npm run test:sweeper)
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      JWT_SECRET: 'sweeper-secret',   // the same secret both phases, so tokens survive the restart
      NODE_ENV: 'test',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout!.on('data', d => (log += d));
  server.stderr!.on('data', d => (log += d));
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) return server;
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`server did not start\n${log}`);
}

function stopServer(server: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    server.once('exit', () => resolve());
    server.kill();
    setTimeout(resolve, 3000).unref?.();
  });
}

async function main() {
  let server: ChildProcess | null = null;
  try {
    console.log('\nPhase 1 — a real confirmed booking, made through the API');
    server = await startServer();

    const cust = await call('POST', '/customer/auth/register', { name: 'Khách Quét', phone: '0902000001', password: 'secret1' });
    check('customer registers', cust.status === 201, cust.data);
    const custToken = cust.data.token;
    const custId = cust.data.user.id;

    const shopReg = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Quét', phone: '0902000002', email: 'sweeper@shop.vn', password: 'shoppass1',
      shop: { name: 'Quán Quét Bàn', address: '1 Lê Lợi' }
    });
    check('shop registers', shopReg.status === 201, shopReg.data);
    const shopId = shopReg.data.shop.id;
    const shopToken = shopReg.data.token;

    // Tomorrow, so creation is valid whatever time of day the suite runs. Phase 2 moves it.
    const tomorrow = isoInDays(1);
    const made = await call('POST', '/bookings', { shop_id: shopId, date: tomorrow, time: '12:00', guests: 2, table_id: 't1' }, custToken);
    check('booking created', made.status === 201, made.data);
    const holdId = made.data.booking.id;

    const confirmed = await call('PUT', `/merchant/bookings/${holdId}/status`, { status: 'confirmed' }, shopToken);
    check('shop confirms it, so a table is now held', confirmed.status === 200 && confirmed.data.booking.status === 'confirmed');

    // A second booking, left far in the future, proves the sweep is selective.
    const future = await call('POST', '/bookings', { shop_id: shopId, date: isoInDays(6), time: '12:00', guests: 2, table_id: 't2' }, custToken);
    check('a second booking is made for next week', future.status === 201, future.data);
    const futureId = future.data.booking.id;
    await call('PUT', `/merchant/bookings/${futureId}/status`, { status: 'confirmed' }, shopToken);

    const before = await call('GET', `/merchant/shops/${shopId}/bookings?date=${tomorrow}`, undefined, shopToken);
    check('the customer has no no-show record yet', (before.data.reliability?.[custId]?.noShows || 0) === 0);

    await stopServer(server);
    server = null;

    console.log('\nPhase 2 — the hold is in the past, and the server boots');
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    const target = db.bookings.find((b: any) => b.id === holdId);
    check('the booking was persisted to disk', !!target && target.status === 'confirmed');
    const yesterday = isoInDays(-1);
    target.date = yesterday;                    // whole days past → the hold has certainly closed
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    // One second per sweep so the test does not wait out the two-minute default.
    server = await startServer({ NO_SHOW_SWEEP_INTERVAL_MS: '1000' });

    let swept: any = null;
    for (let i = 0; i < 40; i++) {
      const mine = await call('GET', '/me/bookings', undefined, custToken);
      swept = (mine.data.bookings || []).find((b: any) => b.id === holdId);
      if (swept?.status === 'no_show') break;
      await new Promise(r => setTimeout(r, 250));
    }
    check('the sweeper released the expired hold', swept?.status === 'no_show', swept?.status);
    check('it recorded when the hold was released', !!swept?.no_show_at);
    check('the release is attributed to the system, not the shop',
      (swept?.status_history || []).some((h: any) => h.status === 'no_show' && h.by === 'system'),
      swept?.status_history);

    const tables = await call('GET', `/merchant/shops/${shopId}/tables?date=${yesterday}`, undefined, shopToken);
    check('the table is available again', tables.data.tables?.find((x: any) => x.id === 't1')?.operational_status === 'available');

    // The point of the whole design: an automatic sweep must not blame the customer.
    const after = await call('GET', `/merchant/shops/${shopId}/bookings?date=${yesterday}`, undefined, shopToken);
    check('a system sweep does NOT count against the customer', (after.data.reliability?.[custId]?.noShows || 0) === 0,
      after.data.reliability?.[custId]);

    const notes = await call('GET', '/me/notifications', undefined, custToken);
    check('the customer can see what happened to their booking', notes.status === 200 && notes.data.notifications.length > 0);

    const stillHeld = await call('GET', '/me/bookings', undefined, custToken);
    const futureNow = (stillHeld.data.bookings || []).find((b: any) => b.id === futureId);
    check('next week’s booking is untouched', futureNow?.status === 'confirmed', futureNow?.status);

    // And the shop can still take it back, exactly as with a hand-recorded no-show.
    const undo = await call('PUT', `/merchant/bookings/${holdId}/status`, { status: 'confirmed' }, shopToken);
    check('the shop can restore a hold the system released', undo.status === 200 && undo.data.booking.status === 'confirmed', undo.data);
  } catch (err) {
    failed++;
    console.error(err);
    console.error(log);
  } finally {
    if (server) await stopServer(server);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\nsweeper: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
