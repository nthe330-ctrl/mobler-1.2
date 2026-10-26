import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import type { RankTier } from '@shared/ranks';

/**
 * The reward moment, built as a passport stamp rather than a trophy-and-confetti box.
 *
 * Mobler's ranks are already an exploration ladder — 👣 Bước Chân Khai Phá through
 * 👑 Kẻ Chinh Phục Bản Đồ — and the profile screen calls the collection a passport. So
 * the celebration is the stamp landing on the page: the badge drops in over-sized,
 * settles with a small rotation, and the ring snaps around it. That press is the one
 * bold moment; everything around it stays quiet.
 *
 * The accent is never invented — it is `tier.color` of the thing just unlocked, so a
 * forest-green explorer rank and a gold conqueror rank feel like different events.
 */

export interface CelebrationPayload {
  /** 'rank' when a tier was crossed, 'mission' for an achievement. */
  kind: 'rank' | 'mission';
  title: string;
  subtitle?: string;
  icon: string;
  /** Hex accent, taken from the unlocked tier/mission. */
  color: string;
  /** Points gained by the action that triggered this. */
  pointsEarned: number;
  /** The guest's new total, for context under the stamp. */
  points: number;
}

/** A short burst of paper, tinted to the accent. Decoration only — aria-hidden. */
function Confetti({ color, reduced }: { color: string; reduced: boolean }) {
  if (reduced) return null;
  // Fixed, hand-picked spread: a random scatter on every render reads as noise and
  // makes the moment un-reproducible in tests.
  const bits = [
    { x: -118, r: -42, d: 0.00 }, { x: -74, r: 18, d: 0.05 }, { x: -38, r: -12, d: 0.02 },
    { x: -8, r: 36, d: 0.08 }, { x: 26, r: -28, d: 0.03 }, { x: 62, r: 14, d: 0.06 },
    { x: 104, r: -34, d: 0.01 }, { x: 134, r: 44, d: 0.07 }
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-0">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: -10, x: b.x * 0.3, rotate: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-10, 70, 150], x: b.x, rotate: b.r * 4 }}
          transition={{ duration: 1.5, delay: 0.25 + b.d, ease: 'easeOut' }}
          className="absolute left-1/2 top-0 block h-2.5 w-1.5 rounded-[1px]"
          style={{ background: i % 3 === 0 ? color : i % 3 === 1 ? '#D4AF37' : '#FFFFFF', opacity: 0.9 }}
        />
      ))}
    </div>
  );
}

export default function CelebrationModal({
  payload,
  onClose
}: {
  payload: CelebrationPayload | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLight = theme === 'light';
  const reduced = !!useReducedMotion();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /* Keyboard contract: Escape closes, focus starts on the primary action, and Tab is
     kept inside the dialog while it is open — the brief asks for keyboard navigation,
     and a celebration that traps you is worse than no celebration. */
  useEffect(() => {
    if (!payload) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const nodes = cardRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [payload, onClose]);

  const p = payload;
  const accent = p?.color || '#800020';

  return (
    <AnimatePresence>
      {p && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-hidden="true" />

          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-title"
            onClick={e => e.stopPropagation()}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={`relative w-full max-w-[380px] overflow-hidden rounded-[26px] border shadow-2xl ${
              isLight
                ? 'border-white/80 bg-white text-slate-900'
                : 'border-[#4A3B2C] bg-[#161210] text-[#EBE3DB]'
            }`}
          >
            {/* A single hairline of the tier's own colour across the top — the only
                chrome on the card, and it carries information (which tier). */}
            <div className="h-1 w-full" style={{ background: accent }} aria-hidden="true" />

            <button
              onClick={onClose}
              aria-label={t('common.close', 'Đóng')}
              className={`absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-full transition focus:outline-none focus-visible:ring-2 ${
                isLight ? 'text-slate-400 hover:bg-slate-100 focus-visible:ring-[#800020]'
                        : 'text-[#7A6450] hover:bg-white/10 focus-visible:ring-[#D4AF37]'
              }`}
            >
              <X size={18} />
            </button>

            <div className="relative px-6 pb-6 pt-7 text-center">
              <Confetti color={accent} reduced={reduced} />

              {/* The stamp. Oversized on entry, then pressed down into place. */}
              <motion.div
                initial={reduced ? { opacity: 0 } : { scale: 2.1, opacity: 0, rotate: -18 }}
                animate={{ scale: 1, opacity: 1, rotate: -6 }}
                transition={reduced ? { duration: 0.2 } : { delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
                className="mx-auto grid h-24 w-24 place-items-center rounded-full border-[3px]"
                style={{ borderColor: accent, background: isLight ? `${accent}14` : `${accent}24` }}
              >
                <span className="text-[44px] leading-none" aria-hidden="true">{p.icon}</span>
              </motion.div>

              <p className="mt-5 text-[13px] font-semibold" style={{ color: accent }}>
                {p.kind === 'rank'
                  ? t('celebrate.rankKicker', 'Bạn vừa lên bậc mới')
                  : t('celebrate.missionKicker', 'Bạn vừa mở khoá nhiệm vụ')}
              </p>

              <h2 id="celebration-title" className="mt-1 text-[26px] font-black leading-tight tracking-tight">
                {p.title}
              </h2>

              {p.subtitle && (
                <p className={`mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
                  {p.subtitle}
                </p>
              )}

              {p.pointsEarned > 0 && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className={`mx-auto mt-5 inline-flex items-baseline gap-1.5 rounded-full px-4 py-2 ${
                    isLight ? 'bg-slate-100' : 'bg-white/5'
                  }`}
                >
                  <span className="text-lg font-black" style={{ color: accent }}>
                    +{p.pointsEarned.toLocaleString('vi-VN')}
                  </span>
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-[#A48F7A]'}`}>
                    {t('profile.points', 'điểm')} · {t('celebrate.total', 'tổng {n}').replace('{n}', p.points.toLocaleString('vi-VN'))}
                  </span>
                </motion.div>
              )}

              <button
                ref={primaryRef}
                onClick={onClose}
                className="mt-6 w-full rounded-xl py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ background: accent, ...( { '--tw-ring-color': accent } as React.CSSProperties) }}
              >
                {t('celebrate.continue', 'Tiếp tục')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
