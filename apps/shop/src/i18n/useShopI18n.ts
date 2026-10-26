import { useCallback } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { BookingStatus } from '@shared/booking';
import {
  fillTemplate,
  formatDateLocalized,
  formatDateLongLocalized,
  formatNumberLocalized
} from '@shared/locale';

/**
 * Everything a Dashboard screen needs to write text for the staff member reading it.
 *
 * `useLanguage().t` alone is not enough here for three reasons, and each of them used to
 * be solved screen by screen:
 *
 *  - **Sentences with values in them.** `t` has no placeholders, so a screen either
 *    concatenated fragments in JSX — which locks in Vietnamese word order, and Thai and
 *    Chinese do not put the guest count where Vietnamese does — or kept the whole sentence
 *    in Vietnamese. `tf` fills `{name}`-style slots so each language keeps its own
 *    sentence.
 *  - **Booking status.** `BOOKING_STATUS_LABEL_VI` in `shared/booking.ts` is Vietnamese by
 *    name and by content, and the customer app still uses it. `statusLabel` reads the
 *    same seven statuses out of the dictionary instead, so the shop side translates
 *    without touching what the guest sees.
 *  - **Dates and counts.** `formatDateVi` is DD/MM/YYYY always. `fmtDate` asks the
 *    reader's locale. `num` groups a plain count without ever attaching a currency
 *    symbol — money goes through `useMoney`, and the two must not be confused.
 */
export function useShopI18n() {
  const { t: contextT, language } = useLanguage();

  /**
   * `t` from the context is a fresh closure on every render, which makes it unusable as a
   * `useCallback`/`useEffect` dependency: a loader that depends on it would be rebuilt
   * every render and refetch in a loop. It reads nothing but the module-level dictionary
   * and `language`, so re-creating it per language is both stable and correct — screens
   * can list it as a dependency and mean it.
   */
  const t = useCallback(
    (key: string, fallback?: string) => contextT(key, fallback),
    // contextT is intentionally omitted: `language` is the only input that changes its result.
    [language]
  );

  /** A translated sentence with its `{slots}` filled in. */
  const tf = useCallback(
    (key: string, vars: Record<string, string | number | null | undefined> = {}, fallback?: string) =>
      fillTemplate(t(key, fallback), vars),
    [t]
  );

  const fmtDate = useCallback((iso: string) => formatDateLocalized(iso, language), [language]);
  const fmtDateLong = useCallback((iso: string) => formatDateLongLocalized(iso, language), [language]);

  const num = useCallback(
    (value: number | null | undefined, options?: Intl.NumberFormatOptions) =>
      formatNumberLocalized(value, language, options),
    [language]
  );

  /**
   * A booking status in the reader's language. The key is derived from the status string
   * itself, so a status added to `shared/booking.ts` shows up as a visible missing key
   * (`shop.status.<new>`) rather than silently rendering the wrong label.
   */
  const statusLabel = useCallback((status: BookingStatus | string) => t(`shop.status.${status}`), [t]);

  return { t, tf, language, fmtDate, fmtDateLong, num, statusLabel };
}
