/**
 * Push that reaches a closed tab.
 *
 * The notification store already survives the tab closing, but it only speaks when
 * someone comes back. This is the half that goes and finds them.
 *
 * Keys: the VAPID pair identifies this server to the push services. The private key
 * never leaves the backend; only the public key is handed to browsers, which is what
 * it is for. With no keys configured the whole feature stays off and the rest of the
 * system is unaffected — push is an addition to the inbox, never a replacement.
 */

import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { db } from './db';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@mobler.app';
const KEY_FILE = path.join(
  process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data'),
  'vapid.json'
);

let publicKey = '';
let ready = false;

/**
 * Load the key pair from the environment, or from a file beside the database, or
 * generate one and keep it. Generating is what makes this work out of the box in
 * development; in production the environment should supply the pair, because a
 * rotated key silently invalidates every existing subscription.
 */
export function initWebPush(): void {
  if (ready) return;
  try {
    let pub = process.env.VAPID_PUBLIC_KEY || '';
    let priv = process.env.VAPID_PRIVATE_KEY || '';

    if (!pub || !priv) {
      if (fs.existsSync(KEY_FILE)) {
        const saved = JSON.parse(fs.readFileSync(KEY_FILE, 'utf-8'));
        pub = saved.publicKey;
        priv = saved.privateKey;
      } else {
        const generated = webpush.generateVAPIDKeys();
        pub = generated.publicKey;
        priv = generated.privateKey;
        fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
        fs.writeFileSync(KEY_FILE, JSON.stringify(generated, null, 2), { mode: 0o600 });
        console.log('[webPush] đã sinh khóa VAPID mới và lưu vào', KEY_FILE);
      }
    }

    webpush.setVapidDetails(SUBJECT, pub, priv);
    publicKey = pub;
    ready = true;
  } catch (err) {
    console.warn('[webPush] không bật được push, hệ thống vẫn chạy bình thường:', err);
    ready = false;
  }
}

/** The only key a browser ever sees. */
export function vapidPublicKey(): string {
  return ready ? publicKey : '';
}

export function isPushEnabled(): boolean {
  return ready;
}

export function saveSubscription(userId: string, sub: PushSubscriptionInput): boolean {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return false;
  const raw = db.getRawDb();
  raw.push_subscriptions = raw.push_subscriptions || [];
  // One row per browser: re-subscribing from the same browser replaces the old row
  // rather than piling up duplicates that would each deliver the same alert.
  const existing = raw.push_subscriptions.findIndex(s => s.endpoint === sub.endpoint);
  const row = {
    id: existing >= 0 ? raw.push_subscriptions[existing].id : `psb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    created_at: new Date().toISOString(),
    failures: 0
  };
  if (existing >= 0) raw.push_subscriptions[existing] = row;
  else raw.push_subscriptions.push(row);
  db.saveDatabase();
  return true;
}

export function removeSubscription(userId: string, endpoint: string): boolean {
  const raw = db.getRawDb();
  const before = (raw.push_subscriptions || []).length;
  raw.push_subscriptions = (raw.push_subscriptions || []).filter(
    s => !(s.user_id === userId && s.endpoint === endpoint)
  );
  if (raw.push_subscriptions.length === before) return false;
  db.saveDatabase();
  return true;
}

/** How many consecutive failures before a subscription is assumed dead. */
const MAX_FAILURES = 3;

/**
 * Send one notification to every browser this person has registered.
 * Never throws: a push that cannot be delivered must not disturb the request that
 * triggered it, because whatever it describes has already happened.
 */
export async function pushToUser(
  userId: string,
  payload: { title: string; message: string; url?: string; tag?: string }
): Promise<number> {
  if (!ready) return 0;
  const raw = db.getRawDb();
  const subs = (raw.push_subscriptions || []).filter(s => s.user_id === userId);
  if (!subs.length) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;
  let dirty = false;

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body);
      delivered++;
      if (s.failures) { s.failures = 0; dirty = true; }
    } catch (err: any) {
      const gone = err?.statusCode === 404 || err?.statusCode === 410;
      s.failures = (s.failures || 0) + 1;
      dirty = true;
      if (gone || s.failures >= MAX_FAILURES) {
        raw.push_subscriptions = (raw.push_subscriptions || []).filter(x => x.endpoint !== s.endpoint);
      }
    }
  }));

  if (dirty) db.saveDatabase();
  return delivered;
}
