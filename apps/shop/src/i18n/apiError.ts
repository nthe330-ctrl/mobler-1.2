import { useCallback } from 'react';
import { ApiError } from '@shared/api/http';
import { isShopErrorCode, type ShopErrorDetail } from '@shared/apiErrors';
import { useShopI18n } from './useShopI18n';

/**
 * Turns whatever a failed request threw into a sentence in the reader's language.
 *
 * The API answers a failure with a Vietnamese sentence in `error` plus a stable `code`
 * (shared/apiErrors.ts). Before this, screens showed `err.message` directly, so a Taipei
 * or Bangkok staff member hit Vietnamese text on an otherwise translated screen — the one
 * place where being told what went wrong matters most.
 *
 * Three deliberate choices:
 *
 *  - **The code decides, the server sentence is the fallback.** An unknown code — an older
 *    client against a newer server, or a route that has no code yet — falls through to the
 *    server's own text. Untranslated beats blank.
 *  - **Status values are translated, not pasted.** `BOOKING_BAD_TRANSITION` carries the two
 *    statuses as raw values (`pending`, `arrived`); they go through `statusLabel` so the
 *    sentence reads in one language throughout rather than mixing in `"no_show"`.
 *  - **Nothing is thrown away.** Anything that is not an ApiError (a bug in our own code, a
 *    rejected promise with no message) still produces the generic failure line instead of
 *    an empty string, so a dialog is never silently blank.
 */
export function useApiError() {
  const { t, tf, statusLabel } = useShopI18n();

  return useCallback(
    (err: unknown): string => {
      const api = err instanceof ApiError ? err : null;
      const code = api?.code ?? (err as any)?.code;
      const serverText = (err as any)?.message ? String((err as any).message) : '';

      // REQUEST_FAILED is what the HTTP client stamps on a failure that carried no code of
      // its own, so it means "no code" rather than a diagnosis. The server's own sentence
      // is more specific than the generic line, so it wins when there is one.
      if (!isShopErrorCode(code) || code === 'REQUEST_FAILED') {
        return serverText || t('shop.error.REQUEST_FAILED');
      }

      const detail: ShopErrorDetail = (api?.data?.detail as ShopErrorDetail) || {};
      const vars: Record<string, string | number> = {};
      if (detail.from) vars.from = statusLabel(detail.from);
      if (detail.to) vars.to = statusLabel(detail.to);
      if (detail.status) vars.status = statusLabel(detail.status);
      if (detail.expected) vars.expected = detail.expected;
      if (detail.name) vars.name = detail.name;
      if (detail.limit !== undefined) vars.limit = detail.limit;

      // The server sentence is the fallback for this key too: a code that is in the list
      // but somehow missing from the dictionary must not render as `shop.error.X`.
      return tf(`shop.error.${code}`, vars, serverText || undefined);
    },
    [t, tf, statusLabel]
  );
}
