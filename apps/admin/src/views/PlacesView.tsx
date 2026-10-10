import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, ImageOff, Loader2, MapPin, Save, Search, Star, Trash2, X, XCircle } from 'lucide-react';
import { RIGHTS_LABEL, RIGHTS_STYLE, STATUS_LABEL, STATUS_STYLE, adminApi, fmtTime } from '../api';

const TABS = ['pending_review', 'disqualified', 'published', 'unpublished', 'rejected'] as const;

export default function PlacesView({ onChanged }: { onChanged: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending_review');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reasonLabels, setReasonLabels] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, ov] = await Promise.all([adminApi.places(tab, q, page), adminApi.overview()]);
      setData(list);
      setCounts(ov.places || {});
      setReasonLabels(ov.reason_labels || {});
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    }
  }, [tab, q, page]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setSelected(new Set());
    setPage(1);
  }, [tab]);

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const bulk = async (action: 'approve' | 'reject') => {
    let note: string | undefined;
    if (action === 'reject') {
      const v = window.prompt('Lý do từ chối (bắt buộc):');
      if (!v) return;
      note = v;
    }
    setBusy(true);
    try {
      const r = await adminApi.bulk([...selected], action, note);
      setMsg({ tone: r.failed ? 'err' : 'ok', text: `${action === 'approve' ? 'Đã duyệt' : 'Đã từ chối'} ${r.ok} địa điểm${r.failed ? `, ${r.failed} không thực hiện được` : ''}.` });
      setSelected(new Set());
      await load();
      onChanged();
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const items: any[] = data?.items || [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Duyệt địa điểm</h1>
        <p className="text-sm text-gray-500 mt-1">Chỉ quán cà phê có đủ ảnh và đánh giá được phép sử dụng mới vào hàng chờ duyệt. Dữ liệu chỉ đến với người dùng sau khi bạn duyệt.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${tab === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}>
            {STATUS_LABEL[t]} <span className="ml-1 opacity-70 tabular-nums">{counts[t] || 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Tìm tên, địa chỉ, mã ô…" className="flex-1 text-sm focus:outline-none" />
        </label>
        {tab === 'pending_review' && selected.size > 0 && (
          <>
            <button disabled={busy} onClick={() => bulk('approve')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"><Check size={15} /> Duyệt {selected.size} mục</button>
            <button disabled={busy} onClick={() => bulk('reject')} className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"><X size={15} /> Từ chối</button>
          </>
        )}
      </div>

      {msg && (
        <div role="status" className={`rounded-xl px-4 py-2.5 text-sm border flex items-center justify-between ${msg.tone === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} aria-label="Đóng"><X size={15} /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-500">Không có địa điểm nào ở mục “{STATUS_LABEL[tab]}”.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tab === 'pending_review' && (
              <li className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 flex items-center gap-3">
                <input type="checkbox" className="accent-slate-900" checked={selected.size === items.length} onChange={e => setSelected(e.target.checked ? new Set(items.map(i => i.id)) : new Set())} aria-label="Chọn tất cả" />
                Chọn tất cả trang này
              </li>
            )}
            {items.map(p => (
              <li key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                {tab === 'pending_review' && <input type="checkbox" className="accent-slate-900" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Chọn ${p.name}`} />}
                <button onClick={() => setOpenId(p.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.cover ? <img src={p.cover} alt="" className="w-full h-full object-cover" /> : <ImageOff size={18} className="text-gray-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{p.name || <em className="text-gray-400">Không tên</em>}</p>
                    <p className="text-xs text-gray-500 truncate">{p.address || '—'} · {p.cell_id}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Gate ok={p.quality.is_cafe} label={p.quality.category_verified ? `Cà phê: ${p.quality.category_verified}` : 'Danh mục'} />
                      <Gate ok={p.quality.usable_photos >= p.quality.thresholds.photos} label={`Ảnh ${p.quality.usable_photos}/${p.quality.thresholds.photos}`} />
                      <Gate ok={p.quality.usable_reviews >= p.quality.thresholds.reviews} label={`Đánh giá ${p.quality.usable_reviews}/${p.quality.thresholds.reviews}`} />
                      {p.quality.rights_warnings.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200">Cảnh báo quyền</span>}
                    </div>
                  </div>
                  <div className="hidden md:block text-right text-xs text-gray-500 shrink-0">
                    <p>{p.sources.join(', ')}</p>
                    <p>{fmtTime(p.updated_at)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border bg-white disabled:opacity-40" aria-label="Trang trước"><ChevronLeft size={16} /></button>
          <span>Trang {page}/{pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border bg-white disabled:opacity-40" aria-label="Trang sau"><ChevronRight size={16} /></button>
        </div>
      )}

      {openId && (
        <PlaceDrawer
          id={openId}
          reasonLabels={reasonLabels}
          onClose={() => setOpenId(null)}
          onChanged={async (text) => {
            setMsg({ tone: 'ok', text });
            await load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {label}
    </span>
  );
}

function PlaceDrawer({ id, reasonLabels, onClose, onChanged }: { id: string; reasonLabels: Record<string, string>; onClose: () => void; onChanged: (msg: string) => void }) {
  const [p, setP] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [removePhotos, setRemovePhotos] = useState<Set<string>>(new Set());
  const [removeReviews, setRemoveReviews] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (place: any) => {
    setP(place);
    setForm({
      name: place.name,
      address: place.address,
      categories: place.categories.join(', '),
      phone: place.phone || '',
      website: place.website || '',
      opening_hours: place.opening_hours || ''
    });
    setRemovePhotos(new Set());
    setRemoveReviews(new Set());
  };

  useEffect(() => {
    adminApi.place(id).then(r => apply(r.place)).catch(e => setError(e.message));
  }, [id]);

  const run = async (fn: () => Promise<any>, okText: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      if (r?.place) apply(r.place);
      onChanged(okText);
    } catch (e: any) {
      const reasons = e?.data?.reasons as string[] | undefined;
      setError(`${e.message}${reasons?.length ? `: ${reasons.map(x => reasonLabels[x] || x).join('; ')}` : ''}`);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(
      () => adminApi.editPlace(id, {
        name: form.name,
        address: form.address,
        categories: String(form.categories).split(',').map((s: string) => s.trim()).filter(Boolean),
        phone: form.phone,
        website: form.website,
        opening_hours: form.opening_hours,
        remove_photo_ids: [...removePhotos],
        remove_review_ids: [...removeReviews]
      }),
      'Đã lưu chỉnh sửa và đánh giá lại tiêu chuẩn'
    );

  const input = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-slate-900';
  const q = p?.quality;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-black truncate">{p?.name || 'Đang tải…'}</p>
            {p && <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status as keyof typeof STATUS_LABEL]}</span>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Đóng"><X size={18} /></button>
        </div>

        {!p ? (
          <div className="p-10 text-center text-gray-500">{error || <Loader2 className="animate-spin inline" />}</div>
        ) : (
          <div className="p-5 space-y-6">
            {error && <div role="alert" className="rounded-xl px-3 py-2 text-sm bg-rose-50 border border-rose-200 text-rose-700">{error}</div>}

            {/* Quality gate */}
            <section className="rounded-2xl border border-gray-200 p-4">
              <h3 className="font-black text-sm mb-3">Tiêu chuẩn xuất bản</h3>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2"><Gate ok={q.is_cafe} label={q.is_cafe ? `Quán cà phê (${q.category_verified})` : 'Chưa xác nhận là quán cà phê'} /></li>
                <li className="flex items-center gap-2"><Gate ok={q.usable_photos >= q.thresholds.photos} label={`${q.usable_photos} ảnh hợp lệ / cần ${q.thresholds.photos}`} /></li>
                <li className="flex items-center gap-2"><Gate ok={q.usable_reviews >= q.thresholds.reviews} label={`${q.usable_reviews} đánh giá hợp lệ / cần ${q.thresholds.reviews}`} /></li>
              </ul>
              {q.reasons.length > 0 && (
                <p className="mt-3 text-xs text-rose-700"><strong>Lý do không đạt:</strong> {q.reasons.map((r: string) => reasonLabels[r] || r).join('; ')}</p>
              )}
              {q.rights_warnings.length > 0 && (
                <div className="mt-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
                  {q.rights_warnings.map((w: string) => <p key={w} className="flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{w}</p>)}
                </div>
              )}
              <p className="mt-2 text-[11px] text-gray-500">Đánh giá lúc {fmtTime(q.evaluated_at)}</p>
            </section>

            {/* Sources */}
            <section>
              <h3 className="font-black text-sm mb-2">Nguồn & quyền</h3>
              <div className="space-y-2">
                {p.source_rights.map((s: any) => (
                  <div key={s.source} className="rounded-xl border border-gray-200 p-3 text-xs">
                    <p className="font-bold">{s.source} <span className="font-normal text-gray-500">— {s.rights.label}</span></p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(['business_data', 'photos', 'reviews', 'redistribute'] as const).map(k => (
                        <span key={k} className={`px-1.5 py-0.5 rounded border font-semibold ${RIGHTS_STYLE[s.rights[k]]}`}>{k}: {RIGHTS_LABEL[s.rights[k]]}</span>
                      ))}
                    </div>
                    {s.rights.attribution && <p className="mt-1.5 text-gray-600">Ghi nguồn: {s.rights.attribution}</p>}
                  </div>
                ))}
                <p className="text-[11px] text-gray-500">Lấy về: {p.sources.map((s: any) => `${s.source} lúc ${fmtTime(s.fetched_at)}`).join(' · ')}</p>
              </div>
            </section>

            {/* Edit */}
            <section className="space-y-3">
              <h3 className="font-black text-sm">Thông tin cơ bản</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['name', 'Tên'], ['address', 'Địa chỉ'], ['categories', 'Danh mục (phân tách bằng dấu phẩy)'],
                  ['phone', 'Điện thoại'], ['website', 'Website'], ['opening_hours', 'Giờ mở cửa']
                ] as const).map(([k, label]) => (
                  <label key={k} className={k === 'address' || k === 'categories' ? 'sm:col-span-2' : ''}>
                    <span className="block text-xs font-bold text-gray-600 mb-1">{label}</span>
                    <input className={input} value={form[k] ?? ''} onChange={e => setForm((f: any) => ({ ...f, [k]: e.target.value }))} />
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {p.lat.toFixed(5)}, {p.lng.toFixed(5)} · ô {p.cell_id}</p>
            </section>

            {/* Photos */}
            <section>
              <h3 className="font-black text-sm mb-2">Ảnh ({p.photos.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {p.photos.map((ph: any) => {
                  const viewable = ph.rights_status === 'granted' && !ph.removed_by_admin;
                  const marked = removePhotos.has(ph.id);
                  return (
                    <div key={ph.id} className={`relative rounded-xl overflow-hidden border ${marked ? 'border-rose-500 ring-2 ring-rose-300' : 'border-gray-200'}`}>
                      {viewable ? (
                        <img src={ph.url} alt="" className={`w-full aspect-[4/3] object-cover ${marked ? 'opacity-40' : ''}`} />
                      ) : (
                        <div className="w-full aspect-[4/3] bg-gray-100 flex flex-col items-center justify-center text-[10px] text-gray-500 text-center p-2">
                          <ImageOff size={18} className="mb-1" />
                          {ph.removed_by_admin ? 'Đã gỡ' : 'Chưa có quyền — không hiển thị'}
                        </div>
                      )}
                      <div className="absolute top-1 left-1"><span className={`text-[9px] font-bold px-1 py-0.5 rounded border ${RIGHTS_STYLE[ph.rights_status]}`}>{RIGHTS_LABEL[ph.rights_status]}</span></div>
                      {viewable && (
                        <button onClick={() => setRemovePhotos(prev => { const n = new Set(prev); n.has(ph.id) ? n.delete(ph.id) : n.add(ph.id); return n; })} className="absolute top-1 right-1 p-1 rounded-md bg-white/90 text-rose-600" title="Gỡ ảnh" aria-label="Gỡ ảnh"><Trash2 size={13} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Reviews */}
            <section>
              <h3 className="font-black text-sm mb-2">Đánh giá ({p.reviews.length})</h3>
              <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {p.reviews.map((r: any) => {
                  const viewable = r.rights_status === 'granted' && !r.removed_by_admin;
                  const marked = removeReviews.has(r.id);
                  return (
                    <li key={r.id} className={`rounded-xl border p-2.5 text-xs flex gap-2 ${marked ? 'border-rose-400 bg-rose-50' : 'border-gray-200'}`}>
                      <div className="flex-1 min-w-0">
                        {viewable ? (
                          <>
                            <p className="font-semibold flex items-center gap-1">{r.author || 'Ẩn danh'} {typeof r.rating === 'number' && <span className="inline-flex items-center gap-0.5 text-amber-600"><Star size={11} fill="currentColor" />{r.rating}</span>} <span className="text-gray-400 font-normal">{r.date}</span></p>
                            <p className="text-gray-700 mt-0.5">{r.text}</p>
                          </>
                        ) : (
                          <p className="text-gray-500 italic">{r.removed_by_admin ? 'Đã gỡ' : 'Đánh giá chưa có quyền sử dụng — nội dung ẩn'}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">{r.source} · {RIGHTS_LABEL[r.rights_status]}</p>
                      </div>
                      {viewable && <button onClick={() => setRemoveReviews(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} className="text-rose-600 self-start" aria-label="Gỡ đánh giá"><Trash2 size={13} /></button>}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* History */}
            <section>
              <h3 className="font-black text-sm mb-2">Lịch sử kiểm duyệt</h3>
              {p.moderation.length === 0 ? <p className="text-xs text-gray-500">Chưa có thao tác nào.</p> : (
                <ul className="space-y-1.5 text-xs">
                  {p.moderation.map((m: any) => (
                    <li key={m.id} className="border-l-2 border-gray-300 pl-2.5">
                      <strong>{m.admin_name}</strong> · {m.action} · {fmtTime(m.at)}
                      {m.note && <span className="text-gray-600"> — “{m.note}”</span>}
                      {m.changes && <span className="block text-gray-500">{Object.entries(m.changes).map(([k, v]: any) => `${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`).join('; ')}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {p && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex flex-wrap gap-2">
            <button disabled={busy} onClick={save} className="px-3 py-2 rounded-xl border border-gray-300 text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"><Save size={15} /> Lưu chỉnh sửa</button>
            <div className="flex-1" />
            {p.status === 'published' ? (
              <button disabled={busy} onClick={() => { const n = window.prompt('Lý do gỡ:'); if (n) run(() => adminApi.unpublish(id, n), 'Đã gỡ địa điểm khỏi kho dùng chung'); }} className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 text-sm font-bold disabled:opacity-50">Gỡ xuất bản</button>
            ) : (
              <>
                {p.status !== 'rejected' && (
                  <button disabled={busy} onClick={() => { const n = window.prompt('Lý do từ chối (bắt buộc):'); if (n) run(() => adminApi.reject(id, n), 'Đã từ chối địa điểm'); }} className="px-3 py-2 rounded-xl border border-gray-300 text-sm font-bold disabled:opacity-50">Từ chối</button>
                )}
                <button
                  disabled={busy || !q.passed || removePhotos.size > 0 || removeReviews.size > 0}
                  title={!q.passed ? 'Chưa đạt tiêu chuẩn' : removePhotos.size || removeReviews.size ? 'Lưu chỉnh sửa trước' : ''}
                  onClick={() => run(() => adminApi.approve(id), 'Đã duyệt và xuất bản')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Check size={15} /> Duyệt & xuất bản
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
