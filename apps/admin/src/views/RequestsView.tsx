import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Pause, Play, RefreshCw, StepForward } from 'lucide-react';
import { REQUEST_STATE_LABEL, STATUS_STYLE, adminApi, fmtTime } from '../api';

const STATES = ['', 'queued', 'running', 'awaiting_review', 'completed', 'failed', 'cancelled'];

export default function RequestsView() {
  const [state, setState] = useState('');
  const [data, setData] = useState<any>(null);
  const [worker, setWorker] = useState<any>(null);
  const [cell, setCell] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const [r, o] = await Promise.all([adminApi.requests(state), adminApi.overview()]);
      setData(r);
      setWorker(o.worker);
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  useEffect(() => {
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [state]);

  const act = async (fn: () => Promise<any>, text: string) => {
    try {
      await fn();
      setMsg(text);
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  const scan = (e: FormEvent) => {
    e.preventDefault();
    act(() => adminApi.scan(cell.trim()), `Đã xếp hàng quét ô ${cell}`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Yêu cầu bổ sung & worker</h1>
        <p className="text-sm text-gray-500 mt-1">Ứng dụng khách chỉ tạo yêu cầu; worker phía server xử lý theo hàng đợi, có giới hạn tần suất, retry và circuit breaker.</p>
      </div>

      {msg && <div role="status" className="rounded-xl px-4 py-2.5 text-sm bg-slate-100 border border-slate-200">{msg}</div>}

      {worker && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-black">Worker</h2>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${!worker.enabled ? 'bg-gray-200' : worker.paused ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {!worker.enabled ? 'Tắt' : worker.paused ? 'Tạm dừng' : 'Đang chạy'}
            </span>
            <span className="text-xs text-gray-500">Đang xử lý {worker.running}/{worker.concurrency} · nhịp {worker.interval_ms / 1000}s · lần cuối {fmtTime(worker.last_tick_at)}</span>
            <div className="flex-1" />
            {worker.paused ? (
              <button onClick={() => act(() => adminApi.worker('resume'), 'Đã chạy lại worker')} className="px-3 py-1.5 rounded-lg border text-sm font-bold flex items-center gap-1.5"><Play size={14} /> Chạy lại</button>
            ) : (
              <button onClick={() => act(() => adminApi.worker('pause'), 'Đã tạm dừng worker')} className="px-3 py-1.5 rounded-lg border text-sm font-bold flex items-center gap-1.5"><Pause size={14} /> Tạm dừng</button>
            )}
            <button onClick={() => act(() => adminApi.worker('run_once'), 'Đã chạy một lượt')} className="px-3 py-1.5 rounded-lg border text-sm font-bold flex items-center gap-1.5"><StepForward size={14} /> Chạy 1 lượt</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-xs text-gray-500"><th className="py-1.5">Nguồn</th><th>Trạng thái</th><th>Gọi hôm nay</th><th>Lỗi liên tiếp</th><th>Lỗi gần nhất</th></tr></thead>
              <tbody>
                {worker.adapters.map((a: any) => (
                  <tr key={a.id} className="border-t border-gray-100 align-top">
                    <td className="py-2 pr-2"><p className="font-semibold">{a.label}</p><p className="text-xs text-gray-500">{a.id}{a.configured ? '' : ' · không nằm trong LOCALITY_SOURCES'}</p></td>
                    <td className="py-2 pr-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${a.available && a.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{a.available && a.configured ? 'Sẵn sàng' : 'Không dùng'}</span>
                      {a.reason && <p className="text-xs text-gray-500 mt-1 max-w-xs">{a.reason}</p>}
                    </td>
                    <td className="py-2 tabular-nums">{a.calls_today}/{a.daily_limit}</td>
                    <td className="py-2 tabular-nums">{a.consecutive_failures}{a.circuit_open_until ? ' (mở)' : ''}</td>
                    <td className="py-2 text-xs text-gray-600 max-w-xs break-words">{a.last_error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form onSubmit={scan} className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <label className="text-sm font-semibold">Quét thủ công ô</label>
            <input value={cell} onChange={e => setCell(e.target.value)} placeholder="c1077_10670" className="px-3 py-1.5 rounded-lg border text-sm font-mono" />
            <button className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-bold">Xếp hàng quét</button>
            <span className="text-xs text-gray-500">Bỏ qua cooldown nhưng vẫn không tạo job trùng.</span>
          </form>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {STATES.map(s => (
          <button key={s} onClick={() => setState(s)} className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${state === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-gray-200'}`}>{s ? REQUEST_STATE_LABEL[s] : 'Tất cả'}</button>
        ))}
        <button onClick={load} className="p-2 rounded-xl border bg-white" aria-label="Tải lại"><RefreshCw size={15} /></button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        {!data ? <div className="p-8 text-center"><Loader2 className="animate-spin inline" /></div> : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr><th className="px-4 py-2">Ô / từ khóa</th><th>Trạng thái</th><th>Nguồn gọi</th><th>Người yêu cầu</th><th>Lần thử</th><th>Kết quả</th><th>Cập nhật</th><th></th></tr>
            </thead>
            <tbody>
              {data.items.map((r: any) => (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2"><p className="font-mono text-xs">{r.cell_id}</p><p className="text-xs text-gray-500">{r.keyword || 'quán cà phê'} · {r.trigger}</p></td>
                  <td className="py-2"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.state]}`}>{REQUEST_STATE_LABEL[r.state]}</span>{r.last_error && <p className="text-[11px] text-gray-500 mt-1 max-w-[220px] break-words">{r.last_error}</p>}</td>
                  <td className="py-2 text-xs">{r.sources_tried.join(', ') || '—'}</td>
                  <td className="py-2 tabular-nums">{r.unique_requesters} <span className="text-xs text-gray-400">({r.request_count} lượt)</span></td>
                  <td className="py-2 tabular-nums">{r.attempts}/{r.max_attempts}</td>
                  <td className="py-2 text-xs">{r.result ? `${r.result.candidates} ứng viên · ${r.result.passed} đạt · ${r.result.disqualified} không đạt` : '—'}</td>
                  <td className="py-2 text-xs text-gray-500">{fmtTime(r.updated_at)}</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">
                    {(r.state === 'failed' || r.state === 'cancelled') && <button onClick={() => act(() => adminApi.retry(r.id), 'Đã xếp hàng lại')} className="text-xs font-bold text-slate-900 underline">Chạy lại</button>}
                    {r.state === 'queued' && <button onClick={() => act(() => adminApi.cancel(r.id), 'Đã hủy yêu cầu')} className="text-xs font-bold text-rose-700 underline">Hủy</button>}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-500">Không có yêu cầu.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
