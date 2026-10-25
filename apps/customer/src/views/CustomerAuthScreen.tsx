import { useState, useEffect, useRef, FormEvent, ReactNode } from 'react';
import {
  AlertCircle, Coffee, Eye, EyeOff, Loader2, Lock, LogIn, Mail, MapPin,
  Moon, Phone, Sun, Ticket, User, UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { PHONE_REGEX, normalizePhone } from '@shared/booking';
import AuthBackdropVideo from '@shared/components/AuthBackdropVideo';

/**
 * Customer sign-in gate.
 *
 * Shown by App in place of the whole app until a customer account is signed in.
 * AuthModal still exists and is unchanged — it stays the in-app prompt for flows
 * that re-ask for credentials — so the two must keep agreeing. Every validation
 * rule, translation key and context call below is taken from AuthModal rather
 * than rewritten, so a customer sees the same message whichever one asks.
 *
 * Shop owners sign in through the separate Mobler Shop app.
 */


/**
 * Defined at module scope on purpose — do NOT move this inside the component.
 *
 * A component declared in the render body gets a brand-new function identity on
 * every render. React compares element types by identity, so it treats each render
 * as a DIFFERENT component: it unmounts the old subtree and mounts a fresh one.
 * The <input> inside is destroyed and recreated on every keystroke, which drops
 * focus — the field then accepts exactly one character per click.
 *
 * (AuthModal declares its Field inside the component but invokes it as a plain
 * call, `{Field({...})}`, which inlines the elements and creates no component
 * boundary — that is why it never had this bug.)
 */
function Field({ label, icon, isLight, children }: {
  label: string; icon: ReactNode; isLight: boolean; children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-bold ${isLight ? 'text-slate-700' : 'text-[#A48F7A]'}`}>{label}</span>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-[#7A6450]'}`}>{icon}</span>
        {children}
      </div>
    </label>
  );
}

export default function CustomerAuthScreen() {
  const { loginWithPassword, registerAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === 'light';

  const sceneRef = useRef<HTMLDivElement>(null);

  /* Pointer parallax: one passive listener coalesced into a single rAF, writing two
     custom properties the pieces read through --d. Nothing runs while the pointer is
     still. Skipped on touch devices and when reduced motion is requested. */
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, mx = 0, my = 0;
    const apply = () => { raf = 0; el.style.setProperty('--mx', `${mx}px`); el.style.setProperty('--my', `${my}px`); };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * -24;
      my = ((e.clientY - r.top) / r.height - 0.5) * -16;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => { el.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err: any) {
      setError(err?.message || t('common.genericError', 'Có lỗi xảy ra, vui lòng thử lại'));
    } finally {
      setBusy(false);
    }
  };

  // Validation is copied from AuthModal deliberately — same rules, same messages.
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return setError(t('auth.errNeedIdPassword', 'Vui lòng nhập số điện thoại/email và mật khẩu'));
    run(() => loginWithPassword(identifier.trim(), password));
  };

  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return setError(t('auth.errNeedName', 'Vui lòng nhập họ tên'));
    if (!PHONE_REGEX.test(normalizePhone(phone))) return setError(t('auth.errBadPhone', 'Số điện thoại không hợp lệ (VD: 0901234567)'));
    if (password.length < 6) return setError(t('auth.errShortPassword', 'Mật khẩu cần ít nhất 6 ký tự'));
    if (password !== confirmPassword) return setError(t('auth.errPasswordMismatch', 'Mật khẩu nhập lại không khớp'));
    run(() => registerAccount({ name: fullName.trim(), phone: normalizePhone(phone), email: email.trim() || undefined, password }));
  };

  const inputCls = `w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm transition focus:outline-none focus:ring-2 ${
    isLight
      ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#800020] focus:ring-[#800020]/15'
      : 'border-[#3E3023] bg-[#15110F] text-[#EBE3DB] placeholder:text-[#6B5848] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'
  }`;
  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(v => !v)}
      className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-[#7A6450]'}`}
      aria-label={showPassword ? t('auth.hidePassword', 'Ẩn mật khẩu') : t('auth.showPassword', 'Hiện mật khẩu')}
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  const submitCls = `flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition disabled:opacity-60 ${
    isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] hover:brightness-110'
            : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] hover:brightness-110'
  }`;

  const features: [ReactNode, string][] = [
    [<Coffee key="i" size={16} />, t('nav.explore', 'Khám phá quán')],
    [<Ticket key="i" size={16} />, t('nav.promotions', 'Ưu đãi')],
    [<MapPin key="i" size={16} />, t('nav.nearby', 'Quán gần bạn')],
  ];

  return (
    /* overflow-x-clip, not overflow-hidden: the register form is taller than the
       viewport, and `hidden` would clip it vertically without creating a scroll
       container, leaving the submit button unreachable. Clipping one axis leaves
       the other free to scroll. */
    <div ref={sceneRef} className={`cauth-scene relative isolate min-h-[100dvh] overflow-x-clip ${isLight ? 'text-white' : 'text-[#EBE3DB]'}`}>
      <div className="cauth-backdrop" aria-hidden="true" />
      {/* Picks the portrait or the landscape cut from the viewport's shape; see the
          component for why the choice is made in JS rather than with <source media>. */}
      <AuthBackdropVideo className="cauth-video" />
      <div className="cauth-shade" aria-hidden="true" />
      {/*
        The drifting boba cut-outs used to live here, over the flat tiled pattern.
        They are gone now that the background is footage: flat kawaii stickers on a
        photographic scene read as two different products stacked on one screen, and
        the clip already has a subject of its own. The CSS and the artwork stay in
        place, so putting them back is this block plus the list of cut-out indices.
      */}

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-9 sm:py-7">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-lg backdrop-blur-xl ${
            isLight ? 'border-white/50 bg-white/85 text-[#800020]' : 'border-[#D4AF37]/25 bg-[#1C1613]/80 text-[#D4AF37]'
          }`}>
            <Coffee size={23} />
          </div>
          <div>
            <p className="font-black leading-tight tracking-tight">Mobler</p>
            <p className="text-xs opacity-75">{t('auth.subtitle', 'Dành cho khách hàng đặt bàn')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isLight ? t('settings.darkMode', 'Chế độ tối') : t('settings.lightMode', 'Chế độ sáng')}
          className="cauth-chip grid h-10 w-10 place-items-center rounded-full shadow-lg backdrop-blur-xl transition hover:brightness-110"
        >
          {isLight ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </header>

      {/* pb-32/36 is what keeps the submit button clear of the floating bar once the
          taller register form has been scrolled to the bottom. Measured: ~85px of
          clearance at 390px and at 1440px. Reducing it puts the button under the bar. */}
      <main className="relative z-10 flex min-h-[calc(100dvh-190px)] items-center justify-center px-4 pb-32 pt-2 sm:px-8 sm:pb-36 lg:justify-start lg:pl-[8%] xl:pl-[11%]">
        <div className="w-full max-w-[420px]">
          <div className="mb-5 text-center drop-shadow-lg lg:text-left">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.24em] opacity-85">
              {t('auth.title', 'Tài khoản Mobler')}
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {t('auth.heroTitle', 'Quán ngon, bàn sẵn sàng')}
            </h1>
            <p className="mt-2 text-sm opacity-85">
              {t('auth.heroSubtitle', 'Đăng nhập để đặt bàn và theo dõi lịch hẹn của bạn.')}
            </p>
          </div>

          <div className="cauth-chip mb-3 flex rounded-2xl p-1.5 text-sm font-bold shadow-xl backdrop-blur-2xl">
            {([
              ['login', t('auth.signIn', 'Đăng nhập'), <LogIn key="i" size={15} />],
              ['register', t('auth.createAccount', 'Tạo tài khoản'), <UserPlus key="i" size={15} />],
            ] as const).map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); setError(null); }}
                /* flex-1 min-w-0 with a truncating label: a longer translation shrinks
                   its own cell instead of pushing the other tab out of the strip. */
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl py-3 transition ${
                  tab === id
                    ? isLight ? 'bg-white/90 text-[#800020] shadow-md backdrop-blur-xl'
                              : 'bg-[#251E18] text-[#D4AF37] shadow-md'
                    : 'opacity-85 hover:bg-white/10'
                }`}
              >
                <span className="shrink-0">{icon}</span>
                <span className="min-w-0 truncate">{label}</span>
              </button>
            ))}
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-white/92 px-3 py-2.5 text-sm text-rose-700 shadow-lg backdrop-blur-xl">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="cauth-card space-y-4 rounded-[26px] p-6 shadow-2xl backdrop-blur-2xl sm:p-7">
              <div>
                <h2 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-[#EBE3DB]'}`}>
                  {t('auth.signIn', 'Đăng nhập')}
                </h2>
                <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
                  {t('auth.customerOnlyHint', 'Tài khoản khách hàng. Chủ quán dùng ứng dụng Mobler Shop.')}
                </p>
              </div>
              <Field label={t('auth.identifierPlaceholder', 'Số điện thoại hoặc email')} icon={<Phone size={16} />} isLight={isLight}>
                <input type="text" autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="0908 123 789" className={inputCls} />
              </Field>
              <Field label={t('auth.passwordPlaceholder', 'Mật khẩu')} icon={<Lock size={16} />} isLight={isLight}>
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className={inputCls} />
                {passwordToggle}
              </Field>
              <button type="submit" disabled={busy} className={submitCls}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                <span>{t('auth.signIn', 'Đăng nhập')}</span>
              </button>
              <p className={`text-center text-sm ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
                {t('auth.noAccountYet', 'Chưa có tài khoản?')}{' '}
                <button type="button" onClick={() => { setTab('register'); setError(null); }} className={`font-bold underline ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                  {t('auth.createCustomerAccount', 'Tạo tài khoản khách hàng')}
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="cauth-card space-y-4 rounded-[26px] p-6 shadow-2xl backdrop-blur-2xl sm:p-7">
              <div>
                <h2 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-[#EBE3DB]'}`}>
                  {t('auth.createAccount', 'Tạo tài khoản')}
                </h2>
                <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
                  {t('auth.registerHint', 'Chỉ mất một phút để bắt đầu đặt bàn.')}
                </p>
              </div>
              <Field label={t('auth.fullNamePlaceholder', 'Họ và tên *')} icon={<User size={16} />} isLight={isLight}>
                <input type="text" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('auth.namePlaceholder', 'Nguyễn Văn A')} className={inputCls} />
              </Field>
              <Field label={t('auth.phonePlaceholder', 'Số điện thoại *')} icon={<Phone size={16} />} isLight={isLight}>
                <input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901 234 567" className={inputCls} />
              </Field>
              <Field label={t('auth.emailPlaceholder', 'Email (không bắt buộc)')} icon={<Mail size={16} />} isLight={isLight}>
                <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ban@email.com" className={inputCls} />
              </Field>
              <Field label={t('auth.passwordPlaceholder', 'Mật khẩu')} icon={<Lock size={16} />} isLight={isLight}>
                <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className={inputCls} />
                {passwordToggle}
              </Field>
              <Field label={t('auth.confirmPasswordPlaceholder', 'Nhập lại mật khẩu')} icon={<Lock size={16} />} isLight={isLight}>
                <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••" className={inputCls} />
              </Field>
              <button type="submit" disabled={busy} className={submitCls}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                <span>{t('auth.createAccount', 'Tạo tài khoản')}</span>
              </button>
              <p className={`text-center text-sm ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
                {t('auth.haveAccount', 'Đã có tài khoản?')}{' '}
                <button type="button" onClick={() => { setTab('login'); setError(null); }} className={`font-bold underline ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                  {t('auth.signIn', 'Đăng nhập')}
                </button>
              </p>
            </form>
          )}
        </div>
      </main>

      {/* Centred with inset + margin:auto rather than -translate-x-1/2, so no keyframe
          or utility can ever double-shift it off the edge. */}
      <nav aria-label={t('auth.featuresLabel', 'Tính năng Mobler')} className="cauth-chip fixed inset-x-3 bottom-4 z-20 mx-auto flex w-auto max-w-[560px] items-center justify-between gap-1 rounded-[20px] px-2 py-2 shadow-2xl backdrop-blur-2xl sm:inset-x-5 sm:bottom-6 sm:gap-2 sm:rounded-[24px] sm:px-5 sm:py-3">
        {features.map(([icon, label], i) => (
          <div key={i} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2.5">
            {i > 0 && <span className="mr-1 hidden h-8 w-px shrink-0 bg-white/25 sm:mr-2 sm:block" />}
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${isLight ? 'bg-white/30' : 'bg-[#D4AF37]/15 text-[#D4AF37]'}`}>
              {icon}
            </span>
            <span className="min-w-0 truncate text-[10px] font-semibold sm:text-xs">{label}</span>
          </div>
        ))}
      </nav>

    </div>
  );
}
