import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { STATUS_LABEL, adminApi, fmtTime } from '../api';

const ACTION_LABEL: Record<string, string> = {
  approve: 'Duyệt & xuất bản',
  reject: 'Từ chối',
  edit: 'Sửa',
  unpublish: 'Gỡ xuất bản',
  retention_expire: 'Hết hạn lưu',
  reevaluate: 'Đánh giá lại'
};

export default function AuditView() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    adminApi.moderation(page).then(setData).catch(() => {});
  }, [page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Nhật ký kiểm duyệt</h1>
        <p className="text-sm text-gray-500 mt-1">Ai đã duyệt, lúc nào và thay đổi gì.</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        {!data ? <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div> : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr><th className="px-4 py-2">Thời điểm</th><th>Người thực hiện</th><th>Thao tác</th><th>Địa điểm</th><th>Trạng thái</th><th>Ghi chú / thay đổi</th></tr>
            </thead>
            <tbody>
              {data.items.map((m: any) => (
                <tr key={m.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2 text-xs whitespace-nowrap">{fmtTime(m.at)}</td>
                  <td className="py-2 font-semibold">{m.admin_name}</td>
                  <td className="py-2">{ACTION_LABEL[m.action] || m.action}</td>
                  <td className="py-2 font-mono text-xs">{m.place_id}</td>
                  <td className="py-2 text-xs">{m.status_before ? STATUS_LABEL[m.status_before as keyof typeof STATUS_LABEL] : '—'} → {m.status_after ? STATUS_LABEL[m.status_after as keyof typeof STATUS_LABEL] : '—'}</td>
                  <td className="py-2 pr-4 text-xs text-gray-600 max-w-sm break-words">
                    {m.note && <p>“{m.note}”</p>}
                    {m.changes && Object.entries(m.changes).map(([k, v]: any) => <p key={k}><strong>{k}</strong>: {JSON.stringify(v.from)} → {JSON.stringify(v.to)}</p>)}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chưa có thao tác nào.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border bg-white disabled:opacity-40" aria-label="Trang trước"><ChevronLeft size={16} /></button>
          <span>Trang {page}/{pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border bg-white disabled:opacity-40" aria-label="Trang sau"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
