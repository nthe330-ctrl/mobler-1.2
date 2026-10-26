import { formatMoney, type CurrencyCode } from '@shared/currency';
import { useShopI18n } from '../../i18n/useShopI18n';

/**
 * The warning shown whenever a shop is about to change its currency.
 *
 * It lives in its own file because it is now shown in two places — Regional Preferences
 * and the sidebar — and this is the one piece of text in the dashboard that must not
 * drift between them. It is literally true: the server stores the code and converts
 * nothing, so a price of 45,000 that means dong today reads as 45,000 of the new currency
 * tomorrow. Softening it in one copy and not the other would be telling a shop its prices
 * had been handled when they had not.
 *
 * The example uses the shop's own two currencies rather than prose, because "nothing is
 * converted" is abstract until you see 45.000 ₫ turn into NT$45,000.
 */
export default function CurrencyChangeWarning({ from, to }: { from: CurrencyCode; to: CurrencyCode }) {
  const { t, language } = useShopI18n();
  if (from === to) return null;

  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-sm font-bold text-amber-900">{t('shop.regional.changeWarningTitle')}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-amber-900/90">{t('shop.regional.changeWarning')}</p>
      <p className="mt-2 text-[13px] font-semibold text-amber-900">
        {formatMoney(45000, from, language)} → {formatMoney(45000, to, language)}
      </p>
    </div>
  );
}
