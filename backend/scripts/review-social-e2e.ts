/** Ảnh, like và bình luận trên đánh giá.  npm run test:social */
import fs from 'fs'; import os from 'os'; import path from 'path';
const PORT = 3990, BASE = `http://127.0.0.1:${PORT}/api`;
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-social-'));
process.env.JWT_SECRET = 'social'; process.env.NODE_ENV = 'test'; process.env.LOCALITY_WORKER_ENABLED = 'false';
const express = (await import('express')).default;
const { registerCoreRoutes } = await import('../server/coreRoutes');
const { bookingQrPayload } = await import('../../shared/booking');
const { db } = await import('../server/db');
const bcrypt = (await import('bcryptjs')).default;
let pass = 0, fail = 0;
const check = (n: string, c: unknown, x?: unknown) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}`, x ?? ''); } };
const app = express(); app.use(express.json({ limit: '6mb' })); registerCoreRoutes(app);
const srv = app.listen(PORT);
const api = async (m: string, u: string, b?: any, t?: string) => {
  const r = await fetch(BASE + u, { method: m, body: b ? JSON.stringify(b) : undefined,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) } });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const shop = db.getShops()[0];
const owner = db.getRawDb().users.find((u: any) => u.account_type === 'shop')!;
owner.owned_shops = [...new Set([...(owner.owned_shops || []), String(shop.id)])];
owner.password_hash = bcrypt.hashSync('op123456', 10); db.saveDatabase();
const S = (await api('POST', '/shop/auth/login', { identifier: owner.phone, password: 'op123456' })).data.token;
const mkCustomer = async (phone: string, name: string) =>
  (await api('POST', '/customer/auth/register', { name, phone, email: `${phone}@t.vn`, password: 'pass1234' })).data.token;
const A = await mkCustomer('0938100001', 'Khách A');
const B = await mkCustomer('0938100002', 'Khách B');

const tables = (await api('GET', `/shops/${shop.id}/tables`, undefined, A)).data;
const tid = (Array.isArray(tables) ? tables : tables.tables || [])[0]?.id;
const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const bk = (await api('POST', '/bookings', { shop_id: shop.id, date, time: '19:00', guests: 2, table_id: tid }, A)).data.booking;
await api('PUT', `/merchant/bookings/${bk.id}/status`, { status: 'confirmed' }, S);
await api('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bk.id) }, S);

console.log('\nẢnh đi kèm đánh giá');
const PNG = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
const up = (await api('POST', '/me/uploads', { dataUrl: PNG }, A)).data.url;
const rv = (await api('POST', `/shops/${shop.id}/reviews`, { content: 'Ảnh đây', images: [up], metrics: { noise: 4, seating: 5, accuracy: 5 } }, A)).data;
const rid = rv.review.id;
check('đánh giá lưu được ảnh', rv.review.images?.[0] === up, rv.review.images);

console.log('\nẢnh hiện trên trang quán — người khác xem được');
const pub = await api('GET', `/shops/${shop.id}/reviews`, undefined, B);
const seen = pub.data.reviews.find((r: any) => r.id === rid);
check('khách B thấy đánh giá kèm ảnh', seen?.images?.[0] === up, seen?.images);
check('khách B chưa like thì likedByMe = false', seen?.likedByMe === false, seen?.likedByMe);
const anon = await api('GET', `/shops/${shop.id}/reviews`);
check('khách vãng lai (chưa đăng nhập) cũng xem được', anon.status === 200 && anon.data.reviews.length > 0, anon.status);

console.log('\nLike');
const l1 = await api('POST', `/reviews/${rid}/like`, {}, B);
check('like được', l1.data.likes === 1 && l1.data.likedByMe === true, l1.data);
const l2 = await api('POST', `/reviews/${rid}/like`, {}, B);
check('bấm lần nữa là bỏ like (không cộng dồn)', l2.data.likes === 0 && l2.data.likedByMe === false, l2.data);
await api('POST', `/reviews/${rid}/like`, {}, B);
await api('POST', `/reviews/${rid}/like`, {}, A);
const after = (await api('GET', `/shops/${shop.id}/reviews`, undefined, A)).data.reviews.find((r: any) => r.id === rid);
check('hai người like → đếm 2', after.likes === 2, after.likes);
check('mỗi người chỉ tính một lần', new Set(after.liked_by).size === after.liked_by.length, after.liked_by);
check('chưa đăng nhập thì không like được', (await api('POST', `/reviews/${rid}/like`, {})).status === 401);
check('đánh giá không tồn tại → 404', (await api('POST', '/reviews/khong-co/like', {}, B)).status === 404);

console.log('\nBình luận');
const c1 = await api('POST', `/reviews/${rid}/comments`, { content: 'Quán này đẹp thật' }, B);
check('bình luận được', c1.status === 201 && c1.data.comments === 1, c1.data);
check('bình luận ghi đúng người viết', c1.data.comment?.userName === 'Khách B', c1.data.comment);
check('bình luận rỗng bị từ chối', (await api('POST', `/reviews/${rid}/comments`, { content: '   ' }, B)).status === 400);
check('bình luận quá 500 ký tự bị từ chối', (await api('POST', `/reviews/${rid}/comments`, { content: 'x'.repeat(501) }, B)).status === 400);
await api('POST', `/reviews/${rid}/comments`, { content: 'Mình cũng thấy vậy' }, A);
const withC = (await api('GET', `/shops/${shop.id}/reviews`, undefined, A)).data.reviews.find((r: any) => r.id === rid);
check('đếm đúng 2 bình luận', withC.comments === 2 && withC.comment_list.length === 2, withC.comments);

console.log('\nNhật ký check-in (dữ liệu thật của chính mình)');
const mine = await api('GET', '/me/reviews', undefined, A);
check('trả về đánh giá của chính mình', mine.data.reviews.length === 1 && mine.data.reviews[0].id === rid, mine.data.reviews?.length);
check('kèm ảnh', mine.data.reviews[0].images?.[0] === up);
check('kèm tên quán để hiển thị', !!mine.data.reviews[0].shop_name, mine.data.reviews[0].shop_name);
const mineB = await api('GET', '/me/reviews', undefined, B);
check('không thấy đánh giá của người khác', mineB.data.reviews.length === 0, mineB.data.reviews?.length);

srv.close();
console.log(`\nreview-social: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
