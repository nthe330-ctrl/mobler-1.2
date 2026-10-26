/**
 * Which locale each interface language reads in, and the date/time formats built on it.
 *
 * Kept separate from `currency.ts` so money and dates ask the same question of the same
 * table instead of each keeping its own copy: a language added here reaches both at once.
 *
 * Thai is the one entry with a wrinkle. `th-TH` defaults to the Buddhist calendar, so
 * `Intl` writes 2026 as 2569 — correct for Thailand, but every other surface in Mobler
 * (the ISO dates in the API, the `<input type="date">` the staff types into, the booking
 * code) is Gregorian. A dashboard showing 2569 beside a date picker showing 2026 invites
 * the wrong booking to be confirmed, so the locale is pinned to `-u-ca-gregory` and the
 * year stays the one the data holds. Thai month and day names are unaffected.
 */

export const LOCALE_BY_LANGUAGE: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  'zh-TW': 'zh-TW',
  th: 'th-TH-u-ca-gregory'
};

/** The locale for a language, or a sensible default when the language is unknown. */
export function localeFor(language: string | undefined, fallback = 'vi-VN'): string {
  return (language && LOCALE_BY_LANGUAGE[language]) || fallback;
}

function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  // Local noon, not midnight UTC: a date-only value must not drift a day either side of
  // the international date line when the browser's zone is applied.
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A YYYY-MM-DD date as the reader's language writes it: 26/10/2026 in Vietnamese,
 * 10/26/2026 in English, 2026/10/26 in Chinese. Unparseable input is returned untouched
 * rather than rendered as "Invalid Date" in a booking card.
 */
export function formatDateLocalized(iso: string, language: string | undefined): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  try {
    return new Intl.DateTimeFormat(localeFor(language), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return iso;
  }
}

/** The same date with the weekday and month spelled out, for headings. */
export function formatDateLongLocalized(iso: string, language: string | undefined): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  try {
    return new Intl.DateTimeFormat(localeFor(language), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return iso;
  }
}

/**
 * A plain count — guests, orders, tables — grouped the way the reader expects.
 *
 * Deliberately NOT currency formatting: an order count is not money and must never pick
 * up a currency symbol. Money goes through `formatMoney` in `currency.ts`.
 */
export function formatNumberLocalized(
  value: number | null | undefined,
  language: string | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  try {
    return new Intl.NumberFormat(localeFor(language), options).format(n);
  } catch {
    return String(n);
  }
}

/**
 * Substitute `{name}`-style placeholders in a translated string.
 *
 * Translations hold the whole sentence with its slots marked, so each language keeps its
 * own word order — Thai and Chinese do not put the guest count where Vietnamese does, and
 * stitching fragments together in JSX would force them to. A missing variable renders as
 * an empty string rather than leaving `{guests}` on screen.
 */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined> = {}
): string {
  return String(template).replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? '' : String(v);
  });
}
