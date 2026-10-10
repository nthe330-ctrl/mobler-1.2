import { CalendarCheck, CheckCircle2, Circle, Coffee, MapPin, Star, Ticket, TrendingUp, Users, Wallet } from 'lucide-react';
import { BOOKING_STATUS_LABEL_VI, formatDateVi } from '@shared/booking';
import { useShopAuth } from '../../context/ShopAuthContext';
import { useInsights, vnd } from '../../hooks/useInsights';
import type { DashboardView } from './DashboardLayout';

/** Shop overview — every number comes from the shop's own activity; a new shop starts at zero. */
export default function OverviewView({ onNavigate }: { onNavigate: (v: DashboardView) => void }) {
  const { activeShop } = useShopAuth();
  const { data, error } = useInsights(14);

  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  if (!data || !activeShop) return <div className="p-10 text-center text-gray-500 text-sm">Đang tải…</div>;
  const t = data.totals;
  const maxRev = Math.max(1, ...data.series.map(s => s.revenue));
  const maxBk = Math.max(1, ...data.series.map(s => s.bookings));
  const hasActivity = t.bookings > 0 || t.orders > 0;

  const steps = [
    { done: t.menuItems > 0, label: 'Thêm món vào thực đơn', go: 'menu' as DashboardView, icon: <Coffee size={16} /> },
    { done: !!activeShop.location, label: 'Đặt vị trí quán để khách tìm thấy theo khu vực', go: 'profile' as DashboardView, icon: <MapPin size={16} /> },
    { done: !!activeShop.description, label: 'Viết giới thiệu và ảnh bìa cho quán', go: 'profile' as DashboardView, icon: <Star size={16} /> },
    { done: t.activeVouchers > 0, label: 'Tạo voucher ưu đãi đầu tiên (không bắt buộc)', go: 'vouchers' as DashboardView, icon: <Ticket size={16} /> }
  ];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-black text-gray-900">Tổng quan</h2>
        <p className="text-sm text-gray-500 mt-1">Số liệu thật của {activeShop.name}, cập nhật từ đặt bàn, đơn gọi món và đánh giá.</p>
      </div>

      {steps.some(s => !s.done) && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-black text-gray-900 mb-3">Chuẩn bị nhận khách</h3>
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
        <Kpi icon={<Wallet size={18} />} label="Doanh thu hôm nay" value={vnd(t.todayRevenue)} sub={`Tổng: ${vnd(t.revenue)}`} />
        <Kpi icon={<CalendarCheck size={18} />} label="Đặt bàn hôm nay" value={String(t.todayBookings)} sub={`${t.pendingBookings} chờ xác nhận`} onClick={() => onNavigate('bookings')} />
        <Kpi icon={<Users size={18} />} label="Khách hàng" value={String(t.customers)} sub={`${t.bookings} lượt đặt bàn`} />
        <Kpi icon={<Star size={18} />} label="Đánh giá" value={t.averageRating != null ? `${t.averageRating}★` : '—'} sub={`${t.reviews} đánh giá`} />
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="font-black text-gray-900 mb-1 flex items-center gap-2"><TrendingUp size={18} className="text-red-600" /> 14 ngày gần đây</h3>
        {!hasActivity ? (
          <p className="text-sm text-gray-500 py-8 text-center">Chưa có doanh thu hay đặt bàn nào. Số liệu sẽ xuất hiện khi khách bắt đầu đặt bàn và gọi món.</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">Cột đỏ: doanh thu · Cột xám: số lượt đặt bàn</p>
            <div className="flex items-end gap-1.5 h-40">
              {data.series.map(s => (
                <div key={s.date} className="flex-1 min-w-0 flex flex-col items-center gap-1" title={`${formatDateVi(s.date)}: ${vnd(s.revenue)} · ${s.bookings} đặt bàn`}>
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
          <h3 className="font-black text-gray-900">Đặt bàn mới nhất</h3>
          <button onClick={() => onNavigate('bookings')} className="text-xs font-bold text-red-700 underline">Xem tất cả</button>
        </div>
        {data.recentBookings.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có lượt đặt bàn nào.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {data.recentBookings.map(b => (
              <li key={b.id} className="py-2.5 flex items-center gap-3">
                <span className="font-black tabular-nums w-12">{b.time}</span>
                <span className="flex-1 min-w-0 truncate">{b.user_name} · {b.guests} khách · {formatDateVi(b.date)}</span>
                <span className="text-xs font-semibold text-gray-600">{BOOKING_STATUS_LABEL_VI[b.status as keyof typeof BOOKING_STATUS_LABEL_VI]}</span>
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
