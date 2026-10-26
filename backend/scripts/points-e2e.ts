/**
 * Rank points: a finished visit must move the bar, and must move it exactly once.
 *   npm run test:points
 * Temp DATA_DIR — never touches backend/data.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 3993;
const BASE = `http://127.0.0.1:${PORT}/api`;
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-points-'));
process.env.JWT_SECRET = 'points-e2e';
process.env.NODE_ENV = 'test';
process.env.LOCALITY_WORKER_ENABLED = 'false';

const express = (await import('express')).default;
const { registerCoreRoutes } = await import('../server/coreRoutes');
const { bookingQrPayload } = await import('../../shared/booking');
const { POINTS_PER_VISIT, POINTS_PER_REVIEW, POINTS_REVIEW_PHOTO_BONUS, resolveRank, RANK_TIERS } = await import('../../shared/ranks');
const { db } = await import('../server/db');
const bcrypt = (await import('bcryptjs')).default;

let passed = 0, failed = 0;
const check = (name: string, cond: unknown, extra?: unknown) => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`, extra ?? ''); }
};

const app = express();
app.use(express.json());
registerCoreRoutes(app);
const server = app.listen(PORT);

const api = async (method: string, url: string, body?: any, token?: string) => {
  const r = await fetch(BASE + url, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

const shop = db.getShops()[0];
const owner = db.getRawDb().users.find((u: any) => u.account_type === 'shop')!;
owner.owned_shops = [...new Set([...(owner.owned_shops || []), String(shop.id)])];
owner.password_hash = bcrypt.hashSync('ownerpass123', 10);
db.saveDatabase();
const sToken = (await api('POST', '/shop/auth/login', { identifier: owner.phone, password: 'ownerpass123' })).data.token;

const reg = await api('POST', '/customer/auth/register',
  { name: 'Điểm', phone: '0938444555', email: 'pt@t.vn', password: 'pass1234' });
const cToken = reg.data.token;
const uid = db.getRawDb().users.find((u: any) => u.phone === '0938444555')!.id;
const pts = async () => (await api('GET', '/me/achievements', undefined, cToken)).data.points ?? 0;

const tables = (await api('GET', `/shops/${shop.id}/tables`, undefined, cToken)).data;
const tableIds = (Array.isArray(tables) ? tables : tables.tables || []).map((t: any) => t.id);
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function visit(n: number) {
  const mk = await api('POST', '/bookings',
    { shop_id: shop.id, date: day(n + 1), time: '19:00', guests: 2, table_id: tableIds[n % tableIds.length] }, cToken);
  const id = mk.data.booking?.id;
  await api('PUT', `/merchant/bookings/${id}/status`, { status: 'confirmed' }, sToken);
  await api('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(id) }, sToken);
  return id;
}

console.log('\nĐiểm theo lượt ghé:');
check('tài khoản mới có 0 điểm', (await pts()) === 0);

const b1 = await visit(0);
check(`1 lượt check-in = ${POINTS_PER_VISIT} điểm`, (await pts()) === POINTS_PER_VISIT, await pts());

await api('PUT', `/merchant/bookings/${b1}/status`, { status: 'completed' }, sToken);
check('hoàn tất cùng lượt đó KHÔNG cộng thêm', (await pts()) === POINTS_PER_VISIT, await pts());

await api('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(b1) }, sToken);
await api('GET', '/me/achievements', undefined, cToken);
check('quét lại + tải lại trang KHÔNG cộng trùng', (await pts()) === POINTS_PER_VISIT, await pts());

await visit(1); await visit(2);
check(`3 lượt = ${3 * POINTS_PER_VISIT} điểm`, (await pts()) === 3 * POINTS_PER_VISIT, await pts());

await visit(3);
const p4 = await pts();
check(`4 lượt = ${4 * POINTS_PER_VISIT} điểm`, p4 === 4 * POINTS_PER_VISIT, p4);
check('4 lượt đủ lên bậc 2', resolveRank(p4).current.id === RANK_TIERS[1].id, resolveRank(p4).current.id);
check('thanh tiến trình nhúc nhích sau lượt đầu', resolveRank(POINTS_PER_VISIT).progressPercent > 0);

console.log('\nKhông tính lượt chưa diễn ra:');
const pending = await api('POST', '/bookings',
  { shop_id: shop.id, date: day(9), time: '20:00', guests: 2, table_id: tableIds[0] }, cToken);
check('đơn pending không cộng điểm', (await pts()) === p4, await pts());
await api('PUT', `/merchant/bookings/${pending.data.booking.id}/status`, { status: 'confirmed' }, sToken);
check('đơn confirmed (chưa quét QR) không cộng điểm', (await pts()) === p4, await pts());

console.log('\nTài khoản cũ không mất thưởng nhiệm vụ:');
const legacy = db.getRawDb().users.find((u: any) => u.account_type === 'customer' && u.id !== uid);
if (legacy) {
  legacy.points = 2000; delete (legacy as any).mission_points; db.saveDatabase();
  const { syncUserAchievements } = await import('../server/achievements');
  syncUserAchievements(legacy.id);
  const after = db.findUserById(legacy.id)!;
  check('điểm nhiệm vụ cũ được giữ', (after.mission_points ?? 0) >= 2000, after.mission_points);
  check('tổng = nhiệm vụ cũ + điểm lượt ghé', after.points >= 2000, after.points);
} else { check('bỏ qua: không có tài khoản cũ để kiểm', true); }

console.log('\nĐiểm cho bình luận (hiện trên thanh tiến trình):');
const before = await pts();
const rv = await api('POST', `/shops/${shop.id}/reviews`,
  { content: 'Quán rất ổn, cà phê ngon.', metrics: { noise: 4, seating: 5, accuracy: 5 } }, cToken);
check('đăng đánh giá thành công', rv.status === 201, rv.status + ' ' + JSON.stringify(rv.data).slice(0, 90));
check(`đánh giá cộng ${POINTS_PER_REVIEW} điểm`, (await pts()) === before + POINTS_PER_REVIEW, { got: await pts(), before });
check('API trả về points_earned để UI hiển thị', rv.data.points_earned === POINTS_PER_REVIEW, rv.data.points_earned);
check('API trả về tổng điểm mới', rv.data.points === before + POINTS_PER_REVIEW, rv.data.points);

console.log('\nPopup chỉ bật khi mở khoá THẬT:');
const { syncUserAchievements } = await import('../server/achievements');
const noop = syncUserAchievements(uid);
check('sync lại khi không có gì mới → pointsEarned = 0', noop.pointsEarned === 0, noop.pointsEarned);
check('sync lại khi không có gì mới → rankedUp = null', noop.rankedUp === null, noop.rankedUp);
check('sync lại khi không có gì mới → không có nhiệm vụ mới', noop.newlyUnlocked.length === 0, noop.newlyUnlocked);

// bước qua mốc bậc 2 và xác nhận rankedUp chỉ bật đúng một lần
const uBefore = db.findUserById(uid)!;
const curLevel = resolveRank(uBefore.points).level;
const nextTier = RANK_TIERS[curLevel + 1];
uBefore.mission_points = (uBefore.mission_points || 0) + (nextTier.minPoints - uBefore.points);
db.saveDatabase();
const up = syncUserAchievements(uid);
check('vượt mốc → rankedUp có giá trị', !!up.rankedUp, up.rankedUp);
check(`rankedUp đúng bậc kế tiếp (${nextTier.id})`, up.rankedUp?.id === nextTier.id, up.rankedUp?.id);
const again = syncUserAchievements(uid);
check('sync tiếp → rankedUp null (popup không lặp)', again.rankedUp === null, again.rankedUp);

server.close();
console.log(`\npoints: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
