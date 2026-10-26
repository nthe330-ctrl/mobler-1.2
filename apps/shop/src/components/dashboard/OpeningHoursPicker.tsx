import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { parseOpenRange, formatOpenRange, TIME_CHOICES, DEFAULT_OPEN_RANGE } from '@shared/openingHours';
import { useShopI18n } from '../../i18n/useShopI18n';

/**
 * Opening hours, picked rather than typed.
 *
 * This field is not decoration: `isWithinOpeningHours` gates what times a guest may book,
 * and it is deliberately permissive — a string it cannot parse returns null, and null means
 * "we don't know", so the check is skipped and every hour becomes bookable. A free-text box
 * made that one typo away: "7h - 22h", "Mở cả ngày", a full-width colon from a Chinese
 * keyboard, and the shop would silently start accepting 3am bookings with nothing on screen
 * to say so.
 *
 * Two dropdowns can only produce `HH:MM - HH:MM`, the exact shape the parser reads. The
 * stored string keeps that format, so the customer app, the seeded shops and the booking
 * rules all keep working unchanged.
 *
 * 24-hour clock everywhere, with no AM/PM: it is what all four of the product's locales use
 * for shop hours, and it removes the midnight ambiguity that 12-hour labels carry.
 * `24:00` is offered as a closing time only — the parser reads it as midnight at the END of
 * the day, which is how a shop open until midnight says so without looping to 00:00.
 */
export default function OpeningHoursPicker({
  value,
  onChange
}: {
  /** The stored string, e.g. "07:00 - 22:00". */
  value: string;
  onChange: (next: string) => void;
}) {
  const { t } = useShopI18n();

  // An unparseable stored value (older data typed by hand) falls back to the default rather
  // than leaving both dropdowns blank, and saving then repairs it into a readable range.
  const range = useMemo(() => parseOpenRange(value) ?? DEFAULT_OPEN_RANGE, [value]);
  const unreadable = value.trim() !== '' && parseOpenRange(value) === null;

  const set = (part: 'open' | 'close') => (e: { target: { value: string } }) =>
    onChange(formatOpenRange({ ...range, [part]: e.target.value }));

  const selectCls =
    'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white';

  return (
    <div>
      <div className="flex items-center gap-2">
        <select className={selectCls} value={range.open} onChange={set('open')} aria-label={t('shop.hours.opensAt')}>
          {TIME_CHOICES.filter(x => x !== '24:00').map(x => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
        <span className="shrink-0 text-gray-400 font-bold">–</span>
        <select className={selectCls} value={range.close} onChange={set('close')} aria-label={t('shop.hours.closesAt')}>
          {TIME_CHOICES.map(x => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
      </div>

      <p className="mt-1.5 text-[11px] text-gray-500 flex items-start gap-1">
        <Clock size={12} className="mt-0.5 shrink-0" />
        {/* Closing earlier than opening is legitimate — a bar open 18:00–02:00 — and the
            parser handles it, so it is explained rather than refused. */}
        <span>{range.close <= range.open ? t('shop.hours.overnightHint') : t('shop.hours.hint')}</span>
      </p>

      {unreadable && (
        <p role="alert" className="mt-1 text-[11px] font-semibold text-amber-700">
          {t('shop.hours.wasUnreadable')}
        </p>
      )}
    </div>
  );
}
