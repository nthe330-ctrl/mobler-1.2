import { useState, useEffect, useRef, FormEvent, ReactNode } from 'react';
import { AlertCircle, CalendarCheck, Loader2, LogIn, Radio, Store, UserPlus, Bell, MapPin, CupSoda, Sparkles } from 'lucide-react';
import { useShopAuth } from '../context/ShopAuthContext';
import { PHONE_REGEX, normalizePhone } from '@shared/booking';
import AuthBackdropVideo from '@shared/components/AuthBackdropVideo';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15 transition';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-gray-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}


export default function ShopAuthScreen() {
  const { login, register } = useShopAuth();
  const sceneRef = useRef<HTMLDivElement>(null);

  /* Pointer parallax: one passive listener, coalesced into a single rAF, writing two
     custom properties the objects read via --d. No per-frame loop, nothing running when
     the pointer is still. Skipped on touch and when reduced motion is requested. */
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, mx = 0, my = 0;
    const apply = () => { raf = 0; el.style.setProperty('--mx', `${mx}px`); el.style.setProperty('--my', `${my}px`); };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * -26;
      my = ((e.clientY - r.top) / r.height - 0.5) * -18;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => { el.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // login
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // register
  const [form, setForm] = useState({
    shopName: '',
    address: '',
    shopPhone: '',
    openingHours: '07:00 - 22:00',
    description: '',
    ownerName: '',
    phone: '',
    email: '',
    password: '',
    confirm: ''
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return setError('Thiết bị không hỗ trợ định vị');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: Number(pos.coords.latitude.toFixed(6)), lng: Number(pos.coords.longitude.toFixed(6)) });
        setLocating(false);
      },
      () => {
        setError('Không lấy được vị trí. Bạn có thể bổ sung sau trong Hồ sơ quán.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setBusy(false);
    }
  };

  const onLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError('Vui lòng nhập số điện thoại/email và mật khẩu');
    run(() => login(identifier.trim(), password));
  };

  const onRegister = (e: FormEvent) => {
    e.preventDefault();
    if (!form.shopName.trim() || !form.address.trim()) return setError('Vui lòng nhập tên và địa chỉ quán');
    if (!form.ownerName.trim()) return setError('Vui lòng nhập tên chủ quán');
    if (!PHONE_REGEX.test(normalizePhone(form.phone))) return setError('Số điện thoại đăng nhập không hợp lệ');
    if (!form.email.trim()) return setError('Vui lòng nhập email');
    if (form.password.length < 6) return setError('Mật khẩu cần ít nhất 6 ký tự');
    if (form.password !== form.confirm) return setError('Mật khẩu nhập lại không khớp');
    run(() =>
      register({
        owner_name: form.ownerName.trim(),
        phone: normalizePhone(form.phone),
        email: form.email.trim(),
        password: form.password,
        shop: {
          name: form.shopName.trim(),
          address: form.address.trim(),
          phone: form.shopPhone.trim() || undefined,
          openingHours: form.openingHours.trim() || undefined,
          description: form.description.trim() || undefined,
          ...(coords || {})
        }
      })
    );
  };

  return (
    /* overflow-x-clip, not overflow-hidden. The scene still has to clip the drifting backdrop
       and the cut-outs sideways, but `hidden` clips VERTICALLY too without creating a scroll
       container — so the register form, which is taller than the viewport, was cut off and its
       submit button could not be reached at any screen size. `clip` on one axis leaves the
       other visible, so the page scrolls normally. */
    <div ref={sceneRef} className="shop-auth-scene relative isolate min-h-[100dvh] overflow-x-clip text-white">
      <div className="shop-auth-backdrop" aria-hidden="true" />
      {/* Same moving background as the customer login, and the same component: it picks
          the portrait or the landscape cut from the viewport's shape. */}
      <AuthBackdropVideo className="shop-auth-video" />
      <div className="shop-auth-shade" aria-hidden="true" />
      {/*
        The drifting boba cut-outs used to live here, over the flat illustration.
        They are gone now that the background is footage: flat kawaii stickers on a
        photographic scene read as two different products stacked on one screen, and
        the clip already has a subject of its own. The CSS and the artwork stay in
        place, so putting them back is this block plus the list of cut-out indices.
      */}

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-9 sm:py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/50 bg-white/80 text-red-700 shadow-lg backdrop-blur-xl"><CupSoda size={23} /></div>
          <div><p className="font-black leading-tight tracking-tight">Mobler Shop</p><p className="text-xs text-white/75">Ứng dụng dành cho cửa hàng</p></div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs text-white/85 shadow-lg backdrop-blur-xl sm:flex"><Sparkles size={14} /> Không gian quản lý cửa hàng</div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100dvh-190px)] items-center justify-center px-4 pb-32 pt-3 sm:px-8 sm:pb-36">
        <div className="w-full max-w-[440px]">
          <div className="mb-5 text-center drop-shadow-lg">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.24em] text-white/85">Chào mừng đến với Mobler</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Quán bạn, luôn trong tầm tay</h1>
            <p className="mt-2 text-sm text-white/85">Nhận đặt bàn và quản lý quán theo thời gian thực.</p>
          </div>
          <div className="mb-3 flex rounded-2xl border border-white/35 bg-white/15 p-1.5 text-sm font-bold shadow-xl backdrop-blur-2xl">
            {([['login', 'Đăng nhập', <LogIn key="i" size={15} />], ['register', 'Đăng ký cửa hàng', <UserPlus key="i" size={15} />]] as const).map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); setError(null); }}
                className={`flex-1 rounded-xl py-3 flex items-center justify-center gap-2 transition ${tab === id ? 'bg-white/90 text-red-700 shadow-md backdrop-blur-xl' : 'text-white/90 hover:bg-white/10'}`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-white/90 px-3 py-2.5 text-sm text-rose-700 shadow-lg backdrop-blur-xl">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={onLogin} className="shop-glass-card rounded-[28px] border border-white/75 p-6 shadow-2xl shadow-rose-950/25 backdrop-blur-2xl sm:p-7 space-y-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Đăng nhập cửa hàng</h2>
                <p className="text-sm text-gray-600 mt-1">Dùng tài khoản cửa hàng, không phải tài khoản khách hàng.</p>
              </div>
              <Field label="Số điện thoại hoặc email">
                <input className={inputCls} autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="0912 345 678" />
              </Field>
              <Field label="Mật khẩu">
                <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
              </Field>
              <button disabled={busy} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />} Đăng nhập
              </button>
                <p className="text-center text-sm text-gray-600">
                Quán chưa có tài khoản?{' '}
                <button type="button" onClick={() => { setTab('register'); setError(null); }} className="font-bold text-red-700 underline">Đăng ký cửa hàng</button>
              </p>
            </form>
          ) : (
            // No max-height / internal scroll here. Capping the card at 65dvh clipped it in
            // the middle of a field, and the 6px translucent scrollbar is invisible against
            // the light card, so it read as a broken form rather than a scrollable one. The
            // page scrolls instead, and main's bottom padding keeps the submit button clear
            // of the floating dock.
            <form onSubmit={onRegister} className="shop-glass-card rounded-[28px] border border-white/75 p-6 shadow-2xl shadow-rose-950/25 backdrop-blur-2xl sm:p-7 space-y-5">
              <div>
                <h2 className="text-xl font-black text-gray-900">Đăng ký cửa hàng</h2>
                <p className="text-sm text-gray-500 mt-1">Sau khi đăng ký, quán xuất hiện ngay trên ứng dụng khách hàng và nhận đặt bàn trực tuyến.</p>
              </div>

              <fieldset className="space-y-3">
                <legend className="flex items-center gap-2 text-sm font-black text-gray-900 mb-1"><Store size={16} className="text-red-600" /> Thông tin quán</legend>
                <Field label="Tên quán *"><input className={inputCls} value={form.shopName} onChange={set('shopName')} placeholder="VD: Mây Coffee" /></Field>
                <Field label="Địa chỉ *"><input className={inputCls} value={form.address} onChange={set('address')} placeholder="Số nhà, đường, phường, quận, thành phố" /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="SĐT của quán"><input className={inputCls} value={form.shopPhone} onChange={set('shopPhone')} placeholder="028 ..." /></Field>
                  <Field label="Giờ mở cửa"><input className={inputCls} value={form.openingHours} onChange={set('openingHours')} /></Field>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={useCurrentLocation} className="px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    {locating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} className="text-red-600" />} Dùng vị trí hiện tại làm vị trí quán
                  </button>
                  <span className="text-[11px] text-gray-500">{coords ? `Đã lấy: ${coords.lat}, ${coords.lng}` : 'Giúp khách tìm thấy quán theo khu vực'}</span>
                </div>
                <Field label="Giới thiệu ngắn"><textarea className={`${inputCls} min-h-[72px]`} value={form.description} onChange={set('description')} placeholder="Không gian, món đặc trưng..." /></Field>
              </fieldset>

              <fieldset className="space-y-3 pt-4 border-t border-gray-100">
                <legend className="text-sm font-black text-gray-900 mb-1">Tài khoản chủ quán</legend>
                <Field label="Họ tên chủ quán *"><input className={inputCls} autoComplete="name" value={form.ownerName} onChange={set('ownerName')} /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="SĐT đăng nhập *"><input className={inputCls} type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="0912 345 678" /></Field>
                  <Field label="Email *"><input className={inputCls} type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Mật khẩu *" hint="Ít nhất 6 ký tự"><input className={inputCls} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
                  <Field label="Nhập lại mật khẩu *"><input className={inputCls} type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></Field>
                </div>
              </fieldset>

              <button disabled={busy} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Tạo tài khoản cửa hàng
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Centred with inset + margin:auto, NOT with -translate-x-1/2: Tailwind v4 compiles
          translate-* to the `translate` property while shop-dock-float animates `transform`.
          Both apply, so a -50% utility plus a translate(-50%) keyframe shifts the bar a full
          -100% of its own width and hangs it off the left edge. Keep the float on translateY
          only and let margin do the centring — it also survives prefers-reduced-motion, which
          switches the animation off.
          Each cell is flex-1 min-w-0 with a truncating label, so a longer string can shrink
          instead of pushing a sibling out of the bar. */}
      <nav aria-label="Tính năng Mobler Shop" className="shop-floating-dock fixed inset-x-3 bottom-4 z-20 mx-auto flex w-auto max-w-[720px] items-center justify-between gap-1 rounded-[20px] border border-white/40 bg-white/20 px-2 py-2 shadow-2xl shadow-rose-950/25 backdrop-blur-2xl sm:inset-x-5 sm:bottom-7 sm:gap-2 sm:rounded-[24px] sm:px-6 sm:py-3.5">
        {([[Bell, 'Báo đặt bàn tức thì', 'Thông báo'], [CalendarCheck, 'Quản lý lịch đặt', 'Lịch đặt'], [Radio, 'Đồng bộ trực tiếp', 'Đồng bộ']] as const).map(([Icon, long, short], i) => (
          <div key={long} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2.5">
            {i > 0 && <span className="mr-1 hidden h-8 w-px shrink-0 bg-white/30 sm:mr-2 sm:block" />}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/30 sm:h-9 sm:w-9 sm:rounded-xl"><Icon size={16} /></span>
            <span className="hidden min-w-0 truncate text-xs font-semibold sm:block">{long}</span>
            <span className="min-w-0 truncate text-[10px] font-semibold sm:hidden">{short}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
