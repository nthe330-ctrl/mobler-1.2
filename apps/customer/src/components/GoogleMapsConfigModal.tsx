import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Key, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  Compass,
  Layers
} from 'lucide-react';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { api } from '../services/api';

interface GoogleMapsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  isBillingError: boolean;
  onSaveKey: (key: string) => void;
}

export default function GoogleMapsConfigModal({
  isOpen,
  onClose,
  currentKey,
  isBillingError,
  onSaveKey
}: GoogleMapsConfigModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isLight = theme === 'light';

  const [inputKey, setInputKey] = useState<string>(currentKey || '');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    valid?: boolean;
    billingEnabled?: boolean;
    reason?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    setInputKey(currentKey || '');
    setValidationResult(null);
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      onSaveKey('');
      setValidationResult({
        tested: true,
        valid: true,
        billingEnabled: false,
        message: language === 'vi' 
          ? 'Đã xóa key. Ứng dụng sẽ sử dụng Bản đồ Vector tương tác.' 
          : 'Key removed. App will use interactive vector fallback map.'
      });
      return;
    }

    setIsTesting(true);
    setValidationResult(null);

    try {
      const res = await api.validateMapsKey(trimmed);
      setIsTesting(false);
      setValidationResult({
        tested: true,
        valid: res.valid,
        billingEnabled: res.billingEnabled,
        reason: res.reason,
        message: res.message
      });

      if (res.valid && res.billingEnabled) {
        onSaveKey(trimmed);
      }
    } catch (err: any) {
      setIsTesting(false);
      setValidationResult({
        tested: true,
        valid: false,
        billingEnabled: false,
        reason: 'network_error',
        message: err.message || 'Lỗi kiểm tra kết nối API'
      });
    }
  };

  const handleUseVectorMap = () => {
    onSaveKey('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] ${
            isLight ? 'bg-white border-black/10 text-slate-900' : 'bg-[#181310] border-[#4A3B2C] text-[#EBE3DB]'
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-black/5' : 'bg-[#201813] border-[#3E3023]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-amber-900/40 border-amber-600/50 text-[#D4AF37]'
              }`}>
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  {language === 'vi' ? 'Cấu hình Google Maps Platform' : 'Google Maps Platform Setup'}
                </h3>
                <p className="text-[11px] opacity-70">
                  {language === 'vi' ? 'Khắc phục lỗi Billing & lựa chọn chế độ hiển thị bản đồ' : 'Fix Billing errors & choose map display mode'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Error Notification Banner if Billing Error Detected */}
            {isBillingError && (
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isLight 
                  ? 'bg-amber-50 border-amber-300 text-amber-950' 
                  : 'bg-amber-950/40 border-amber-600/60 text-amber-200'
              }`}>
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">
                    {language === 'vi' ? 'Phát hiện BillingNotEnabledMapError' : 'BillingNotEnabledMapError Detected'}
                  </p>
                  <p className="leading-relaxed text-[11px] opacity-90">
                    {language === 'vi' 
                      ? 'Dự án Google Cloud của API Key hiện tại chưa được kích hoạt thanh toán (Billing Account). Ứng dụng đã tự động chuyển sang Bản đồ Vector tương tác mượt mà để tránh gián đoạn trải nghiệm.' 
                      : 'The current Google Cloud project lacks an active billing account. The app has seamlessly transitioned to the interactive vector fallback map to maintain full usability.'}
                  </p>
                </div>
              </div>
            )}

            {/* Recommended Options */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                {language === 'vi' ? 'Các lựa chọn giải pháp:' : 'Available Solutions:'}
              </span>

              {/* Option 1: Maps Demo Key (Free, Zero Cost) */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                isLight ? 'bg-emerald-50/70 border-emerald-300' : 'bg-emerald-950/20 border-emerald-700/50'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      {language === 'vi' ? '1. Tạo Google Maps Demo Key (Miễn phí 100%)' : '1. Use Free Maps Demo Key'}
                    </h4>
                  </div>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    {language === 'vi' ? 'Khuyên dùng' : 'Recommended'}
                  </span>
                </div>
                <p className="text-[11px] mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                  {language === 'vi'
                    ? 'Không yêu cầu thẻ tín dụng hay thiết lập dự án Google Cloud. Chỉ cần đăng nhập bằng tài khoản Google để nhận key thử nghiệm ngay lập tức.'
                    : 'No credit card or complex Cloud setup required. Sign in with any Google account to mint a free demo prototyping key.'}
                </p>
                <div className="mt-2.5">
                  <a
                    href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <span>{language === 'vi' ? 'Mở trang cấp Maps Demo Key' : 'Open Maps Demo Key Portal'}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Option 2: Active Google Cloud Billing */}
              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#201813] border-[#3E3023]'
              }`}>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#800020] dark:text-[#D4AF37] shrink-0" />
                  <h4 className="text-xs font-bold">
                    {language === 'vi' ? '2. Bật thanh toán cho Google Cloud Project' : '2. Enable Billing on Google Cloud'}
                  </h4>
                </div>
                <p className="text-[11px] mt-1 opacity-75 leading-relaxed">
                  {language === 'vi'
                    ? 'Nếu bạn đã có Google Cloud Project, hãy truy cập Console để bật Billing và kích hoạt Maps JavaScript API.'
                    : 'If using an existing Google Cloud project, visit Cloud Console to attach a billing account and enable Maps JavaScript API.'}
                </p>
                <div className="mt-2">
                  <a
                    href="https://console.cloud.google.com/project/_/billing/enable?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#800020] dark:text-[#D4AF37] hover:underline"
                  >
                    <span>{language === 'vi' ? 'Google Cloud Billing Console' : 'Open Cloud Billing Console'}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Option 3: Use Interactive Vector Map */}
              <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#201813] border-[#3E3023]'
              }`}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Compass size={14} className="text-blue-500 shrink-0" />
                    <h4 className="text-xs font-bold">
                      {language === 'vi' ? '3. Dùng Bản đồ Vector Nội bộ' : '3. Built-in Vector Map'}
                    </h4>
                  </div>
                  <p className="text-[10px] opacity-75 mt-0.5">
                    {language === 'vi'
                      ? 'Hiển thị tọa độ quán cà phê Quận 1, phố đi bộ & sông Sài Gòn mà không cần API key.'
                      : 'Displays all coffee shops, river and street landmarks offline without requiring any key.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseVectorMap}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition-all ${
                    isLight 
                      ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800' 
                      : 'bg-[#2A211B] border-[#4A3B2C] hover:bg-[#342922] text-[#EBE3DB]'
                  }`}
                >
                  {language === 'vi' ? 'Dùng Vector Map' : 'Use Vector Map'}
                </button>
              </div>
            </div>

            {/* Input & Validation Field */}
            <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
              <label className="text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key size={13} className="text-[#800020] dark:text-[#D4AF37]" />
                  {language === 'vi' ? 'Nhập API Key mới hoặc Maps Demo Key:' : 'Enter new API Key or Demo Key:'}
                </span>
                {currentKey && (
                  <span className="text-[10px] font-mono opacity-60">
                    {currentKey.substring(0, 8)}••••••••
                  </span>
                )}
              </label>

              <div className="flex gap-2">
                <input 
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none focus:ring-1 transition-all ${
                    isLight 
                      ? 'bg-white border-slate-300 focus:ring-[#800020] focus:border-[#800020]' 
                      : 'bg-[#100C0A] border-[#3E3023] text-[#EBE3DB] focus:ring-[#D4AF37] focus:border-[#D4AF37]'
                  }`}
                />
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestAndSave}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    isLight 
                      ? 'bg-[#800020] text-white hover:bg-[#66001a]' 
                      : 'bg-[#D4AF37] text-black hover:bg-[#bda132]'
                  } disabled:opacity-50`}
                >
                  {isTesting && <RefreshCw size={13} className="animate-spin" />}
                  <span>{language === 'vi' ? 'Kiểm tra & Lưu' : 'Verify & Save'}</span>
                </button>
              </div>

              {/* Validation Feedback */}
              {validationResult && (
                <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                  validationResult.valid && validationResult.billingEnabled
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-600 dark:text-emerald-200'
                    : validationResult.reason === 'billing_not_enabled'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-200'
                      : 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/40 dark:border-rose-600 dark:text-rose-200'
                }`}>
                  {validationResult.valid && validationResult.billingEnabled ? (
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  )}
                  <div className="leading-snug">
                    <p className="font-semibold">{validationResult.message}</p>
                    {validationResult.reason === 'billing_not_enabled' && (
                      <p className="text-[11px] mt-1 opacity-85">
                        {language === 'vi'
                          ? 'Gợi ý: Dùng nút Tạo Google Maps Demo Key ở trên để lấy key có sẵn quyền truy cập miễn phí.'
                          : 'Tip: Use the free Maps Demo Key link above to get a key with active quota.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`p-4 border-t flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-black/5' : 'bg-[#201813] border-[#3E3023]'
          }`}>
            <button
              type="button"
              onClick={handleUseVectorMap}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${
                isLight 
                  ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700' 
                  : 'border-[#4A3B2C] bg-[#181310] hover:bg-[#251E18] text-[#A48F7A]'
              }`}
            >
              <Layers size={13} />
              <span>{language === 'vi' ? 'Dùng Vector Map' : 'Use Vector Map'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isLight 
                  ? 'bg-slate-900 text-white hover:bg-black' 
                  : 'bg-[#D4AF37] text-black hover:bg-[#b8952b]'
              }`}
            >
              {language === 'vi' ? 'Đóng' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
