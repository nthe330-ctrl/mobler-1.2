import { useState, useEffect, FormEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { X, Phone, Lock, Mail, User, Coffee, AlertCircle, LogIn, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { PHONE_REGEX, normalizePhone } from '@shared/booking';

/**
 * Customer account sign-in / sign-up.
 * Shop owners use the separate Mobler Shop app with their own shop account.
 */
export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, authModalReason, loginWithPassword, registerAccount } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === 'light';

  const [tab, setTab] = useState<'login' | 'register'>(authModalMode);
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthModalOpen) {
      setTab(authModalMode);
      setError(null);
      setPassword('');
      setConfirmPassword('');
    }
  }, [isAuthModalOpen, authModalMode]);

  if (!isAuthModalOpen) return null;

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

  const inputCls = `w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
    isLight ? 'bg-slate-50 border-slate-300 focus:border-[#800020] focus:bg-white' : 'bg-[#1C1613] border-[#3E3023] focus:border-[#D4AF37] text-[#EBE3DB]'
  }`;
  const labelCls = `block text-xs font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-[#A48F7A]'}`;
  const iconCls = `absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-[#7A6450]'}`;

  const Field = ({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <span className={iconCls}>{icon}</span>
        {children}
      </div>
    </div>
  );

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

  const submitCls = `w-full py-3 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
    isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] hover:brightness-110' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] hover:brightness-110'
  }`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl shadow-2xl border ${
          isLight ? 'bg-white text-slate-900 border-red-200' : 'bg-[#161210] text-[#EBE3DB] border-[#4A3B2C]'
        }`}
      >
        <div className={`p-5 border-b flex items-center justify-between ${
          isLight ? 'bg-gradient-to-r from-[#800020] via-[#6B0D1B] to-[#4A0E17] text-white' : 'bg-[#1C1613] border-[#3E3023]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLight ? 'bg-white/20' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
              <Coffee size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{t('auth.title', 'Tài khoản Mobler')}</h2>
              <p className="text-xs opacity-80">{t('auth.subtitle', 'Dành cho khách hàng đặt bàn')}</p>
            </div>
          </div>
          <button onClick={closeAuthModal} className="p-1.5 rounded-full hover:bg-white/20" aria-label={t('common.close', 'Đóng')}>
            <X size={20} />
          </button>
        </div>

        <div className={`flex p-1 m-4 mb-0 rounded-xl text-xs font-bold ${isLight ? 'bg-slate-100' : 'bg-[#100D0B]'}`}>
          {([
            ['login', t('auth.signIn', 'Đăng nhập'), <LogIn size={14} key="i" />],
            ['register', t('auth.createAccount', 'Tạo tài khoản'), <UserPlus size={14} key="i" />]
          ] as const).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                tab === id
                  ? isLight ? 'bg-white text-[#800020] shadow-sm' : 'bg-[#251E18] text-[#D4AF37]'
                  : isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {authModalReason && (
            <p className={`text-xs rounded-xl px-3 py-2 ${isLight ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-[#251E18] text-[#D4AF37] border border-[#3E3023]'}`}>
              {authModalReason}
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs rounded-xl px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200" role="alert">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {Field({
                label: 'Số điện thoại hoặc email',
                icon: <Phone size={16} />,
                children: (
                  <input type="text" autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="0908 123 789" className={inputCls} />
                )
              })}
              {Field({
                label: 'Mật khẩu',
                icon: <Lock size={16} />,
                children: (
                  <>
                    <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className={inputCls} />
                    {passwordToggle}
                  </>
                )
              })}
              <button type="submit" disabled={busy} className={submitCls}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                <span>{t('auth.signIn', 'Đăng nhập')}</span>
              </button>
              <p className={`text-center text-xs ${isLight ? 'text-slate-500' : 'text-[#7A6450]'}`}>
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => { setTab('register'); setError(null); }} className={`font-bold underline ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                  Tạo tài khoản khách hàng
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {Field({
                label: 'Họ và tên *',
                icon: <User size={16} />,
                children: <input type="text" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('auth.namePlaceholder', 'Nguyễn Văn A')} className={inputCls} />
              })}
              {Field({
                label: 'Số điện thoại *',
                icon: <Phone size={16} />,
                children: <input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901 234 567" className={inputCls} />
              })}
              {Field({
                label: 'Email (không bắt buộc)',
                icon: <Mail size={16} />,
                children: <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ban@email.com" className={inputCls} />
              })}
              {Field({
                label: 'Mật khẩu * (ít nhất 6 ký tự)',
                icon: <Lock size={16} />,
                children: (
                  <>
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                    {passwordToggle}
                  </>
                )
              })}
              {Field({
                label: 'Nhập lại mật khẩu *',
                icon: <Lock size={16} />,
                children: <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} />
              })}
              <button type="submit" disabled={busy} className={submitCls}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                <span>{t('auth.createAccount', 'Tạo tài khoản')}</span>
              </button>
              <p className={`text-center text-[11px] ${isLight ? 'text-slate-500' : 'text-[#7A6450]'}`}>
                Bạn là chủ quán? Hãy đăng ký trên ứng dụng <strong>Mobler Shop</strong> dành riêng cho cửa hàng.
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
