/**
 * A shop's own photos: uploading them, choosing the cover, and what a guest then sees.
 *
 * The point of this suite is the seam between the two apps. The shop dashboard writes
 * `coverImage` and `images`; the customer's shop page reads them straight back out of
 * GET /api/shops/:id and builds its hero carousel from them. Nothing enforces that those
 * two agree except these routes, so they are exercised end to end here.
 *
 * It also pins the rule that these fields are NOT free text. They end up inside an
 * <img src> on a public page, so a `javascript:` or `data:` URL stored by a shop account
 * would run in every visitor's browser. The route keeps only an outside https:// address
 * or a path this server itself handed back from an upload.
 *
 *   npm run test:photos
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 3995;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-photos-'));

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

/** A real 1x1 PNG, so the upload endpoint's type sniffing sees an actual image. */
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),     // run from backend/ (npm run test:photos)
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, JWT_SECRET: 'photos-e2e', NODE_ENV: 'test' },
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

    console.log('\nAccounts');
    const shopReg = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Ảnh', phone: '0903000001', email: 'photos@shop.vn', password: 'shoppass1',
      shop: { name: 'Quán Có Ảnh', address: '5 Nguyễn Huệ' }
    });
    check('shop registers', shopReg.status === 201, shopReg.data);
    const shopId = shopReg.data.shop.id;
    const shopToken = shopReg.data.token;

    const other = await call('POST', '/shop/auth/register', {
      owner_name: 'Chủ Khác', phone: '0903000002', email: 'other@shop.vn', password: 'shoppass2',
      shop: { name: 'Quán Khác', address: '7 Lê Lợi' }
    });
    check('a second shop registers', other.status === 201);
    const otherToken = other.data.token;

    const cust = await call('POST', '/customer/auth/register', { name: 'Khách Xem', phone: '0903000003', password: 'secret1' });
    check('customer registers', cust.status === 201);
    const custToken = cust.data.token;

    console.log('\nUploading photos');
    const up1 = await call('POST', `/merchant/shops/${shopId}/uploads`, { dataUrl: PNG_1PX }, shopToken);
    check('shop uploads a photo', up1.status === 201 && /^\/api\/media\/uploads\//.test(up1.data.url), up1.data);
    const photo1 = up1.data.url;

    const up2 = await call('POST', `/merchant/shops/${shopId}/uploads`, { dataUrl: PNG_1PX }, shopToken);
    const photo2 = up2.data.url;
    check('a second upload gets its own URL', up2.status === 201 && photo2 !== photo1);

    const served = await fetch(`http://127.0.0.1:${PORT}${photo1}`);
    check('the uploaded photo is served back', served.ok && (served.headers.get('content-type') || '').startsWith('image/'));

    check('a customer account cannot upload to a shop',
      (await call('POST', `/merchant/shops/${shopId}/uploads`, { dataUrl: PNG_1PX }, custToken)).status === 403);
    check('an anonymous caller cannot upload',
      (await call('POST', `/merchant/shops/${shopId}/uploads`, { dataUrl: PNG_1PX })).status === 401);
    check('a non-image upload is refused',
      (await call('POST', `/merchant/shops/${shopId}/uploads`, { dataUrl: 'data:text/html;base64,PGgxPg==' }, shopToken)).status === 400);

    console.log('\nSaving them on the shop, cover first');
    const saved = await call('PUT', `/merchant/shops/${shopId}`, { coverImage: photo1, images: [photo1, photo2] }, shopToken);
    check('shop saves its gallery', saved.status === 200);
    check('the cover is the first photo', saved.data.shop.coverImage === photo1, saved.data.shop.coverImage);
    check('both photos are kept', JSON.stringify(saved.data.shop.images) === JSON.stringify([photo1, photo2]), saved.data.shop.images);

    // The whole point: what the guest's shop page reads.
    const seen = await call('GET', `/shops/${shopId}`);
    check('a guest sees the cover on the shop page', seen.data.shop.coverImage === photo1, seen.data.shop.coverImage);
    check('a guest sees the whole gallery', JSON.stringify(seen.data.shop.images) === JSON.stringify([photo1, photo2]));

    // Promoting the second photo is what the dashboard's "Đặt làm bìa" does.
    const swapped = await call('PUT', `/merchant/shops/${shopId}`, { coverImage: photo2, images: [photo2, photo1] }, shopToken);
    check('the shop can promote another photo to cover', swapped.data.shop.coverImage === photo2);
    const afterSwap = await call('GET', `/shops/${shopId}`);
    check('the guest sees the new cover straight away', afterSwap.data.shop.coverImage === photo2);
    check('and the carousel order follows it', afterSwap.data.shop.images[0] === photo2);

    console.log('\nThese fields are not free text');
    const beforeBad = (await call('GET', `/shops/${shopId}`)).data.shop;
    const bad = await call('PUT', `/merchant/shops/${shopId}`, {
      coverImage: 'javascript:alert(1)',
      images: ['javascript:alert(1)', 'data:text/html;base64,PGgxPg==', 'http://insecure.example.com/a.jpg', photo1]
    }, shopToken);
    check('the request itself is accepted', bad.status === 200);
    check('a javascript: cover is refused and the old one kept', bad.data.shop.coverImage === beforeBad.coverImage, bad.data.shop.coverImage);
    check('javascript:, data: and plain http: are dropped from the gallery',
      JSON.stringify(bad.data.shop.images) === JSON.stringify([photo1]), bad.data.shop.images);

    const outside = await call('PUT', `/merchant/shops/${shopId}`, {
      coverImage: 'https://images.example.com/cover.jpg',
      images: ['https://images.example.com/cover.jpg', photo1, photo1]
    }, shopToken);
    check('an outside https:// photo is still allowed', outside.data.shop.coverImage === 'https://images.example.com/cover.jpg');
    check('a repeated photo is stored once', JSON.stringify(outside.data.shop.images) === JSON.stringify(['https://images.example.com/cover.jpg', photo1]), outside.data.shop.images);

    const many = await call('PUT', `/merchant/shops/${shopId}`, {
      images: Array.from({ length: 30 }, (_, i) => `https://images.example.com/p${i}.jpg`)
    }, shopToken);
    check('the gallery is capped at 5 photos', many.data.shop.images.length === 5, many.data.shop.images.length);

    console.log('\nOne shop never edits another');
    const before = (await call('GET', `/shops/${shopId}`)).data.shop.coverImage;
    const trespass = await call('PUT', `/merchant/shops/${shopId}`, { coverImage: 'https://evil.example.com/x.jpg' }, otherToken);
    check('another shop cannot change these photos', trespass.status === 403, trespass.status);
    check('the refused write changed nothing', (await call('GET', `/shops/${shopId}`)).data.shop.coverImage === before);
    check('a customer cannot change them either',
      (await call('PUT', `/merchant/shops/${shopId}`, { coverImage: 'https://evil.example.com/x.jpg' }, custToken)).status === 403);
  } catch (err) {
    failed++;
    console.error(err);
    console.error(log);
  } finally {
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  console.log(`\nshop-photos: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
