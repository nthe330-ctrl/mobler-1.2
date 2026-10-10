import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { STATUS_LABEL, REQUEST_STATE_LABEL, adminApi } from '../api';

/** Paid Google Maps Platform calls the backend can still make (metered in googleMeter.ts). */
const GOOGLE_COUNTERS: { key: string; label: string; note: string }[] = [
  { key: 'google.places_text_search', label: 'Places API (New) – Text Search', note: 'Tìm kiếm AI / dự phòng khi dữ liệu nội bộ chưa đủ' },
  { key: 'google.place_photo', label: 'Places API – Place Photo', note: 'Ảnh của kết quả Google (qua proxy server)' },
  { key: 'google.geocoding', label: 'Geocoding API', note: 'Kiểm tra key & tra địa chỉ từ tọa độ' }
];

export default function OverviewView() {
  const [o, setO] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => adminApi.overview().then(setO).catch(e => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (!o) return <div className="p-10 text-center text-gray-500">{error || <Loader2 className="animate-spin inline" />}</div>;
  const t = o.usage.totals as Record<string, number>;
  const searches = t['locality.search'] || 0;
  const complete = t['locality.search_complete'] || 0;
  const avoided = t['locality.google_calls_avoided_est'] || 0;
  const googleMade = GOOGLE_COUNTERS.reduce((s, c) => s + (t[c.key] || 0), 0);
  const days: any[] = o.usage.days;
  const maxDay = Math.max(1, ...days.map(d => Math.max(d.counters['locality.google_calls_avoided_est'] || 0, GOOGLE_COUNTERS.reduce((s, c) => s + (d.counters[c.key] || 0), 0))));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Tổng quan & chi phí</h1>
          <p className="text-sm text-gray-500 mt-1">Số liệu 14 ngày gần nhất.</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border bg-white" aria-label="Tải lại"><RefreshCw size={16} /></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Lượt tìm theo khu vực" value={searches} />
        <Stat label="Trả lời hoàn toàn từ dữ liệu nội bộ" value={complete} sub={searches ? `${Math.round((complete / searches) * 100)}%` : ''} tone="text-emerald-600" />
        <Stat label="Lượt gọi Google tránh được (ước tính)" value={avoided} sub={`${o.config.google_calls_per_search_estimate} lượt/1 tìm kiếm`} tone="text-emerald-600" />
        <Stat label="Lượt gọi Google vẫn phát sinh" value={googleMade} sub={`App khách dùng tìm kiếm dự phòng: ${t['locality.client_google_fallback'] || 0} lần`} tone="text-rose-600" />
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-black mb-1">Gọi Google tránh được và vẫn phát sinh, theo ngày</h2>
        <p className="text-xs text-gray-500 mb-4">Xanh: ước tính tránh được · Đỏ: thực tế đã gọi</p>
        <div className="flex items-end gap-1.5 h-40">
          {days.map(d => {
            const a = d.counters['locality.google_calls_avoided_est'] || 0;
            const g = GOOGLE_COUNTERS.reduce((s, c) => s + (d.counters[c.key] || 0), 0);
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.date}: tránh ${a}, phát sinh ${g}`}>
                <div className="w-full flex items-end gap-0.5 h-32">
                  <div className="flex-1 bg-emerald-500 rounded-t" style={{ height: `${(a / maxDay) * 100}%` }} />
                  <div className="flex-1 bg-rose-500 rounded-t" style={{ height: `${(g / maxDay) * 100}%` }} />
                </div>
                <span className="text-[9px] text-gray-500">{d.date.slice(5)}</span>
              </div>
            );
          })}
          {days.length === 0 && <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-black mb-3">Dịch vụ Google vẫn có thể tính phí</h2>
          <table className="w-full text-sm">
            <tbody>
              {GOOGLE_COUNTERS.map(c => (
                <tr key={c.key} className="border-t border-gray-100">
                  <td className="py-2 pr-2"><p className="font-semibold">{c.label}</p><p className="text-xs text-gray-500">{c.note}</p></td>
                  <td className="py-2 text-right font-black tabular-nums">{t[c.key] || 0}</td>
                </tr>
              ))}
              <tr className="border-t border-gray-100">
                <td className="py-2 pr-2"><p className="font-semibold">Maps JavaScript API (bản đồ trong app khách)</p><p className="text-xs text-gray-500">Tính phí theo lượt tải bản đồ trên thiết bị — server không đếm được</p></td>
                <td className="py-2 text-right text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="font-black mb-2">Kho địa điểm</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {Object.entries(STATUS_LABEL).map(([k, v]) => <span key={k} className="px-2.5 py-1 rounded-lg bg-gray-100">{v}: <strong>{o.places[k] || 0}</strong></span>)}
            </div>
            <p className="text-xs text-gray-500 mt-2">{o.cells_covered} ô khu vực (~1,1 km) đã được quét.</p>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1.5">Lý do không đạt</h3>
            <ul className="text-sm space-y-1">
              {Object.entries(o.disqualified_reasons).map(([k, v]) => <li key={k} className="flex justify-between"><span>{o.reason_labels[k] || k}</span><strong>{v as number}</strong></li>)}
              {Object.keys(o.disqualified_reasons).length === 0 && <li className="text-gray-500">—</li>}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1.5">Yêu cầu bổ sung</h3>
            <div className="flex flex-wrap gap-2 text-sm">
              {Object.entries(o.requests).map(([k, v]) => <span key={k} className="px-2.5 py-1 rounded-lg bg-gray-100">{REQUEST_STATE_LABEL[k] || k}: <strong>{v as number}</strong></span>)}
            </div>
            <p className="text-xs text-gray-500 mt-2">Gộp yêu cầu trùng: {t['locality.request_coalesced'] || 0} · Bị giới hạn tần suất: {t['locality.request_rate_limited'] || 0}</p>
          </div>
          <p className="text-xs text-gray-500">Ngưỡng: ≥{o.config.min_photos} ảnh, ≥{o.config.min_reviews} đánh giá · ô còn mới {o.config.cell_fresh_days} ngày · cooldown {o.config.cooldown_hours} giờ · dự phòng Google: {o.config.allow_google_fallback ? 'bật' : 'tắt'}</p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone = 'text-gray-900' }: { label: string; value: number; sub?: string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className={`text-2xl font-black mt-1 tabular-nums ${tone}`}>{value.toLocaleString('vi-VN')}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
