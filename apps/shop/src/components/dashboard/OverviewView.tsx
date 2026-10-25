import { CalendarCheck, CheckCircle2, Circle, Coffee, MapPin, Star, Ticket, TrendingUp, Users, Wallet } from 'lucide-react';
import { useShopAuth } from '../../context/ShopAuthContext';
import { useInsights } from '../../hooks/useInsights';
import { useMoney } from '../../hooks/useMoney';
import { useShopI18n } from '../../i18n/useShopI18n';
import type { DashboardView } from './DashboardLayout';

/** Shop overview — every number comes from the shop's own activity; a new shop starts at zero. */
export default function OverviewView({ onNavigate }: { onNavigate: (v: DashboardView) => void }) {
  const { activeShop } = useShopAuth();
  const { data, error } = useInsights(14);
  const { money } = useMoney();
  const { t: tr, tf, fmtDate, num, statusLabel } = useShopI18n();

  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  if (!data || !activeShop) return <div className="p-10 text-center text-gray-500 text-sm">{tr('shop.common.loading')}</div>;
  const t = data.totals;
  const maxRev = Math.max(1, ...data.series.map(s => s.revenue));
  const maxBk = Math.max(1, ...data.series.map(s => s.bookings));
  const hasActivity = t.bookings > 0 || t.orders > 0;

  const steps = [
    { done: t.menuItems > 0, label: tr('shop.ovw.setupMenu'), go: 'menu' as DashboardView, icon: <Coffee size={16} /> },
    { done: !!activeShop.location, label: tr('shop.ovw.setupLocation'), go: 'profile' as DashboardView, icon: <MapPin size={16} /> },
    { done: !!activeShop.description, label: tr('shop.ovw.setupProfile'), go: 'profile' as DashboardView, icon: <Star size={16} /> },
    { done: t.activeVouchers > 0, label: tr('shop.ovw.setupVoucher'), go: 'vouchers' as DashboardView, icon: <Ticket size={16} /> }
  ];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-black text-gray-900">{tr('shop.ovw.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{tf('shop.ovw.subtitle', { shop: activeShop.name })}</p>
      </div>

      {steps.some(s => !s.done) && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-black text-gray-900 mb-3">{tr('shop.ovw.setupTitle')}</h3>
          <ul className="space-y-2">
            {steps.map(s => (
              <li key={s.label}>
                <button onClick={() => onNavigate(s.go)} className="w-full flex items-center gap-3 text-left text-sm px-3 py-2 rounded-xl hover:bg-gray-50">
                  {s.done ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <Circle size={18} className="text-gray-300 shrink-0" />}
                  <span className={s.done ? 'text-gray-400 line-through' : 'text-gray-800 font-semibold'}>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Wallet size={18} />} label={tr('shop.ovw.kpiRevenueToday')} value={money(t.todayRevenue)} sub={tf('shop.ovw.kpiTotal', { amount: money(t.revenue) })} />
        <Kpi icon={<CalendarCheck size={18} />} label={tr('shop.ovw.kpiBookingsToday')} value={num(t.todayBookings)} sub={tf('shop.ovw.kpiPendingSub', { count: num(t.pendingBookings) })} onClick={() => onNavigate('bookings')} />
        <Kpi icon={<Users size={18} />} label={tr('shop.ovw.kpiCustomers')} value={num(t.customers)} sub={tf('shop.ovw.kpiBookingsSub', { count: num(t.bookings) })} />
        <Kpi icon={<Star size={18} />} label={tr('shop.ovw.kpiRating')} value={t.averageRating != null ? `${t.averageRating}★` : '—'} sub={tf('shop.ovw.kpiReviewsSub', { count: num(t.reviews) })} />
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-black text-gray-900 mb-1 flex items-center gap-2"><TrendingUp size={18} className="text-red-600" /> {tr('shop.ovw.last14')}</h3>
        {!hasActivity ? (
          <p className="text-sm text-gray-500 py-8 text-center">{tr('shop.ovw.noSeries')}</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">{tr('shop.ovw.legend')}</p>
            <div className="flex items-end gap-1.5 h-40">
              {data.series.map(s => (
                <div key={s.date} className="flex-1 min-w-0 flex flex-col items-center gap-1" title={tf('shop.ovw.chartTip', { date: fmtDate(s.date), amount: money(s.revenue), bookings: num(s.bookings) })}>
                  <div className="w-full flex items-end gap-0.5 h-32">
                    <div className="flex-1 bg-red-500 rounded-t" style={{ height: `${(s.revenue / maxRev) * 100}%` }} />
                    <div className="flex-1 bg-gray-300 rounded-t" style={{ height: `${(s.bookings / maxBk) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-500">{s.date.slice(8)}/{s.date.slice(5, 7)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-gray-900">{tr('shop.ovw.latest')}</h3>
          <button onClick={() => onNavigate('bookings')} className="text-xs font-bold text-red-700 underline">{tr('shop.ovw.viewAll')}</button>
        </div>
        {data.recentBookings.length === 0 ? (
          <p className="text-sm text-gray-500">{tr('shop.ovw.noBookings')}</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {data.recentBookings.map(b => (
              <li key={b.id} className="py-2.5 flex items-center gap-3">
                <span className="font-black tabular-nums w-12">{b.time}</span>
                <span className="flex-1 min-w-0 truncate">{tf('shop.ovw.bookingLine', { name: b.user_name, guests: b.guests, date: fmtDate(b.date) })}</span>
                <span className="text-xs font-semibold text-gray-600">{statusLabel(b.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value: string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="text-left bg-white rounded-2xl border border-gray-200 p-4 disabled:cursor-default enabled:hover:border-red-300">
      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><span className="text-red-600">{icon}</span>{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </button>
  );
}
