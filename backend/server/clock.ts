/**
 * The shops' wall clock.
 *
 * A booking's date and time are always the shop's local ones. Comparing them against
 * the server's clock (which may run anywhere) or the customer's clock (which may be
 * in another country) shifts every deadline by the timezone difference — so every
 * deadline in the system is computed from here.
 */

export const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE || 'Asia/Ho_Chi_Minh';

export interface ShopClock {
  /** YYYY-MM-DD in the shops' timezone. */
  today: string;
  /** HH:MM (24h) in the shops' timezone. */
  now: string;
}

export function shopClock(at: Date = new Date()): ShopClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(at);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return { today: `${get('year')}-${get('month')}-${get('day')}`, now: `${get('hour')}:${get('minute')}` };
}
