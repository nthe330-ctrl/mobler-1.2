import { useEffect } from 'react';
import { CalendarDays, Coffee, StickyNote, Users, Armchair, Check, X, CreditCard } from 'lucide-react';
import { BookingDTO } from '@shared/booking';
import { useMoney } from '../../hooks/useMoney';
import { useShopI18n } from '../../i18n/useShopI18n';

interface Props {
  booking: BookingDTO;
  /** Total unresolved pending requests, including this one — shown as a small queue counter. */
  queueCount: number;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}

/** Plays one short "ring" burst — looped by the effect below like an incoming call. */
function ringOnce() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [720, 960].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.22);
      osc.stop(ctx.currentTime + i * 0.22 + 0.4);
    });
    ctx.close && setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1200);
  } catch {
    // audio not allowed yet (needs a user gesture first) — the modal still works, just silent.
  }
}

/**
 * Full-screen, non-dismissible "incoming call" style gate for a new booking request.
 * There is deliberately NO backdrop-click-to-close and NO Escape handler: the shop must
 * explicitly choose Xác nhận or Từ chối before this can go away (see LiveBookingsView,
 * which renders this whenever pendingSorted.length > 0).
 */
export default function IncomingOrderModal({ booking: b, queueCount, busy, onAccept, onReject }: Props) {
  const { money } = useMoney();
  const { t, tf, fmtDate } = useShopI18n();
  // Ring repeatedly until the shop acts on this request.
  useEffect(() => {
    ringOnce();
    const id = window.setInterval(ringOnce, 2200);
    return () => window.clearInterval(id);
  }, [b.id]);

  const itemCount = b.order?.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  const total = b.grand_total ?? b.order?.total;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={t('shop.incoming.aria')}
      className="fixed inset-0 z-[200] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-amber-400 animate-in zoom-in-95">
        {/* Ringing header */}
        <div className="bg-gradient-to-br from-amber-500 to-red-600 text-white px-5 py-5 text-center relative">
          {queueCount > 1 && (
            <span className="absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/30">
              {tf('shop.incoming.queue', { count: queueCount - 1 })}
            </span>
          )}
          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-2 relative">
            <img
              src={b.user_avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(b.user_name || 'Mobler guest')}&backgroundColor=ffd5dc,ffdfbf`}
              alt={tf('shop.incoming.avatarAlt', { name: b.user_name })}
              className="relative w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
              onError={event => {
                event.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(b.user_name || 'Khách')}`;
              }}
            />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-90">{t('shop.incoming.kicker')}</p>
          <p className="text-lg font-black mt-0.5">{t('shop.incoming.mustDecide')}</p>
        </div>

        {/* Full booking + customer info */}
        <div className="p-5 space-y-3 max-h-[52vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-black text-gray-900">{b.user_name}</p>
              <a href={`tel:${b.user_phone}`} className="text-sm font-bold text-red-700">{b.user_phone}</a>
            </div>
            <span className="text-[11px] font-mono text-gray-400">{b.id}</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-sm">
            <div className="flex items-center gap-1.5 text-gray-700"><CalendarDays size={14} className="text-amber-600" /> {fmtDate(b.date)}</div>
            <div className="flex items-center gap-1.5 text-gray-700 font-bold"><Coffee size={14} className="text-amber-600" /> {b.time}</div>
            <div className="flex items-center gap-1.5 text-gray-700"><Users size={14} className="text-amber-600" /> {tf('shop.live.guestsCount', { count: b.guests })}</div>
            <div className="flex items-center gap-1.5 text-gray-700"><Armchair size={14} className="text-amber-600" /> {b.table_name || b.table_id || '—'}</div>
          </div>

          {b.note && (
            <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1.5 flex gap-1.5">
              <StickyNote size={13} className="shrink-0 mt-0.5 text-gray-400" /> {b.note}
            </p>
          )}

          {b.order?.items?.length ? (
            <div className="text-xs text-gray-700 bg-gray-50 rounded-lg px-2.5 py-2">
              <p className="font-bold flex items-center gap-1.5 mb-1"><Coffee size={13} className="text-amber-600" /> {tf('shop.incoming.preorderCount', { count: itemCount })}</p>
              <ul className="pl-5 list-disc space-y-0.5">
                {b.order.items.map((i, idx) => <li key={idx}>{i.quantity}× {i.name} <span className="text-gray-400">{i.options}</span></li>)}
              </ul>
            </div>
          ) : null}

          {typeof total === 'number' && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100">
              <span className="flex items-center gap-1.5 text-gray-500"><CreditCard size={14} /> {['paid', 'paid_at_store', 'paid_online'].includes(b.payment_status || '') ? t('shop.incoming.paid') : b.payment_method === 'at_store' ? t('shop.incoming.payAtStore') : t('shop.incoming.payPending')}</span>
              <span className="font-black text-gray-900">{money(total)}</span>
            </div>
          )}
        </div>

        {/* The only two ways out */}
        <div className="p-4 grid grid-cols-2 gap-3 border-t border-gray-100">
          <button
            disabled={busy}
            onClick={onReject}
            className="py-3.5 rounded-2xl border-2 border-gray-300 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <X size={18} /> {t('shop.incoming.reject')}
          </button>
          <button
            disabled={busy}
            onClick={onAccept}
            className="py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Check size={18} /> {t('shop.incoming.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
