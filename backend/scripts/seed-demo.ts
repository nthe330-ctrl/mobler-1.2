/**
 * Builds an isolated demo dataset for the public demo.
 *
 * Writes to backend/data-demo/, never to backend/data/ — the demo is started with
 * DATA_DIR pointing at that folder (the same isolation the e2e tests use), so the real
 * database.json is not touched and never leaves the machine.
 *
 * Re-running resets the demo to this clean state. Venue data (shops, tables) is carried
 * over because it is what makes the demo worth looking at; every personal record —
 * accounts, bookings, orders, reviews, favourites, notifications — is dropped and
 * replaced with two clearly-labelled demo logins.
 *
 *   npm run demo:seed
 */
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

/* package.json is "type": "module", so __dirname does not exist here. The repo's scripts
   all run from backend/ (`cd backend && tsx scripts/...`), which is what db.ts assumes too
   — but accept being run from the repo root as well. */
const CWD = process.cwd();
const ROOT = fs.existsSync(path.join(CWD, 'data', 'database.json'))
  ? CWD
  : path.join(CWD, 'backend');
const SRC = path.join(ROOT, 'data', 'database.json');
const OUT_DIR = path.join(ROOT, 'data-demo');
const OUT = path.join(OUT_DIR, 'database.json');

const DEMO_PASSWORD = 'demo1234';

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`[demo:seed] source not found: ${SRC}`);
    process.exit(1);
  }
  const db = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const now = new Date().toISOString();

  // Venue data is kept; it carries no personal information.
  const shops = Array.isArray(db.shops) ? db.shops : [];
  const ownedShopIds = shops.slice(0, 3).map((s: any) => String(s.id));

  db.users = [
    {
      id: 'demo-customer', account_type: 'customer',
      phone: '0900000001', email: 'khach@demo.mobler', password_hash: hash,
      name: 'Khách Demo', avatar: '', title: '', location: 'TP. Hồ Chí Minh',
      roles: ['customer'], activeRole: 'customer',
      owned_shops: [], staff_shops: [], badges: [], points: 0, level: 1,
      achievements: [], wallet_vouchers: [],
      notifyPromos: true, notifyBookings: true, created_at: now, updated_at: now,
    },
    {
      id: 'demo-shop', account_type: 'shop',
      phone: '0900000002', email: 'quan@demo.mobler', password_hash: hash,
      name: 'Chủ Quán Demo', avatar: '', title: '', location: 'TP. Hồ Chí Minh',
      roles: ['shop_owner'], activeRole: 'shop_owner',
      owned_shops: ownedShopIds, staff_shops: [], badges: [], points: 0, level: 1,
      achievements: [], wallet_vouchers: [],
      notifyPromos: true, notifyBookings: true, created_at: now, updated_at: now,
    },
  ];

  // Start every demo from an empty slate so the booking → check-in → review flow can be
  // walked end to end without stale records in the way.
  for (const k of ['bookings', 'orders', 'reviews', 'favorites', 'notifications']) {
    if (k in db) db[k] = [];
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(db, null, 2));

  console.log(`[demo:seed] wrote ${OUT}`);
  console.log(`[demo:seed] shops kept: ${shops.length}, personal records cleared`);
  console.log(`[demo:seed] customer login: 0900000001 / ${DEMO_PASSWORD}`);
  console.log(`[demo:seed] shop login:     0900000002 / ${DEMO_PASSWORD}  (owns shops ${ownedShopIds.join(', ')})`);
  console.log(`[demo:seed] real data at backend/data/ was not modified.`);
}

main();
