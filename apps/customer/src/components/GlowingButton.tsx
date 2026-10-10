import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface GlowingButtonProps {
  key?: React.Key;
  children?: React.ReactNode;
  label?: React.ReactNode;
  loadingLabel?: React.ReactNode;
  successLabel?: React.ReactNode;
  status?: 'idle' | 'loading' | 'success';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  innerClassName?: string;
  showWrapper?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  gradientColor?: string;
}

export default function GlowingButton({
  children,
  label = 'Hover & Click Me',
  loadingLabel = 'Processing...',
  successLabel = 'Completed!',
  status: controlledStatus,
  onClick,
  disabled = false,
  className = '',
  innerClassName = '',
  showWrapper = false,
  type = 'button',
  title,
  gradientColor = 'bg-[conic-gradient(from_0deg,#000000_0%,#ffa500_50%,#000000_100%)]',
}: GlowingButtonProps) {
  const [internalStatus, setInternalStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  // Support controlled or internal status
  const currentStatus = controlledStatus ?? internalStatus;

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (currentStatus !== 'idle' || disabled) return;

    if (onClick) {
      try {
        setInternalStatus('loading');
        await onClick(e);
        setInternalStatus('success');
        setTimeout(() => {
          setInternalStatus('idle');
        }, 2000);
      } catch {
        setInternalStatus('idle');
      }
      return;
    }

    // Default simulation behavior (2.5s loading, 2s success reset)
    setInternalStatus('loading');
    setTimeout(() => {
      setInternalStatus('success');
      setTimeout(() => {
        setInternalStatus('idle');
      }, 2000);
    }, 2500);
  };

  const buttonElement = (
    <button
      type={type}
      title={title}
      onClick={handleClick}
      disabled={currentStatus === 'loading' || disabled}
      className={`relative group overflow-hidden rounded-2xl p-[2px] focus:outline-none focus:ring-2 focus:ring-[#FFA500] focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.99] text-left ${className}`}
    >
      {/* 1. Viền hiệu ứng Gradient xoay chạy dọc khung viền */}
      <span 
        className={`absolute inset-[-1000%] animate-[spin_3.5s_linear_infinite] transition-opacity duration-500 ${
          currentStatus === 'loading'
            ? 'opacity-100 bg-[conic-gradient(from_0deg,#06b6d4_0%,#3b82f6_50%,#06b6d4_100%)]'
            : currentStatus === 'success'
            ? 'opacity-100 bg-[conic-gradient(from_0deg,#10b981_0%,#34d399_50%,#10b981_100%)]'
            : `opacity-0 group-hover:opacity-100 ${gradientColor}`
        }`}
      />

      {/* 2. Nội dung bên trong Button */}
      {children ? (
        <span className={`relative block w-full h-full rounded-[14px] overflow-hidden ${innerClassName}`}>
          {children}
        </span>
      ) : (
        <span className={`relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-[10px] bg-slate-900 text-white font-medium text-sm transition-all duration-300 group-hover:bg-slate-900/90 ${innerClassName}`}>
          <AnimatePresence mode="wait">
            {currentStatus === 'idle' && (
              <motion.span
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2"
              >
                {label}
              </motion.span>
            )}

            {currentStatus === 'loading' && (
              <motion.span
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 text-cyan-400"
              >
                {/* Vòng xoay Loading */}
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {loadingLabel}
              </motion.span>
            )}

            {currentStatus === 'success' && (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 text-emerald-400"
              >
                {/* Icon Check hoàn thành */}
                <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {successLabel}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      )}
    </button>
  );

  if (showWrapper) {
    return (
      <div className="flex items-center justify-center min-h-[200px] bg-slate-950 p-4 rounded-2xl">
        {buttonElement}
      </div>
    );
  }

  return buttonElement;
}
