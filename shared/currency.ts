/**
 * Money: which currencies a shop may use, and how an amount is written out.
 *
 * Two rules hold everywhere in Mobler:
 *
 *  1. The CODE is the identity. ISO 4217 — USD, TWD, THB, VND — is what the database
 *     stores, what the API accepts and what every comparison is made on. Symbols are
 *     display only: "$" alone is used by a dozen countries, and the New Taiwan Dollar is
 *     written NT$ and spoken of as "NTD" while its ISO code is TWD. Storing a symbol, or
 *     storing "NTD", would mean guessing later which currency was meant.
 *
 *  2. An amount is a plain number with NO currency built into it. The currency comes from
 *     the record it belongs to — an order carries the currency it was taken in, a menu
 *     price is read in the shop's current currency. So changing a shop's currency setting
 *     never converts anything: it changes what future amounts are labelled, and nothing
 *     about the numbers already stored. See `backend/server/coreRoutes.ts` for the rule,
 *     and the warning the shop is shown before saving the change.
 */

import { LOCALE_BY_LANGUAGE } from './locale';

export const CURRENCY_CODES = ['VND', 'USD', 'TWD', 'THB'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/**
 * VND, because that is what the system already was. Every amount in the database predates
 * this field and was written, displayed and reasoned about as Vietnamese dong — the old
 * display code read `value.toLocaleString('vi-VN') + 'đ'`. Defaulting to anything else
 * would silently relabel real money.
 */
export const DEFAULT_CURRENCY: CurrencyCode = 'VND';

export interface CurrencyMeta {
  code: CurrencyCode;
  /** What the shop sees in the picker, in its own language. */
  label: Record<'vi' | 'en' | 'zh-TW' | 'th', string>;
  /** Display symbol. Never used on its own to identify the currency. */
  symbol: string;
  /** Digits after the decimal separator, per ISO 4217. */
  decimals: number;
  /** The locale whose conventions suit this currency when the UI language gives no better hint. */
  nativeLocale: string;
  /**
   * How much a price input moves per arrow-key press, and the two one-tap bumps the size
   * editor offers.
   *
   * These were hard-coded as 1000 and "+5k / +7k", which is right for the dong and absurd
   * for anything else: a shop pricing in dollars does not raise a size by $5,000, and a
   * $0.0125 step is not a step. The magnitudes differ by a factor of a thousand between
   * these four currencies, so the increment belongs to the currency, not to the screen.
   */
  priceStep: number;
  quickAdjust: [number, number];
  /**
   * The lowest price the size templates will produce. It replaces a hard-coded floor of
   * 10,000 — a sane minimum in dong and a nonsensical one in dollars. Templates express
   * their differences as multiples of `priceStep` for the same reason.
   */
  minPrice: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  VND: {
    code: 'VND',
    label: { vi: 'Việt Nam đồng', en: 'Vietnamese Dong', 'zh-TW': '越南盾', th: 'ดองเวียดนาม' },
    symbol: '₫',
    decimals: 0,          // the dong has no subunit in practice
    nativeLocale: 'vi-VN',
    priceStep: 1000,
    quickAdjust: [5000, 7000],
    minPrice: 10000
  },
  USD: {
    code: 'USD',
    label: { vi: 'Đô la Mỹ', en: 'US Dollar', 'zh-TW': '美元', th: 'ดอลลาร์สหรัฐ' },
    symbol: '$',
    decimals: 2,
    nativeLocale: 'en-US',
    priceStep: 0.5,
    quickAdjust: [0.5, 1],
    minPrice: 1
  },
  TWD: {
    code: 'TWD',
    // "NTD" is what people call it; TWD is what the ledger stores. Both appear, each in
    // the place it belongs.
    label: { vi: 'Đài tệ (NTD)', en: 'New Taiwan Dollar (NTD)', 'zh-TW': '新台幣', th: 'ดอลลาร์ไต้หวันใหม่' },
    symbol: 'NT$',
    decimals: 0,          // priced in whole dollars in everyday use
    nativeLocale: 'zh-TW',
    priceStep: 5,
    quickAdjust: [5, 10],
    minPrice: 20
  },
  THB: {
    code: 'THB',
    label: { vi: 'Baht Thái', en: 'Thai Baht', 'zh-TW': '泰銖', th: 'บาทไทย' },
    symbol: '฿',
    decimals: 0,          // cafés price in whole baht
    nativeLocale: 'th-TH',
    priceStep: 5,
    quickAdjust: [5, 10],
    minPrice: 20
  }
};

/**
 * The UI language decides grouping and separators; the currency decides the symbol.
 * `LOCALE_BY_LANGUAGE` is imported from `locale.ts` and shared with date formatting, so a
 * new language is added in one place.
 */

/** True only for one of the four codes. Anything else is refused rather than stored. */
export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value);
}

/** The stored code, or the default when a record predates the field or holds nonsense. */
export function toCurrencyCode(value: unknown): CurrencyCode {
  return isCurrencyCode(value) ? value : DEFAULT_CURRENCY;
}

/**
 * One amount, written for one reader.
 *
 * `Intl.NumberFormat` already knows every currency's symbol placement, grouping and
 * decimal rules in every locale, so the only decisions left here are which locale to ask
 * in (the reader's language) and how many decimals to show (the currency's own).
 *
 * TWD is the exception worth naming: browsers write it "TW$" or "NT$" depending on the
 * locale, and in Vietnamese they fall back to the bare code. The symbol is substituted so
 * a shop in Taipei always sees NT$, which is what its customers would recognise.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: unknown = DEFAULT_CURRENCY,
  language = 'vi'
): string {
  const code = toCurrencyCode(currency);
  const meta = CURRENCIES[code];
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const locale = LOCALE_BY_LANGUAGE[language] || meta.nativeLocale;

  try {
    // formatToParts, not format(), so the symbol can be replaced precisely. Left to
    // itself a browser writes TWD as a bare "$" in English and Chinese — identical to
    // USD on the same screen — and writes THB as "THB 350" rather than "฿350". The
    // locale still decides grouping, decimal marks and which side the symbol sits on;
    // only the symbol text itself is ours.
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals
    }).formatToParts(value);
    return parts.map(p => (p.type === 'currency' ? meta.symbol : p.value)).join('');
  } catch {
    // A runtime without full ICU data (some minimal Node builds) throws on some
    // locale/currency pairs. A readable fallback beats an exception in a price list.
    const grouped = value.toLocaleString(locale === 'vi-VN' ? 'vi-VN' : 'en-US', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals
    });
    return code === 'VND' ? `${grouped} ${meta.symbol}` : `${meta.symbol}${grouped}`;
  }
}

/** "VND — Việt Nam đồng", for a picker where the code must stay visible. */
export function currencyLabel(code: CurrencyCode, language = 'vi'): string {
  const meta = CURRENCIES[code];
  const lang = (language in meta.label ? language : 'en') as keyof CurrencyMeta['label'];
  return `${meta.code} — ${meta.label[lang]}`;
}
