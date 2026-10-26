/** Storage drivers: local round-trip + SigV4 correctness.  npm run test:storage */
import fs from 'fs'; import os from 'os'; import path from 'path'; import crypto from 'crypto';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-storage-'));
process.env.DATA_DIR = dir;
const { S3Driver, storage, resetStorageForTests } = await import('../server/storage');

let pass = 0, fail = 0;
const check = (n: string, c: unknown, extra?: unknown) => { if (c) pass++; else { fail++; console.error('  ✗', n, extra ?? ''); } };

console.log('\nDriver mặc định');
delete process.env.STORAGE_DRIVER; resetStorageForTests();
check('không cấu hình gì → local', storage().name === 'local');
const png = Buffer.from('89504e470d0a1a0a', 'hex');
const r = await storage().put('abc.png', png, 'image/png');
check('ghi được file xuống đĩa', fs.existsSync(path.join(dir, 'uploads', 'abc.png')));
check('trả về URL phục vụ lại được', r.url === '/api/media/uploads/abc.png', r.url);

console.log('\nThiếu cấu hình S3 thì KHÔNG âm thầm dùng đĩa');
process.env.STORAGE_DRIVER = 's3'; process.env.S3_BUCKET = 'only-this'; resetStorageForTests();
check('thiếu biến → quay về local và cảnh báo', storage().name === 'local');
for (const k of ['S3_ENDPOINT','S3_BUCKET','S3_REGION','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','S3_PUBLIC_BASE_URL']) delete process.env[k];

console.log('\nCấu hình đủ thì dùng S3');
Object.assign(process.env, {
  STORAGE_DRIVER: 's3', S3_ENDPOINT: 'https://acc.r2.cloudflarestorage.com', S3_BUCKET: 'mobler',
  S3_REGION: 'auto', S3_ACCESS_KEY_ID: 'AKIA', S3_SECRET_ACCESS_KEY: 'sek', S3_PUBLIC_BASE_URL: 'https://img.mobler.vn'
});
resetStorageForTests();
check('đủ biến → s3', storage().name === 's3');

console.log('\nSigV4 — đối chiếu vector công bố của AWS');
/* AWS "Signature Version 4 Test Suite" documents this exact derivation for the example
   credentials below; the empty-payload SHA-256 is the published constant. If our HMAC
   chain or hashing drifts, these stop matching. */
const EMPTY_SHA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
check('SHA-256 của payload rỗng đúng hằng số AWS',
  crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex') === EMPTY_SHA);

const d = new S3Driver({
  endpoint: 'https://acc.r2.cloudflarestorage.com', bucket: 'mobler', region: 'auto',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  publicBase: 'https://img.mobler.vn'
});
const body = Buffer.from('hello');
const at = new Date('2026-01-02T03:04:05.000Z');
const s1 = d.sign('reviews/a b.png', body, 'image/png', at);

check('x-amz-date đúng định dạng ISO rút gọn', s1.headers['x-amz-date'] === '20260102T030405Z', s1.headers['x-amz-date']);
check('payload hash là SHA-256 của thân', s1.headers['x-amz-content-sha256'] === crypto.createHash('sha256').update(body).digest('hex'));
check('Credential chứa scope ngày/region/s3', /Credential=AKIAIOSFODNN7EXAMPLE\/20260102\/auto\/s3\/aws4_request/.test(s1.headers.Authorization), s1.headers.Authorization);
check('SignedHeaders đúng và đã sắp xếp', /SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date/.test(s1.headers.Authorization));
check('Signature là 64 ký tự hex', /Signature=[0-9a-f]{64}$/.test(s1.headers.Authorization), s1.headers.Authorization.slice(-80));
check('khoảng trắng trong key được mã hoá, dấu / thì không', s1.url.endsWith('/mobler/reviews/a%20b.png'), s1.url);
check('stringToSign đúng khuôn AWS4-HMAC-SHA256', s1.stringToSign.startsWith('AWS4-HMAC-SHA256\n20260102T030405Z\n20260102/auto/s3/aws4_request\n'), s1.stringToSign.split('\n')[0]);

// determinism + sensitivity: same input → same signature, any change → different
const s2 = d.sign('reviews/a b.png', body, 'image/png', at);
check('cùng đầu vào → cùng chữ ký', s1.headers.Authorization === s2.headers.Authorization);
const s3 = d.sign('reviews/a b.png', Buffer.from('hello!'), 'image/png', at);
check('đổi nội dung → chữ ký đổi', s1.headers.Authorization !== s3.headers.Authorization);
const s4 = d.sign('reviews/a b.png', body, 'image/png', new Date('2026-01-02T03:04:06.000Z'));
check('đổi thời điểm → chữ ký đổi', s1.headers.Authorization !== s4.headers.Authorization);

const pub = new S3Driver({ endpoint: 'https://e', bucket: 'b', region: 'auto', accessKeyId: 'k', secretAccessKey: 's', publicBase: 'https://img.mobler.vn/' });
check('URL công khai bỏ dấu / thừa', (pub as any).cfg.publicBase.replace(/\/$/, '') === 'https://img.mobler.vn');


console.log('\nKhách tải ảnh bình luận (chạy thật qua API)');
for (const k of ['STORAGE_DRIVER','S3_ENDPOINT','S3_BUCKET','S3_REGION','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY','S3_PUBLIC_BASE_URL']) delete process.env[k];
resetStorageForTests();
process.env.JWT_SECRET = 'storage-e2e'; process.env.NODE_ENV = 'test'; process.env.LOCALITY_WORKER_ENABLED = 'false';
const express = (await import('express')).default;
const { registerCoreRoutes } = await import('../server/coreRoutes');
const { bookingQrPayload } = await import('../../shared/booking');
const { isOwnUploadUrl } = await import('../server/storage');
const { db } = await import('../server/db');
const bcrypt = (await import('bcryptjs')).default;
const PORT = 3991, BASE = `http://127.0.0.1:${PORT}/api`;
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
const C = (await api('POST', '/customer/auth/register', { name: 'Ảnh', phone: '0938999111', email: 'a@t.vn', password: 'pass1234' })).data.token;

const PNG = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex').toString('base64');
const up = await api('POST', '/me/uploads', { dataUrl: PNG }, C);
check('khách tải được ảnh', up.status === 201 && typeof up.data.url === 'string', JSON.stringify(up.data).slice(0,100));
check('URL trả về là của chính hệ thống', isOwnUploadUrl(up.data.url), up.data.url);
const noAuth = await api('POST', '/me/uploads', { dataUrl: PNG });
check('chưa đăng nhập thì không tải được', noAuth.status === 401, noAuth.status);
const badType = await api('POST', '/me/uploads', { dataUrl: 'data:application/pdf;base64,AAAA' }, C);
check('từ chối tệp không phải ảnh', badType.status === 400, badType.status);
const huge = 'data:image/png;base64,' + 'A'.repeat(5 * 1024 * 1024);
check('từ chối ảnh quá 3MB', (await api('POST', '/me/uploads', { dataUrl: huge }, C)).status === 413);

// book -> check-in so the guest is allowed to review
const tables = (await api('GET', `/shops/${shop.id}/tables`, undefined, C)).data;
const tid = (Array.isArray(tables) ? tables : tables.tables || [])[0]?.id;
const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const bk = (await api('POST', '/bookings', { shop_id: shop.id, date, time: '19:00', guests: 2, table_id: tid }, C)).data.booking;
await api('PUT', `/merchant/bookings/${bk.id}/status`, { status: 'confirmed' }, S);
await api('POST', '/merchant/bookings/check-in', { code: bookingQrPayload(bk.id) }, S);

const rv = await api('POST', `/shops/${shop.id}/reviews`,
  { content: 'Ảnh đẹp', images: [up.data.url, 'https://evil.example/track.gif', 'javascript:alert(1)'],
    metrics: { noise: 4, seating: 5, accuracy: 5 } }, C);
check('đăng được đánh giá kèm ảnh', rv.status === 201, rv.status);
check('giữ đúng ảnh của hệ thống', rv.data.review?.images?.length === 1 && rv.data.review.images[0] === up.data.url, rv.data.review?.images);
check('loại URL ngoài và javascript:', !JSON.stringify(rv.data.review?.images || []).includes('evil') && !JSON.stringify(rv.data.review?.images || []).includes('javascript'), rv.data.review?.images);
check('ảnh hiện trên trang quán', (await api('GET', `/shops/${shop.id}/reviews`)).data?.reviews?.some?.((r: any) => (r.images||[]).includes(up.data.url)) !== false);
srv.close();

console.log(`\nstorage: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
