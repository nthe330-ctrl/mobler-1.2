import { HttpClient, apiBaseUrl } from './http';

export type RealtimeStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export interface RealtimeOptions {
  /** Authenticated client — when given (and signed in), private topics are subscribed. */
  http?: HttpClient;
  /** Public availability topics to watch (shop ids). */
  watchShops?: string[];
  /** Shop app: restrict private topics to these shops. */
  shops?: string[];
  onEvent: (event: string, data: any) => void;
  onStatus?: (status: RealtimeStatus) => void;
}

/**
 * Opens a Server-Sent Events stream to the shared backend and keeps it alive.
 * Returns a function that closes the stream.
 */
export function connectRealtime(opts: RealtimeOptions): () => void {
  let source: EventSource | null = null;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const EVENTS = ['ready', 'booking', 'availability', 'table', 'order', 'review', 'menu', 'achievement'];

  const open = async () => {
    if (closed) return;
    opts.onStatus?.(attempt === 0 ? 'connecting' : 'reconnecting');
    const params = new URLSearchParams();
    if (opts.watchShops?.length) params.set('watch', opts.watchShops.join(','));
    if (opts.shops?.length) params.set('shops', opts.shops.join(','));

    if (opts.http?.getToken()) {
      try {
        const { ticket } = await opts.http.post<{ ticket: string }>('/realtime/ticket');
        params.set('ticket', ticket);
      } catch {
        // fall back to public topics only
      }
    }
    if (closed) return;

    source = new EventSource(`${apiBaseUrl()}/api/realtime/stream?${params.toString()}`);
    for (const name of EVENTS) {
      source.addEventListener(name, (e: MessageEvent) => {
        let data: any = null;
        try {
          data = JSON.parse(e.data);
        } catch {
          data = e.data;
        }
        if (name === 'ready') {
          attempt = 0;
          opts.onStatus?.('live');
        }
        opts.onEvent(name, data);
      });
    }
    source.onerror = () => {
      // Tickets are single-use, so reconnect manually with a fresh one.
      source?.close();
      source = null;
      if (closed) return;
      attempt += 1;
      opts.onStatus?.(navigator.onLine === false ? 'offline' : 'reconnecting');
      const delay = Math.min(15000, 1000 * 2 ** Math.min(attempt, 4));
      retryTimer = setTimeout(open, delay);
    };
  };

  open();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    source?.close();
  };
}
