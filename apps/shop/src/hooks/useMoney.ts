import { useCallback } from 'react';
import { useLanguage } from '@shared/context/LanguageContext';
import { formatMoney, toCurrencyCode, type CurrencyCode } from '@shared/currency';
import { useShopAuth } from '../context/ShopAuthContext';

/**
 * One way to write money in the dashboard.
 *
 * Before this, roughly twenty places each did `value.toLocaleString() + 'đ'` by hand,
 * which hard-coded both the currency and Vietnamese grouping into every screen. A shop
 * in Taipei saw its revenue reported in dong no matter what it had configured.
 *
 * `money(amount)` uses the shop's own currency and the reader's language. `money(amount,
 * record.currency_code)` overrides it, which is how a historical order is shown in the
 * currency it was actually taken in rather than today's setting — see shared/currency.ts.
 */
export function useMoney() {
  const { language } = useLanguage();
  const { activeShop } = useShopAuth();
  const shopCurrency = toCurrencyCode(activeShop?.currency_code);

  const money = useCallback(
    (amount: number | null | undefined, currency?: unknown) =>
      formatMoney(amount, currency === undefined ? shopCurrency : currency, language),
    [shopCurrency, language]
  );

  return { money, currency: shopCurrency as CurrencyCode, language };
}
