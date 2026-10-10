import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatDateVi } from '@shared/booking';
import { useInsights, vnd } from '../../hooks/useInsights';

/** Statistics computed only from this shop's real orders and bookings. */
export default function AnalyticsView() {
  const [days, setDays] = useState(30);
  const { data, error } = useInsights(days);

  if (error) return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>;
  if (!data) return <div className="p-10 text-center text-gray-500 text-sm">Đang tải…</div>;
  const t = data.totals;
  const periodRevenue = data.series.reduce((s, d) => s + d.revenue, 0);
  const periodBookings = data.series.reduce((s, d) => s + d.bookings, 0);
  const periodGuests = data.series.reduce((s, d) => s + d.guests, 0);
  const maxRev = Math.max(1, ...data.series.map(s => s.revenue));
  const maxHour = Math.max(1, ...data.hours.map(h => h.bookings));
  const empty = periodRevenue === 0 && periodBookings === 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><BarChart3 className="text-red-600" /> Thống kê</h2>
          <p className="text-sm text-gray-500 mt-1">Chỉ tính từ đơn gọi món và đặt bàn thật của quán.</p>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 text-sm font-bold">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg ${days === d ? 'bg-red-600 text-white' : 'text-gray-600'}`}>{d} ngày</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={`Doanh thu ${days} ngày`} value={vnd(periodRevenue)} />
        <Stat label="Lượt đặt bàn" value={String(periodBookings)} />
        <Stat label="Số khách" value={String(periodGuests)} />
        <Stat label="Tỷ lệ hủy/từ chối" value={t.bookings ? `${Math.round((t.cancelledBookings / t.bookings) * 100)}%` : '—'} />
      </div>

      {empty ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
          Chưa có dữ liệu trong {days} ngày qua. Biểu đồ sẽ hiện khi quán có đơn gọi món hoặc lượt đặt bàn.
        </div>
      ) : (
        <>
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-black text-gray-900 mb-4">Doanh thu theo ngày</h3>
            <div className="flex items-end gap-1 h-44">
              {data.series.map(s => (
                <div key={s.date} className="flex-1 min-w-0 h-full flex items-end" title={`${formatDateVi(s.date)}: ${vnd(s.revenue)}`}>
                  <div className="w-full bg-red-500 rounded-t" style={{ height: `${(s.revenue / maxRev) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>{formatDateVi(data.series[0].date)}</span>
              <span>{formatDateVi(data.series[data.series.length - 1].date)}</span>
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-5">
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-black text-gray-900 mb-3">Món bán chạy</h3>
              {data.topItems.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có đơn gọi món.</p>
              ) : (
                <ol className="space-y-2 text-sm">
                  {data.topItems.map((it, i) => (
                    <li key={it.name} className="flex items-center gap-3">
                      <span className="w-5 text-gray-400 font-bold">{i + 1}</span>
                      <span className="flex-1 truncate font-semibold">{it.name}</span>
                      <span className="tabular-nums text-gray-600">{it.quantity} phần</span>
                      <span className="tabular-nums font-bold w-28 text-right">{vnd(it.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-black text-gray-900 mb-3">Giờ khách đặt bàn nhiều nhất</h3>
              <div className="flex items-end gap-0.5 h-32">
                {data.hours.map(h => (
                  <div key={h.hour} className="flex-1 h-full flex items-end" title={`${h.hour}:00 — ${h.bookings} lượt`}>
                    <div className="w-full bg-gray-400 rounded-t" style={{ height: `${(h.bookings / maxHour) * 100}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-1"><span>0h</span><span>12h</span><span>23h</span></div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-2xl font-black text-gray-900 mt-1 tabular-nums">{value}</p>
    </div>
  );
}
