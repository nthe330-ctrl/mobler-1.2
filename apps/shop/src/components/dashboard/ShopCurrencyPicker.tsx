import { useEffect, useRef, useState } from 'react';
import { Check, Coins, Loader2 } from 'lucide-react';
import { CURRENCIES, CURRENCY_CODES, currencyLabel, toCurrencyCode, type CurrencyCode } from '@shared/currency';
import { shopApi } from '../../services/shopApi';
import { useShopAuth } from '../../context/ShopAuthContext';
import { useShopI18n } from '../../i18n/useShopI18n';
import { useApiError } from '../../i18n/apiError';
import CurrencyChangeWarning from './CurrencyChangeWarning';

/**
 * The shop's currency, changeable from the sidebar.
 *
 * Unlike the language switch beside it, this is NOT a personal preference: it is a
 * shop-wide setting that every price on every screen is then read in, and the server
 * converts nothing when it changes. So picking a currency here does not save it — it asks
 * first, showing the same warning Regional Preferences shows, with the shop's own numbers
 * in it. A stray click in a sidebar must never be able to restate a shop's prices.
 *
 * It saves on its own (Regional Preferences saves currency with the rest of the profile
 * form), which is why the request, the busy state and the error live here.
 */
export default function ShopCurrencyPicker() {
  const { activeShop, replaceShop } = useShopAuth();
  const { t, language } = useShopI18n();
  const apiError = useApiError();

  const saved = toCurrencyCode(activeShop?.currency_code);
  const [open, setOpen] = useState(false);
  /** The currency the staff member picked and has not confirmed yet. */
  const [pending, setPending] = useState<CurrencyCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Same rule as the language menu: a menu that survives a click elsewhere reads as stuck.
  useEffect(() => {
    if (!open && !pending) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setOpen(false); setPending(null); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setPending(null); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, pending]);

  // If the shop is switched, or the profile screen saves a different currency, drop a
  // half-finished choice rather than letting it confirm against the wrong shop.
  useEffect(() => { setPending(null); setError(null); }, [activeShop?.id, saved]);

  if (!activeShop) return null;

  const confirm = async () => {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      const res = await shopApi.updateShop(activeShop.id, { currency_code: pending });
      replaceShop(res.shop);
      setPending(null);
      setOpen(false);
    } catch (err) {
      // Left on screen: the currency did NOT change, and the staff member has to know
      // that, otherwise they will read every later price in the currency they thought
      // they had picked.
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setPending(null); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('shop.regional.currency')}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm hover:border-red-600"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Coins size={16} className="shrink-0" />
          <span className="truncate font-bold text-gray-800">{CURRENCIES[saved].symbol} {saved}</span>
        </span>
        {/* The currency's own name, matching the language row beside it. No sample digits:
            a bare "0" beside the code read as a value rather than a format hint. */}
        <span className="text-[11px] text-gray-400 truncate max-w-[88px]">{CURRENCIES[saved].label[language] ?? saved}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('shop.regional.currency')}
          className="absolute z-50 left-0 right-0 bottom-full mb-2 rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        >
          {CURRENCY_CODES.map(code => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === saved}
                onClick={() => (code === saved ? setOpen(false) : setPending(code))}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  code === saved ? 'font-bold text-red-700' : 'text-gray-700'
                }`}
              >
                <span aria-hidden="true" className="w-7 shrink-0 font-bold">{CURRENCIES[code].symbol}</span>
                <span className="flex-1 truncate">{currencyLabel(code, language)}</span>
                {code === saved && <Check size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* The confirm step. Nothing has been sent to the server at this point. */}
      {pending && (
        <div className="absolute z-50 left-0 bottom-full mb-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <CurrencyChangeWarning from={saved} to={pending} />
          {error != null && (
            <p role="alert" className="mt-2 text-[12px] font-semibold text-red-700">{apiError(error)}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {/* The existing key ends exactly where the code goes in all four languages
                  ("…đổi sang", "…switch to", "…改為", "…เปลี่ยนเป็น"), so the code follows
                  it rather than the key gaining a slot it never had. */}
              {t('shop.regional.confirmChange')} {pending}
            </button>
            <button
              type="button"
              onClick={() => { setPending(null); setError(null); }}
              disabled={saving}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold text-[13px] disabled:opacity-60"
            >
              {t('shop.common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
