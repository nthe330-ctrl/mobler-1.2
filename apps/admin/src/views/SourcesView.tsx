import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { RIGHTS_LABEL, RIGHTS_STYLE, adminApi, fmtTime } from '../api';

export default function SourcesView() {
  const [r, setR] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminApi.rights().then(setR).catch(e => setError(e.message));
  }, []);
  if (!r) return <div className="p-10 text-center text-gray-500">{error || <Loader2 className="animate-spin inline" />}</div>;

  const Row = ({ id, s }: { id: string; s: any }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-black">{s.label}</p>
        <span className="font-mono text-xs text-gray-500">{id}</span>
        {s.dev_only && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">chỉ dev{s.active_in_this_env === false ? ' — đang tắt' : ''}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {(['business_data', 'photos', 'reviews', 'redistribute'] as const).map(k => (
          <span key={k} className={`text-xs px-2 py-0.5 rounded border font-semibold ${RIGHTS_STYLE[s[k]] || ''}`}>
            {{ business_data: 'Thông tin quán', photos: 'Ảnh', reviews: 'Đánh giá', redistribute: 'Phân phối lại' }[k]}: {RIGHTS_LABEL[s[k]] || s[k]}
          </span>
        ))}
      </div>
      <dl className="mt-2 text-xs text-gray-600 space-y-0.5">
        {s.basis && <div><dt className="inline font-semibold">Căn cứ: </dt><dd className="inline">{s.basis}</dd></div>}
        <div><dt className="inline font-semibold">Xác minh: </dt><dd className="inline">{s.verified_by || 'chưa ai xác minh'}{s.verified_at ? ` (${s.verified_at})` : ''}</dd></div>
        {s.retention_days ? <div><dt className="inline font-semibold">Thời hạn lưu ảnh/đánh giá: </dt><dd className="inline">{s.retention_days} ngày</dd></div> : null}
        {s.attribution && <div><dt className="inline font-semibold">Ghi nguồn: </dt><dd className="inline">{s.attribution}</dd></div>}
        {s.notes && <div className="text-amber-800">{s.notes}</div>}
      </dl>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Nguồn & quyền dữ liệu</h1>
        <p className="text-sm text-gray-500 mt-1">
          Đọc từ <code className="font-mono text-xs bg-gray-100 px-1 rounded">{r.file}</code>. Chỉ pháp chế/chủ sản phẩm được đổi sang “Được phép”, kèm người xác minh, ngày và căn cứ.
          Worker không lưu gì từ nguồn chưa có quyền lưu thông tin quán; ảnh/đánh giá chưa có quyền không được tính vào ngưỡng và không hiển thị.
        </p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex gap-3">
        <ShieldAlert className="shrink-0" size={20} />
        <p>
          Connector GPM trực tiếp đang <strong>khóa</strong>: chưa có tài liệu API của GPM và chưa có website nguồn nào được xác minh quyền.
          Thu thập từ Google Maps bị cấm theo Google Maps Platform ToS §3.2.3(a). Có thể dùng GPM Automate để xuất tệp theo định dạng
          <code className="font-mono mx-1">mobler-locality-import/v1</code> vào <code className="font-mono">LOCALITY_IMPORT_DIR</code>, với <code className="font-mono">origin</code> là nguồn đã được cấp quyền.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-black">Nguồn (adapter)</h2>
        {r.sources.map((s: any) => <Row key={s.id} id={s.id} s={s} />)}
      </section>
      <section className="space-y-3">
        <h2 className="font-black">Xuất xứ dữ liệu trong tệp nhập (origin)</h2>
        {r.origins.map((s: any) => <Row key={s.id} id={s.id} s={s} />)}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
        <h2 className="font-black">Hết hạn & xóa dữ liệu</h2>
        <p className="text-sm text-gray-600">Chạy tự động mỗi 6 giờ: xóa ảnh/đánh giá hết thời hạn lưu, xóa bản ghi khi nguồn bị thu hồi quyền, gỡ địa điểm không còn đạt chuẩn và xếp hàng làm mới địa điểm đã quá hạn.</p>
        <button onClick={() => adminApi.retention().then(setRetention).catch(e => setError(e.message))} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold">Chạy ngay</button>
        {retention && (
          <p className="text-sm">Đã xóa {retention.photos_deleted} ảnh, {retention.reviews_deleted} đánh giá; xóa {retention.places_purged} địa điểm; gỡ {retention.places_unpublished}; xếp hàng làm mới {retention.refresh_queued}. ({fmtTime(new Date().toISOString())})</p>
        )}
      </section>
    </div>
  );
}
