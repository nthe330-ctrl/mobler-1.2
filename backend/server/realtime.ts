import crypto from 'crypto';
import { Request, Response } from 'express';
import { AuthRequest, AuthenticatedUserPayload, canManageShop, isAdmin } from './auth';
import { db } from './db';

/**
 * Real-time event bus over Server-Sent Events.
 *
 * Topics:
 *   user:<userId>         — private, a customer's own bookings
 *   shop:<shopId>         — private, everything staff of that shop need (full booking details)
 *   availability:<shopId> — public, "table/slot availability changed" pings with no personal data
 *
 * EventSource cannot send an Authorization header, so authenticated clients first
 * exchange their JWT for a short-lived, single-use stream ticket.
 */

interface Client {
  id: string;
  res: Response;
  topics: Set<string>;
}

const clients = new Map<string, Client>();
const tickets = new Map<string, { user: AuthenticatedUserPayload; expiresAt: number }>();
const TICKET_TTL_MS = 60_000;
const MAX_WATCHED_SHOPS = 20;

export function publish(topics: string[], event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    if (topics.some(t => client.topics.has(t))) {
      client.res.write(payload);
    }
  }
}

export const topics = {
  user: (id: string) => `user:${id}`,
  shop: (id: string) => `shop:${id}`,
  availability: (id: string) => `availability:${id}`
};

export function issueTicket(req: AuthRequest, res: Response) {
  const ticket = crypto.randomBytes(24).toString('hex');
  tickets.set(ticket, { user: req.user!, expiresAt: Date.now() + TICKET_TTL_MS });
  res.json({ ticket, expiresInMs: TICKET_TTL_MS });
}

function consumeTicket(ticket?: string): AuthenticatedUserPayload | null {
  if (!ticket) return null;
  const entry = tickets.get(ticket);
  tickets.delete(ticket);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.user;
}

/**
 * GET /api/realtime/stream?ticket=...&watch=shopId1,shopId2&shops=shopId
 *  - ticket (optional): subscribes to the private topics of the account
 *  - watch (optional):  public availability topics (customer booking screen)
 *  - shops (optional, shop accounts): limit private shop topics to these shops
 */
export function streamHandler(req: Request, res: Response) {
  const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : undefined;
  const user = consumeTicket(ticket);
  if (ticket && !user) {
    return res.status(401).json({ error: 'Stream ticket invalid or expired', code: 'TICKET_INVALID' });
  }

  const subscribed = new Set<string>();
  const watch = typeof req.query.watch === 'string' ? req.query.watch.split(',').filter(Boolean) : [];
  watch.slice(0, MAX_WATCHED_SHOPS).forEach(id => subscribed.add(topics.availability(id)));

  if (user?.accountType === 'customer') {
    subscribed.add(topics.user(user.userId));
  }
  if (user?.accountType === 'shop') {
    const fresh = db.findUserById(user.userId);
    const scope: AuthenticatedUserPayload = { ...user, owned_shops: fresh?.owned_shops || user.owned_shops, roles: fresh?.roles || user.roles };
    const requested = typeof req.query.shops === 'string' ? req.query.shops.split(',').filter(Boolean) : [];
    const shopIds = requested.length > 0 ? requested : isAdmin(scope) ? db.getShops().map(s => s.id) : scope.owned_shops;
    shopIds.filter(id => canManageShop(scope, id)).forEach(id => subscribed.add(topics.shop(id)));
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(`retry: 3000\n`);
  res.write(`event: ready\ndata: ${JSON.stringify({ topics: [...subscribed] })}\n\n`);

  const client: Client = { id: crypto.randomUUID(), res, topics: subscribed };
  clients.set(client.id, client);

  const heartbeat = setInterval(() => res.write(`: ping ${Date.now()}\n\n`), 25_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client.id);
  });
}

export function realtimeStats() {
  return { connections: clients.size };
}

// Periodically drop expired tickets.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tickets) if (v.expiresAt < now) tickets.delete(k);
}, 60_000).unref();
