import { useState, FormEvent, ReactNode } from 'react';
import { AlertCircle, CalendarCheck, Loader2, LogIn, Radio, Store, UserPlus, Bell, MapPin } from 'lucide-react';
import { useShopAuth } from '../context/ShopAuthContext';
import { PHONE_REGEX, normalizePhone } from '@shared/booking';

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
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="lg:w-[42%] bg-gradient-to-br from-red-700 via-red-800 to-rose-950 text-white px-6 py-8 lg:p-12 flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-white text-red-700 flex items-center justify-center font-black">M</div>
          <div>
            <p className="font-black text-lg leading-tight">Mobler Shop</p>
            <p className="text-xs text-red-100">Ứng dụng dành cho cửa hàng</p>
          </div>
        </div>
        <div className="hidden lg:block space-y-6 my-10">
          <h1 className="text-3xl font-black leading-tight">Nhận đặt bàn trực tuyến,<br />cập nhật theo thời gian thực.</h1>
          <ul className="space-y-4 text-sm text-red-50">
            <li className="flex gap-3"><Bell size={18} className="shrink-0 mt-0.5" /> Báo ngay khi khách gửi yêu cầu đặt bàn</li>
            <li className="flex gap-3"><CalendarCheck size={18} className="shrink-0 mt-0.5" /> Xác nhận, từ chối, check-in khách chỉ với một chạm</li>
            <li className="flex gap-3"><Radio size={18} className="shrink-0 mt-0.5" /> Sơ đồ bàn đồng bộ trực tiếp với ứng dụng khách hàng</li>
          </ul>
        </div>
        <p className="hidden lg:block text-xs text-red-200">Khách hàng đặt bàn qua ứng dụng Mobler. Tài khoản cửa hàng tách riêng với tài khoản khách hàng.</p>
      </aside>

      {/* Form */}
      <main className="flex-1 flex items-start lg:items-center justify-center px-4 py-8 lg:p-12">
        <div className="w-full max-w-lg">
          <div className="flex p-1 mb-6 rounded-xl bg-gray-200/70 text-sm font-bold">
            {([['login', 'Đăng nhập', <LogIn key="i" size={15} />], ['register', 'Đăng ký cửa hàng', <UserPlus key="i" size={15} />]] as const).map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); setError(null); }}
                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition ${tab === id ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={onLogin} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Đăng nhập cửa hàng</h2>
                <p className="text-sm text-gray-500 mt-1">Dùng tài khoản cửa hàng, không phải tài khoản khách hàng.</p>
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
              <p className="text-center text-sm text-gray-500">
                Quán chưa có tài khoản?{' '}
                <button type="button" onClick={() => { setTab('register'); setError(null); }} className="font-bold text-red-700 underline">Đăng ký cửa hàng</button>
              </p>
            </form>
          ) : (
            <form onSubmit={onRegister} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
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
    </div>
  );
}
