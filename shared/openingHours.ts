/**
 * Shop opening hours — parsing, and whether a booking time falls inside them.
 *
 * Two shapes exist in real data and both must keep working:
 *   • the seeded shape, an array like [{ day: 'Thứ 2 - Thứ 6', time: '08:00 - 22:00' }]
 *   • the shape the shop registration form writes, a single string '07:00 - 22:00'
 * Anything unrecognised returns null, and a null means "we don't know" — the caller
 * then allows the time rather than locking a guest out because of a formatting quirk.
 *
 * Pure and framework-free so the client and the server agree on the same answer.
 */

export interface OpenWindow {
  /** 'HH:MM' */
  open: string;
  /** 'HH:MM'. May be '24:00', which means midnight at the end of the day. */
  close: string;
}

/** Vietnamese weekday tokens → JS getDay() index (Sunday = 0). */
const DAY_INDEX: Record<string, number> = {
  'cn': 0, 'chủ nhật': 0, 'chu nhat': 0,
  'thứ 2': 1, 'thu 2': 1, 't2': 1,
  'thứ 3': 2, 'thu 3': 2, 't3': 2,
  'thứ 4': 3, 'thu 4': 3, 't4': 3,
  'thứ 5': 4, 'thu 5': 4, 't5': 4,
  'thứ 6': 5, 'thu 6': 5, 't6': 5,
  'thứ 7': 6, 'thu 7': 6, 't7': 6
};

/** 'HH:MM' → minutes from midnight. Returns null when it isn't a time. */
export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

function parseRange(range: string): OpenWindow | null {
  // Accepts '08:00 - 22:00', '08:00-22:00', '08:00 – 22:00' (en dash).
  const m = /^\s*(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*$/.exec(String(range || ''));
  if (!m) return null;
  const open = m[1].padStart(5, '0');
  const close = m[2].padStart(5, '0');
  if (toMinutes(open) === null || toMinutes(close) === null) return null;
  return { open, close };
}

/** Does a label like 'Thứ 2 - Thứ 6' or 'Thứ 7 - CN' cover this weekday? */
function dayLabelCovers(label: string, weekday: number): boolean {
  const raw = String(label || '').toLowerCase().trim();
  if (!raw) return true;                       // unlabelled window applies every day
  const parts = raw.split(/[-–—]/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 1) {
    const only = DAY_INDEX[parts[0]];
    return only === undefined ? true : only === weekday;
  }
  const from = DAY_INDEX[parts[0]];
  const to = DAY_INDEX[parts[1]];
  if (from === undefined || to === undefined) return true;
  // Walk forward so 'Thứ 7 - CN' (6 → 0) wraps across the end of the week.
  for (let i = from; ; i = (i + 1) % 7) {
    if (i === weekday) return true;
    if (i === to) return false;
  }
}

/**
 * The window a shop is open on a given date, or null when it cannot be determined.
 * `isoDate` is 'YYYY-MM-DD'.
 */
export function openWindowFor(
  openingHours: { day: string; time: string }[] | string | undefined | null,
  isoDate: string
): OpenWindow | null {
  if (!openingHours) return null;
  if (typeof openingHours === 'string') return parseRange(openingHours);
  if (!Array.isArray(openingHours) || openingHours.length === 0) return null;

  const d = new Date(`${isoDate}T00:00:00`);
  const weekday = Number.isNaN(d.getTime()) ? null : d.getDay();

  if (weekday !== null) {
    const match = openingHours.find(w => dayLabelCovers(w?.day, weekday));
    if (match) return parseRange(match.time);
  }
  // No row matched the weekday — fall back to the first readable window rather than
  // treating the shop as closed all day.
  for (const w of openingHours) {
    const parsed = parseRange(w?.time);
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Is 'HH:MM' inside the shop's opening hours on that date?
 * Unknown hours → true: never block a booking because the data is unreadable.
 */
export function isWithinOpeningHours(
  openingHours: { day: string; time: string }[] | string | undefined | null,
  isoDate: string,
  time: string
): boolean {
  const win = openWindowFor(openingHours, isoDate);
  if (!win) return true;
  const t = toMinutes(time);
  const open = toMinutes(win.open);
  const close = toMinutes(win.close);
  if (t === null || open === null || close === null) return true;
  // A close earlier than the open means the shop runs past midnight (e.g. 18:00 - 02:00).
  if (close <= open) return t >= open || t < close;
  return t >= open && t < close;
}

/** 'Mở cửa 08:00 – 22:00', or null when the hours are unknown. */
export function formatOpenWindow(
  openingHours: { day: string; time: string }[] | string | undefined | null,
  isoDate: string
): string | null {
  const win = openWindowFor(openingHours, isoDate);
  return win ? `${win.open} – ${win.close}` : null;
}

/**
 * Has this time already passed? Only meaningful for today; any other date is false.
 * `now` is injectable so tests do not depend on the wall clock.
 */
export function isPastTime(isoDate: string, time: string, now: Date = new Date()): boolean {
  const today =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (isoDate !== today) return false;
  const t = toMinutes(time);
  if (t === null) return false;
  return t <= now.getHours() * 60 + now.getMinutes();
}

/**
 * The half-hour marks a shop picks its hours from, on a 24-hour clock.
 *
 * `24:00` is last and is offered as a CLOSING time only: `toMinutes` accepts it and
 * `isWithinOpeningHours` reads it as midnight at the end of the day, which is how a shop
 * that closes at midnight says so without the range looping back to 00:00 and reading as
 * "closed all day".
 */
export const TIME_CHOICES: string[] = (() => {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  out.push('24:00');
  return out;
})();

/** What a shop gets before it has chosen anything. Matches the server's registration default. */
export const DEFAULT_OPEN_RANGE: OpenWindow = { open: '07:00', close: '22:00' };

/**
 * The day label stored alongside a single all-week window.
 *
 * A constant, NOT a translated string: it is written to the database and read back by the
 * customer app, so a staff member saving the profile while reading Thai must not leave
 * "ทุกวัน" where a Vietnamese guest will see it. The dashboard shows its own translated
 * label; this is only what gets stored. Same value the registration route writes.
 */
export const EVERY_DAY_LABEL = 'Hằng ngày';

/** 'HH:MM - HH:MM' → the two ends, or null when the string is not that shape. */
export function parseOpenRange(range: string | undefined | null): OpenWindow | null {
  return parseRange(String(range ?? ''));
}

/** The storage format every reader of this field expects. */
export function formatOpenRange(win: OpenWindow): string {
  return `${win.open} - ${win.close}`;
}
