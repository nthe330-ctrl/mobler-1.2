/**
 * MOBLER service worker.
 *
 * Its whole job is to be awake when the app is not: receive a push, show it, and
 * take the person to the right screen when they tap it. It deliberately does NOT
 * cache API responses — a stale "table available" is worse than no answer at all,
 * and this app's core promise is that what you see is true right now.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'MOBLER', message: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'MOBLER';
  const options = {
    body: payload.message || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    // One tag per notification id, so re-sending the same thing replaces it rather
    // than stacking duplicates on the lock screen.
    tag: payload.tag || undefined,
    data: { url: payload.url || '/' },
    lang: 'vi'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Reuse a tab that is already open rather than piling up new ones.
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate?.(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
