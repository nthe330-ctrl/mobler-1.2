/**
 * End-to-end check of the locality data pipeline:
 * internal-first search → idempotent enrichment queue → worker + adapters →
 * quality gate (cafés only, ≥3 photos, ≥10 reviews) → admin review → reuse.
 *
 *   npm run test:locality
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 3998;
const BASE = `http://127.0.0.1:${PORT}/api`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mobler-locality-'));
const dataDir = path.join(tmp, 'data');
const importDir = path.join(tmp, 'import');
fs.mkdirSync(importDir, { recursive: true });

// Rights file for the test: the real registry + one verified origin and one unknown origin.
const rights = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config', 'source-rights.json'), 'utf-8'));
rights.origins.partner_websites = {
  label: 'Website của quán đối tác (test)',
  business_data: 'granted',
  photos: 'granted',
  reviews: 'unverified',
  redistribute: 'granted',
  retention_days: 30,
  basis: 'test',
  verified_by: 'test',
  verified_at: '2026-10-09'
};
const rightsFile = path.join(tmp, 'rights.json');
fs.writeFileSync(rightsFile, JSON.stringify(rights));

// Cells far from the seeded partner shops (Hà Nội) so counts are predictable.
const CELL = 'c2102_10585';
const IMPORT_CELL = 'c2110_10590';

// Import files (as a GPM Automate export would produce)
const imp = (origin: string, name: string, lat: number, lng: number) => ({
  format: 'mobler-locality-import/v1',
  origin,
  generator: 'test',
  exported_at: new Date().toISOString(),
  places: [{
    name, address: 'Hà Nội', lat, lng, categories: ['cafe'],
    photos: [1, 2, 3, 4].map(i => ({ url: `https://example.com/${name.replace(/\s/g, '')}-${i}.jpg` })),
    reviews: Array.from({ length: 12 }, (_, i) => ({ rating: 5, text: `Review ${i}`, author: `A${i}` }))
  }]
});
fs.writeFileSync(path.join(importDir, 'google.json'), JSON.stringify(imp('google_maps', 'Scraped Cafe', 21.1055, 105.9055)));
fs.writeFileSync(path.join(importDir, 'unknown.json'), JSON.stringify(imp('some_site', 'Unknown Cafe', 21.1056, 105.9056)));
fs.writeFileSync(path.join(importDir, 'partner.json'), JSON.stringify(imp('partner_websites', 'Partner Site Cafe', 21.1057, 105.9057)));

let passed = 0;
let failed = 0;
function check(name: string, cond: unknown, extra?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`, extra === undefined ? '' : JSON.stringify(extra).slice(0, 600)); }
}
async function call(method: string, url: string, body?: unknown, token?: string, headers: Record<string, string> = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual'
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as any };
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function waitFor(fn: () => Promise<boolean>, ms = 15000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await fn()) return true;
    await sleep(200);
  }
  return false;
}

async function main() {
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: dataDir,
      JWT_SECRET: 'locality-e2e',
      NODE_ENV: 'test',
      LOCALITY_WORKER_INTERVAL_SEC: '1',
      LOCALITY_OSM_ENABLED: 'false', // no network in CI
      LOCALITY_SOURCES: 'mock_dev,osm,file_import',
      LOCALITY_IMPORT_DIR: importDir,
      LOCALITY_RIGHTS_FILE: rightsFile,
      LOCALITY_SEARCH_CACHE_TTL_SEC: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  server.stdout.on('data', d => (log += d));
  server.stderr.on('data', d => (log += d));

  try {
    await waitFor(async () => { try { return (await fetch(`${BASE}/health`)).ok; } catch { return false; } }, 30000);

    console.log('\nInternal-first search & idempotent queue');
    const s1 = await call('GET', `/locality/search?cell=${CELL}&q=cà phê`, undefined, undefined, { 'User-Agent': 'user-one' });
    check('first search answers immediately with empty internal data', s1.status === 200 && s1.data.places.length === 0, s1.data);
    check('status says enriching (not "complete")', s1.data.status === 'enriching', s1.data.status);
    check('google fallback allowed while incomplete', s1.data.allow_google_fallback === true);
    const bad = await call('GET', '/locality/search?cell=10.77,106.70');
    check('raw coordinates are rejected — only grid cells accepted', bad.status === 400);

    const admin = await call('POST', '/admin/auth/login', { identifier: '0999999999', password: '123456' });
    check('admin logs in to admin API', admin.status === 200);
    const A = admin.data.token;
    const reqs1 = await call('GET', '/admin/locality/requests?page_size=100', undefined, A);
    const firstCount = reqs1.data.total;

    // Many users search the same area at once (before the worker picks the jobs up).
    await Promise.all(Array.from({ length: 10 }, (_, i) => call('GET', `/locality/search?cell=${CELL}`, undefined, undefined, { 'User-Agent': `user-${i}` })));
    const reqs2 = await call('GET', '/admin/locality/requests?page_size=100', undefined, A);
    check('10 more users did not create duplicate jobs', reqs2.data.total === firstCount, { firstCount, now: reqs2.data.total });
    check('one job per cell of the 3×3 neighbourhood', firstCount === 9, firstCount);

    const customer = await call('POST', '/customer/auth/login', { identifier: '0908123789', password: '123456' });
    check('customer token cannot use admin API', (await call('GET', '/admin/locality/overview', undefined, customer.data.token)).status === 403);
    const shopLogin = await call('POST', '/admin/auth/login', { identifier: '0912345678', password: '123456' });
    check('non-admin shop account cannot log into admin', shopLogin.status === 401);

    console.log('\nWorker, adapters and quality gate');
    const done = await waitFor(async () => {
      const r = await call('GET', '/admin/locality/requests?page_size=100', undefined, A);
      return r.data.items.filter((x: any) => x.cell_id.startsWith('c210')).every((x: any) => ['awaiting_review', 'completed', 'failed'].includes(x.state));
    }, 40000);
    check('worker processed every queued job', done);

    const ov = await call('GET', '/admin/locality/overview', undefined, A);
    check('9 cells × 2 qualifying cafés are waiting for review', ov.data.places.pending_review === 18, ov.data.places);
    check('9 cells × 4 failing candidates are kept as disqualified', ov.data.places.disqualified === 36, ov.data.places);
    const reasons = ov.data.disqualified_reasons;
    check('restaurant rejected as not a café', reasons.not_cafe === 9, reasons);
    check('café with 2 photos rejected', reasons.photos_below_min === 9, reasons);
    check('café with 6 reviews rejected', reasons.reviews_below_min === 9, reasons);
    check('generic category rejected (no guessing)', reasons.category_generic === 9, reasons);
    const gpm = ov.data.worker.adapters.find((a: any) => a.id === 'gpm');
    check('GPM connector is listed but locked', gpm && gpm.enabled === false && /khóa/.test(gpm.reason), gpm);

    const s2 = await call('GET', `/locality/search?cell=${CELL}`);
    check('before review nothing is published to users', s2.data.places.length === 0 && s2.data.status === 'enriching' && s2.data.enrichment.pending_review === 18, s2.data);

    console.log('\nAdmin review');
    const pending = await call('GET', '/admin/locality/places?status=pending_review&page_size=100', undefined, A);
    const disq = await call('GET', '/admin/locality/places?status=disqualified&page_size=100', undefined, A);
    const failing = disq.data.items[0];
    const forced = await call('POST', `/admin/locality/places/${failing.id}/approve`, {}, A);
    check('a disqualified place cannot be approved', forced.status === 409, forced.data);
    const noNote = await call('POST', `/admin/locality/places/${pending.data.items[0].id}/reject`, {}, A);
    check('rejecting requires a reason', noNote.status === 400);
    const ids = pending.data.items.map((p: any) => p.id);
    const bulk = await call('POST', '/admin/locality/places/bulk', { ids, action: 'approve', note: 'đợt 1' }, A);
    check('bulk approve publishes all 18', bulk.data.ok === 18, bulk.data);

    const s3 = await call('GET', `/locality/search?cell=${CELL}`, undefined, undefined, { 'User-Agent': 'someone-else' });
    check('published cafés are served from the internal store', s3.data.total === 18, s3.data.total);
    check('area now reports complete — no Google fallback needed', s3.data.status === 'complete' && s3.data.allow_google_fallback === false, s3.data.status);
    check('each result has ≥3 photos and ≥10 reviews', s3.data.places.every((p: any) => p.photos.length >= 3 && p.review_count >= 10));
    check('results carry source and update time', s3.data.places.every((p: any) => p.sources.length > 0 && p.updated_at));
    const s3b = await call('GET', `/locality/search?cell=${CELL}&page=2&page_size=5`);
    check('pagination works', s3b.data.places.length === 5 && s3b.data.page === 2);
    const reqs3 = await call('GET', '/admin/locality/requests?page_size=100', undefined, A);
    check('reusing the data created no new jobs', reqs3.data.total === firstCount, reqs3.data.total);

    const refresh = await call('POST', '/locality/refresh', { cell: CELL });
    check('manual refresh respects the cooldown', refresh.status === 429, refresh.data);

    // Edit: drop photos below the threshold → place leaves the public dataset.
    const target = await call('GET', `/admin/locality/places/${ids[0]}`, undefined, A);
    const photoIds = target.data.place.photos.map((p: any) => p.id);
    const edit = await call('PATCH', `/admin/locality/places/${ids[0]}`, { remove_photo_ids: photoIds.slice(0, photoIds.length - 2), name: 'Tên đã sửa', note: 'ảnh mờ' }, A);
    check('removing photos below 3 unpublishes the place', edit.data.place.status === 'unpublished', edit.data.place?.status);
    const audit = await call('GET', `/admin/locality/moderation?place_id=${ids[0]}`, undefined, A);
    const editLog = audit.data.items.find((m: any) => m.action === 'edit');
    check('audit log records who, when and what changed', editLog && editLog.admin_name && editLog.at && editLog.changes?.name?.to === 'Tên đã sửa', editLog);
    const s4 = await call('GET', `/locality/search?cell=${CELL}`);
    check('unpublished place no longer served', s4.data.total === 17, s4.data.total);

    console.log('\nData rights');
    const scan = await call('POST', '/admin/locality/scan', { cell: IMPORT_CELL }, A);
    check('admin can trigger a scan', scan.status === 200 && ['queued', 'joined'].includes(scan.data.kind), scan.data);
    await waitFor(async () => {
      const r = await call('GET', '/admin/locality/requests?page_size=200', undefined, A);
      const job = r.data.items.find((x: any) => x.cell_id === IMPORT_CELL);
      return job && ['awaiting_review', 'completed', 'failed'].includes(job.state);
    });
    const all = await call('GET', '/admin/locality/places?q=cafe&page_size=200', undefined, A);
    const names = all.data.items.map((p: any) => p.name);
    check('Google Maps scraped export is refused (ToS §3.2.3)', !names.includes('Scraped Cafe'));
    check('export from an unverified origin is refused', !names.includes('Unknown Cafe'));
    const partner = all.data.items.find((p: any) => p.name === 'Partner Site Cafe');
    check('export from a verified origin is stored', !!partner);
    check('reviews without rights do not count toward the 10-review gate', partner && partner.status === 'disqualified' && partner.quality.reasons.includes('reviews_below_min'), partner?.quality);
    const job = (await call('GET', '/admin/locality/requests?page_size=200', undefined, A)).data.items.find((x: any) => x.cell_id === IMPORT_CELL);
    check('skipped-for-rights records are reported on the job', /quyền/.test(job?.last_error || ''), job?.last_error);
    check('job log contains no secrets', !/key=|Bearer [A-Za-z0-9]/.test(JSON.stringify(job)));

    console.log('\nCost metering');
    const ov2 = await call('GET', '/admin/locality/overview', undefined, A);
    const t = ov2.data.usage.totals;
    check('searches served fully from internal data are counted', t['locality.search_complete'] >= 1, t);
    check('avoided Google calls are estimated', t['locality.google_calls_avoided_est'] >= 1, t);
    check('locality search made zero Google Places calls', !t['google.places_text_search'], t);
    check('source calls are metered per adapter', t['source_call.mock_dev'] >= 9, t);
    const photo = await call('GET', '/media/place-photo?name=../../etc');
    check('photo proxy rejects malformed names', photo.status === 400);

    const ret = await call('POST', '/admin/locality/retention/run', {}, A);
    check('retention job runs', ret.status === 200 && typeof ret.data.photos_deleted === 'number');
  } catch (err) {
    failed++;
    console.error(err);
    console.error(log.slice(-3000));
  } finally {
    server.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
