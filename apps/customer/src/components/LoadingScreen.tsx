import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Coffee, Sparkles } from 'lucide-react';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';

interface LoadingScreenProps {
  message?: string;
  isOverlay?: boolean;
}

export default function LoadingScreen({ message, isOverlay = false }: LoadingScreenProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === 'light';

  const defaultSteps = [
    t('loading.step1', 'Đang khởi tạo hệ thống bản đồ & vị trí...'),
    t('loading.step2', 'Đang tải danh sách quán cà phê & tiện ích...'),
    t('loading.step3', 'Đang đối chứng AI dữ liệu & hoàn tất...'),
  ];

  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % defaultSteps.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [defaultSteps.length]);

  return (
    <motion.div
      id="app-loading-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className={`${
        isOverlay ? 'absolute inset-0 z-50' : 'fixed inset-0 z-[9999]'
      } flex flex-col items-center justify-center p-6 select-none transition-colors duration-300 ${
        isLight
          ? 'bg-[#FAFBFD] text-slate-800'
          : 'bg-[#0A0807] text-[#EBE3DB]'
      }`}
    >
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div
          className={`w-96 h-96 rounded-full blur-3xl opacity-30 animate-pulse ${
            isLight ? 'bg-amber-300/40' : 'bg-[#D4AF37]/15'
          }`}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
        {/* Animated Coffee Cup & Steam */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Outer Pulsing Ring */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute w-24 h-24 rounded-full border-2 ${
              isLight ? 'border-[#800020]/30' : 'border-[#D4AF37]/40'
            }`}
          />

          {/* Steam Waves Animation */}
          <div className="absolute -top-7 flex gap-1.5 justify-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{
                  y: [-2, -14, -2],
                  opacity: [0.2, 0.9, 0],
                  scaleX: [1, 1.4, 1],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: i * 0.35,
                  ease: 'easeInOut',
                }}
                className={`w-1 h-3.5 rounded-full ${
                  isLight ? 'bg-amber-600/70' : 'bg-[#D4AF37]/80'
                }`}
              />
            ))}
          </div>

          {/* Central Coffee Icon Badge */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border relative ${
              isLight
                ? 'bg-gradient-to-br from-[#800020] to-[#5a0016] text-white border-red-900/40 shadow-red-950/20'
                : 'bg-gradient-to-br from-[#241A14] to-[#120D09] text-[#D4AF37] border-[#4A3B2C] shadow-black/60'
            }`}
          >
            <Coffee size={30} className="stroke-[2.2]" />
            <Sparkles
              size={12}
              className={`absolute top-1.5 right-1.5 animate-spin ${
                isLight ? 'text-amber-300' : 'text-[#D4AF37]'
              }`}
              style={{ animationDuration: '4s' }}
            />
          </motion.div>
        </div>

        {/* Brand Name */}
        <motion.h1
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`text-xl font-bold tracking-tight mb-1 ${
            isLight ? 'text-[#800020]' : 'text-[#EBE3DB]'
          }`}
        >
          Mobler Coffee
        </motion.h1>

        {/* Tagline / Subtitle */}
        <motion.p
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className={`text-xs mb-6 font-medium ${
            isLight ? 'text-slate-500' : 'text-[#A48F7A]'
          }`}
        >
          {t('app.subtitle', 'Khám phá không gian cà phê lý tưởng')}
        </motion.p>

        {/* Animated Progress Shimmer Bar */}
        <div
          className={`w-48 h-1.5 rounded-full overflow-hidden mb-4 relative ${
            isLight ? 'bg-slate-200' : 'bg-white/10'
          }`}
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`w-full h-full rounded-full ${
              isLight
                ? 'bg-gradient-to-r from-transparent via-[#800020] to-transparent'
                : 'bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent'
            }`}
          />
        </div>

        {/* Dynamic Status Text */}
        <motion.div
          key={message || stepIndex}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.2 }}
          className={`text-xs font-medium px-4 py-1 rounded-full ${
            isLight
              ? 'text-slate-600 bg-slate-100/80'
              : 'text-[#C9B9A6] bg-white/5'
          }`}
        >
          {message || defaultSteps[stepIndex]}
        </motion.div>
      </div>
    </motion.div>
  );
}
