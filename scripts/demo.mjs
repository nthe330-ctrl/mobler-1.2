/**
 * Public demo runner — `node scripts/demo.mjs <build|start>`
 *
 * Plain Node, no new dependency, and cross-platform: `VAR=value cmd` does not work in
 * Windows cmd/PowerShell, so the environment is set here rather than in an npm script.
 *
 * What it guarantees for a demo that will be reachable from the internet:
 *
 *  1. GOOGLE_MAPS_PLATFORM_KEY is forced EMPTY for the build. Each app's vite.config.ts
 *     inlines that value into the bundle via `define`, so building with a real key would
 *     publish it in readable JavaScript for anyone to lift and bill to your account.
 *     With it empty the app falls back to its own key-entry dialog / MapLibre.
 *  2. GEMINI_API_KEY is cleared for the run, so public traffic cannot spend AI credit.
 *  3. DATA_DIR points at backend/data-demo, so nothing the public does can reach
 *     backend/data/database.json. `npm run demo:seed` resets that folder.
 *  4. JWT_SECRET is a generated random value, persisted so sessions survive a restart.
 */
import { spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DEMO_DIR = path.join(ROOT, 'backend', 'data-demo');
const SECRET_FILE = path.join(DEMO_DIR, '.demo-secret');
const cmd = process.argv[2];

const run = (command, args, env) => {
  const r = spawnSync(command, args, {
    cwd: env?.cwd || ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',   // npm/npx are .cmd shims on Windows
    env: { ...process.env, ...(env?.vars || {}) },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

function demoSecret() {
  fs.mkdirSync(DEMO_DIR, { recursive: true });
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, crypto.randomBytes(48).toString('hex'));
    console.log('[demo] generated a new JWT secret for the demo');
  }
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}

if (cmd === 'build') {
  // Empty string, not undefined: vite.config.ts reads env.GOOGLE_MAPS_PLATFORM_KEY and
  // would otherwise fall back to whatever sits in the repo's .env file.
  const vars = { GOOGLE_MAPS_PLATFORM_KEY: '', VITE_GOOGLE_MAPS_API_KEY: '', VITE_API_URL: '' };
  console.log('[demo] building with Google Maps key forced empty (never ship a key in a public bundle)');
  for (const app of ['customer', 'shop', 'admin']) {
    const base = app === 'customer' ? '/' : `/${app}/`;
    console.log(`\n[demo] building ${app} (base ${base})`);
    run('npx', ['vite', 'build', '--config', `apps/${app}/vite.config.ts`, '--base', base], { vars });
  }
  console.log('\n[demo] build done. Next: npm run demo:seed, then npm run demo:start');
} else if (cmd === 'start') {
  if (!fs.existsSync(path.join(DEMO_DIR, 'database.json'))) {
    console.error('[demo] no demo data yet — run: npm run demo:seed');
    process.exit(1);
  }
  const vars = {
    NODE_ENV: 'production',
    SERVE_STATIC: 'true',
    DATA_DIR: DEMO_DIR,
    JWT_SECRET: demoSecret(),
    PORT: process.env.PORT || '3000',
    CORS_ORIGINS: '',              // same origin now, so no cross-origin access is needed
    GEMINI_API_KEY: '',            // no paid AI calls from public traffic
    GOOGLE_MAPS_PLATFORM_KEY: '',
    VITE_GOOGLE_MAPS_API_KEY: '',
    LOCALITY_DEV_MOCK: 'false',
  };
  console.log(`[demo] API + all apps on http://localhost:${vars.PORT}  (data: backend/data-demo)`);
  run('npx', ['tsx', 'server.ts'], { vars, cwd: path.join(ROOT, 'backend') });
} else if (cmd === 'public') {
  /* One command: seed if needed, start the server, wait for it to answer, then open the
     tunnel and print the public link on its own so it cannot be lost in the log. */
  const { spawn } = await import('child_process');

  if (!fs.existsSync(path.join(ROOT, 'apps', 'customer', 'dist', 'index.html'))) {
    console.error('[demo] no build yet — run:  npm run demo:build');
    process.exit(1);
  }
  if (!fs.existsSync(path.join(DEMO_DIR, 'database.json'))) {
    console.log('[demo] no demo data yet — seeding');
    run('npx', ['tsx', 'scripts/seed-demo.ts'], { cwd: path.join(ROOT, 'backend') });
  }

  const port = process.env.PORT || '3000';
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'demo.mjs'), 'start'],
    { stdio: 'inherit', env: { ...process.env, PORT: port } });

  const stop = () => { try { server.kill(); } catch {} };
  process.on('SIGINT', () => { stop(); process.exit(0); });
  process.on('exit', stop);

  // Wait for the server to actually answer before opening the tunnel, otherwise
  // cloudflared publishes a URL that 502s for the first few seconds.
  const deadline = Date.now() + 60_000;
  let up = false;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (r.ok) { up = true; break; }
    } catch {}
    await new Promise(r => setTimeout(r, 700));
  }
  if (!up) {
    console.error('[demo] the server did not come up — see the log above');
    stop(); process.exit(1);
  }
  console.log(`[demo] server is up on :${port} — opening the public tunnel…`);

  const tunnel = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', `http://localhost:${port}`],
    { shell: process.platform === 'win32', env: process.env });

  let printed = false;
  const scan = (buf) => {
    const text = buf.toString();
    process.stderr.write(text);

    if (!printed && /failed to request quick Tunnel|no such host|dial tcp/i.test(text)) {
      console.error('\n[demo] cloudflared could not reach Cloudflare, so there is NO public link.');
      console.error('[demo] check the internet connection / proxy and run this again.');
      console.error(`[demo] the demo itself is running locally: http://localhost:${port}\n`);
      return;
    }

    /* Match the quick-tunnel host only. cloudflared mentions api.trycloudflare.com in its
       own error text, and an earlier version of this script happily printed THAT as the
       public link — a URL that was never a tunnel. Exclude the api host explicitly. */
    const m = !printed && /https:\/\/(?!api\.)[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com/.exec(text);
    if (m) {
      printed = true;
      const line = '='.repeat(60);
      console.log(`\n${line}\n  PUBLIC LINK:  ${m[0]}\n  khách: ${m[0]}\n  quán:  ${m[0]}/shop/\n\n  Đăng nhập demo — khách 0900000001 / quán 0900000002, mật khẩu demo1234\n${line}\n`);
    }
  };
  tunnel.stdout.on('data', scan);
  tunnel.stderr.on('data', scan);   // cloudflared prints the URL on stderr
  tunnel.on('error', (e) => {
    console.error(`\n[demo] could not start cloudflared (${e.message}).`);
    console.error('[demo] the demo itself is running — open http://localhost:' + port);
  });
  process.on('SIGINT', () => { try { tunnel.kill(); } catch {} });
} else {
  console.log('usage: node scripts/demo.mjs <build|start|public>');
  process.exit(1);
}
