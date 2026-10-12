/**
 * Durable notifications.
 *
 * The SSE bus only reaches screens that are open right now. Anything a person must
 * not miss — their booking was answered, their table is about to be released, a
 * reward arrived — is also written here, so it is still waiting when they come back.
 *
 * Writing a notification never fails a request: the booking already happened, and
 * losing the note about it must not undo it.
 */

import { db } from './db';
import { publish, topics } from './realtime';

export type NotificationType = 'booking' | 'promo' | 'order' | 'system';

export interface NotifyInput {
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  shop_id?: string;
}

export interface NotificationRecord extends NotifyInput {
  id: string;
  is_read: boolean;
  created_at: string;
}

/** Keep the newest N per person so the file store cannot grow without bound. */
const MAX_PER_USER = 100;

export function notify(input: NotifyInput): NotificationRecord | null {
  try {
    const record: NotificationRecord = {
      id: `ntf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: input.user_id,
      shop_id: input.shop_id,
      title: input.title,
      message: input.message,
      type: input.type,
      is_read: false,
      created_at: new Date().toISOString()
    };
    const raw = db.getRawDb();
    raw.notifications.unshift(record);

    const mine = raw.notifications.filter(n => n.user_id === input.user_id);
    if (mine.length > MAX_PER_USER) {
      const keep = new Set(mine.slice(0, MAX_PER_USER).map(n => n.id));
      raw.notifications = raw.notifications.filter(n => n.user_id !== input.user_id || keep.has(n.id));
    }
    db.saveDatabase();

    publish([topics.user(input.user_id)], 'notification', {
      action: 'created',
      notification: record,
      unread: countUnread(input.user_id)
    });
    return record;
  } catch (err) {
    console.error('[notifications] could not record a notification:', err);
    return null;
  }
}

export function listNotifications(userId: string, limit = 50): NotificationRecord[] {
  return db.getRawDb().notifications
    .filter(n => n.user_id === userId)
    .slice(0, Math.min(Math.max(1, limit), MAX_PER_USER)) as NotificationRecord[];
}

export function countUnread(userId: string): number {
  return db.getRawDb().notifications.filter(n => n.user_id === userId && !n.is_read).length;
}

export function markRead(userId: string, id: string): boolean {
  const found = db.getRawDb().notifications.find(n => n.id === id && n.user_id === userId);
  if (!found || found.is_read) return false;
  found.is_read = true;
  db.saveDatabase();
  return true;
}

export function markAllRead(userId: string): number {
  const mine = db.getRawDb().notifications.filter(n => n.user_id === userId && !n.is_read);
  for (const n of mine) n.is_read = true;
  if (mine.length) db.saveDatabase();
  return mine.length;
}

/**
 * Notify every account that can act for a shop. A shop's staff each have their own
 * account, so a new booking has to reach all of them, not just the owner.
 */
export function notifyShopStaff(shopId: string, input: Omit<NotifyInput, 'user_id' | 'shop_id'>): void {
  const raw = db.getRawDb();
  const staff = raw.users.filter(
    u => u.account_type === 'shop'
      && (u.owned_shops?.includes(shopId) || u.staff_shops?.some(s => s.shop_id === shopId))
  );
  for (const u of staff) notify({ ...input, user_id: u.id, shop_id: shopId });
}
