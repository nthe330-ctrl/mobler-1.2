import { useEffect, useState, FormEvent, ReactNode } from 'react';
import { AlertCircle, ClipboardCheck, Gauge, History, Inbox, Loader2, LogOut, Menu, Scale, ShieldCheck, X } from 'lucide-react';
import { adminApi, http } from './api';
import OverviewView from './views/OverviewView';
import PlacesView from './views/PlacesView';
import RequestsView from './views/RequestsView';
import SourcesView from './views/SourcesView';
import AuditView from './views/AuditView';

type View = 'overview' | 'places' | 'requests' | 'sources' | 'audit';

const NAV: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Tổng quan & chi phí', icon: <Gauge size={18} /> },
  { id: 'places', label: 'Duyệt địa điểm', icon: <ClipboardCheck size={18} /> },
  { id: 'requests', label: 'Yêu cầu bổ sung & worker', icon: <Inbox size={18} /> },
  { id: 'sources', label: 'Nguồn & quyền dữ liệu', icon: <Scale size={18} /> },
  { id: 'audit', label: 'Nhật ký kiểm duyệt', icon: <History size={18} /> }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState<View>('places');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<number>(0);

  useEffect(() => {
    http.setUnauthorizedHandler(() => setUser(null));
    if (!http.getToken()) {
      setChecking(false);
      return;
    }
    adminApi
      .me()
      .then(r => (r.user?.roles?.includes('admin') ? setUser(r.user) : http.setToken(null)))
      .catch(() => http.setToken(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = () => adminApi.overview().then(o => setPending(o.places?.pending_review || 0)).catch(() => {});
    load();
    const id = window.setInterval(load, 15000);
    return () => window.clearInterval(id);
  }, [user, view]);

  if (checking) {
    return <div className="min-h-[100dvh] flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2" size={18} /> Đang tải…</div>;
  }
  if (!user) return <Login onDone={setUser} />;

  const logout = () => {
    http.setToken(null);
    setUser(null);
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 text-gray-900 flex">
      {menuOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 flex items-center gap-2.5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center"><ShieldCheck size={18} /></div>
          <div className="flex-1">
            <p className="font-black text-white leading-tight">Mobler Admin</p>
            <p className="text-[11px] text-slate-400">Kho dữ liệu địa điểm</p>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setMenuOpen(false)} aria-label="Đóng menu"><X size={20} /></button>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => { setView(n.id); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${view === n.id ? 'bg-white text-slate-900' : 'hover:bg-white/10'}`}
            >
              {n.icon}
              <span className="flex-1 text-left">{n.label}</span>
              {n.id === 'places' && pending > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">{pending}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-white/10" title="Đăng xuất" aria-label="Đăng xuất"><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMenuOpen(true)} aria-label="Mở menu"><Menu size={22} /></button>
          <p className="font-bold">{NAV.find(n => n.id === view)?.label}</p>
        </header>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {view === 'overview' && <OverviewView />}
          {view === 'places' && <PlacesView onChanged={() => adminApi.overview().then(o => setPending(o.places?.pending_review || 0)).catch(() => {})} />}
          {view === 'requests' && <RequestsView />}
          {view === 'sources' && <SourcesView />}
          {view === 'audit' && <AuditView />}
        </div>
      </main>
    </div>
  );
}

function Login({ onDone }: { onDone: (u: any) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await adminApi.login(identifier.trim(), password);
      onDone(r.user);
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  };
  const input = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center"><ShieldCheck size={20} /></div>
          <div>
            <h1 className="font-black text-lg">Mobler Admin</h1>
            <p className="text-xs text-gray-500">Chỉ tài khoản có quyền quản trị</p>
          </div>
        </div>
        {error && <div role="alert" className="flex gap-2 text-sm rounded-xl px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
        <label className="block"><span className="block text-xs font-bold text-gray-700 mb-1.5">Số điện thoại hoặc email</span><input className={input} autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} /></label>
        <label className="block"><span className="block text-xs font-bold text-gray-700 mb-1.5">Mật khẩu</span><input className={input} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button disabled={busy} className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
          {busy && <Loader2 size={16} className="animate-spin" />} Đăng nhập
        </button>
      </form>
    </div>
  );
}
