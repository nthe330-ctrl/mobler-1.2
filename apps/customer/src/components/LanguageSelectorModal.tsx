import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Check, X, Sparkles } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, Language } from '@shared/context/LanguageContext';
import { useTheme } from '@shared/context/ThemeContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function LanguageSelectorModal({ isOpen, onClose }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden ${
          isLight 
            ? 'bg-[#FAFBFD] border-red-700/40 text-[#1E1B18]' 
            : 'bg-[#161210] border-[#D4AF37] text-[#EBE3DB]'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight 
            ? 'bg-gradient-to-r from-[#800020] via-[#6B0D1B] to-[#4A0E17] text-white border-red-800' 
            : 'bg-[#1A1510] border-[#4A3B2C] text-[#EBE3DB]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isLight ? 'bg-white/20 border-red-300' : 'bg-[#251E18] border-[#D4AF37]'}`}>
              <Globe size={18} className={isLight ? 'text-white' : 'text-[#D4AF37]'} />
            </div>
            <div>
              <h3 className="text-base font-bold">{t('home.selectLanguage', 'Select Language')}</h3>
              <p className={`text-[10px] ${isLight ? 'text-red-100' : 'text-[#A48F7A]'}`}>
                {t('home.selectLanguageDesc', 'Traditional Chinese, Thai, English & Vietnamese')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full border transition-colors ${
              isLight 
                ? 'bg-white/20 hover:bg-white/30 border-red-300/40 text-white' 
                : 'bg-[#251E18] hover:bg-[#302720] border-[#4A3B2C] text-[#A48F7A]'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Options List */}
        <div className="p-4 space-y-2.5">
          {SUPPORTED_LANGUAGES.map((langOpt) => {
            const isSelected = language === langOpt.code;

            return (
              <button
                key={langOpt.code}
                onClick={() => handleSelect(langOpt.code)}
                className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between text-left ${
                  isSelected
                    ? isLight
                      ? 'border-2 border-[#800020] bg-red-50/70 text-[#800020] shadow-sm font-bold ring-2 ring-red-500/20'
                      : 'border-2 border-[#D4AF37] bg-[#251E18] text-[#D4AF37] shadow-sm font-bold ring-2 ring-[#D4AF37]/20'
                    : isLight
                      ? 'border-slate-200 bg-white hover:border-red-300 text-slate-700 hover:bg-slate-50'
                      : 'border-[#3E3023] bg-[#1A1510] hover:border-[#D4AF37]/50 text-[#A48F7A] hover:bg-[#201A16]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label={langOpt.name}>
                    {langOpt.flag}
                  </span>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span>{langOpt.nativeName}</span>
                      {isSelected && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          isLight ? 'bg-red-200 text-red-900' : 'bg-[#3E3023] text-[#D4AF37]'
                        }`}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] font-medium ${
                      isSelected 
                        ? isLight ? 'text-red-700' : 'text-[#D4AF37]/80' 
                        : isLight ? 'text-slate-500' : 'text-stone-400'
                    }`}>
                      {langOpt.name}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  {isSelected ? (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isLight ? 'bg-[#800020] text-white' : 'bg-[#D4AF37] text-black'
                    }`}>
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border ${
                      isLight ? 'border-slate-300' : 'border-[#4A3B2C]'
                    }`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className={`px-4 pb-4 pt-1 text-center text-[10px] ${
          isLight ? 'text-slate-500' : 'text-[#7A6450]'
        }`}>
          <span>Instant switch • 繁體中文 • ภาษาไทย • English • Tiếng Việt</span>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Control Button Component to place anywhere in headers or bars
 */
export function LanguageControlButton({ 
  variant = 'badge',
  className = '',
  onDark = false
}: { 
  variant?: 'badge' | 'pills' | 'icon-only'; 
  className?: string;
  onDark?: boolean;
}) {
  const { language, setLanguage, currentLanguageOption, openLanguageModal } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-1 p-1 rounded-xl border backdrop-blur-md ${
        isLight ? 'bg-white/90 border-red-300/60 shadow-sm' : 'bg-[#1A1510]/90 border-[#4A3B2C]'
      } ${className}`}>
        {SUPPORTED_LANGUAGES.map(opt => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              onClick={() => setLanguage(opt.code)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                isActive
                  ? isLight
                    ? 'bg-[#800020] text-white shadow-sm scale-105'
                    : 'bg-[#D4AF37] text-black shadow-sm scale-105'
                  : isLight
                    ? 'text-slate-600 hover:text-red-900 hover:bg-red-50'
                    : 'text-[#A48F7A] hover:text-[#D4AF37] hover:bg-[#251E18]'
              }`}
              title={`${opt.nativeName} (${opt.name})`}
            >
              <span className="text-xs">{opt.flag}</span>
              <span>{opt.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // If onDark is true (e.g. Home header with dark wine gradient), we use white text.
  // Otherwise in light mode we use crisp red-on-light styling so it's clearly readable on white headers.
  const lightBadgeClass = onDark
    ? 'bg-white/20 hover:bg-white/30 text-white border-white/40 shadow-sm'
    : 'bg-red-50 hover:bg-red-100 text-[#800020] border-red-200 shadow-xs';
  const lightGlobeClass = onDark ? 'text-white' : 'text-[#800020]';

  return (
    <button
      onClick={openLanguageModal}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm ${
        isLight
          ? lightBadgeClass
          : 'bg-[#1A1510] hover:bg-[#251E18] text-[#D4AF37] border-[#4A3B2C]'
      } ${className}`}
      title="Change language / 選擇語言 / เปลี่ยนภาษา / Đổi ngôn ngữ"
    >
      <Globe size={13} className={isLight ? lightGlobeClass : 'text-[#D4AF37]'} />
      <span className="text-sm leading-none">{currentLanguageOption.flag}</span>
      <span className="text-[11px] font-extrabold tracking-tight">{currentLanguageOption.shortLabel}</span>
    </button>
  );
}
