/**
 * Turning on notifications that arrive with the app closed.
 *
 * Every step here can fail for ordinary reasons — an unsupported browser, a declined
 * prompt, a server with no keys — and none of them are errors worth interrupting
 * anyone over. The durable inbox works regardless; this only adds reach.
 */
import { api } from './api';

export type PushState =
  | 'unsupported'   // this browser cannot do it at all
  | 'ios-needs-install' // iPhone: only works once added to the home screen
  | 'server-off'    // the backend has no keys configured
  | 'denied'        // the person said no, and only they can undo it
  | 'off'           // possible, not on yet
  | 'on';

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

/** Base64url as the push API wants it: a Uint8Array. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) {
    // On an iPhone this is not a dead end, it is an instruction: Safari only grants
    // push to a site the person has added to their home screen.
    return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';

  try {
    const key = await api.getPushKey();
    if (!key.enabled || !key.publicKey) return 'server-off';
  } catch {
    return 'server-off';
  }

  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return isIos() && !isStandalone() ? 'ios-needs-install' : 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const key = await api.getPushKey().catch(() => null);
  if (!key?.enabled || !key.publicKey) return 'server-off';

  const reg = (await navigator.serviceWorker.getRegistration('/')) || (await registerServiceWorker());
  if (!reg) return 'unsupported';
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub = existing || await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key.publicKey) as BufferSource
  });

  await api.subscribePush(sub.toJSON() as any);
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    // Tell the server first: a subscription it keeps sending to after the browser
    // dropped it is wasted work, and it would be pruned only after repeated failures.
    await api.unsubscribePush(sub.endpoint).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
  return 'off';
}
