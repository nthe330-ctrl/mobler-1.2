import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, useLanguage, type Language } from '@shared/context/LanguageContext';

/**
 * The dashboard's language switch.
 *
 * It changes the language in React state, which re-renders every label — no page reload,
 * so nothing in progress is lost. The choice is written to this app's own storage key,
 * which is what keeps a staff member's preference out of the customer-facing app that
 * shares the same origin in production.
 *
 * `compact` renders the globe alone for the sidebar footer; the full form shows the
 * current language's name and is used inside Regional Preferences.
 */
export default function ShopLanguagePicker({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, currentLanguageOption, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // A menu that stays open after a click elsewhere, or after Escape, reads as stuck.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('shop.regional.language')}
        className={
          compact
            ? 'p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50'
            : 'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm hover:border-red-600'
        }
      >
        <span className="flex items-center gap-2 min-w-0">
          <Globe size={compact ? 18 : 16} className="shrink-0" />
          {!compact && (
            <span className="truncate font-bold text-gray-800">
              {currentLanguageOption.flag} {currentLanguageOption.name}
            </span>
          )}
        </span>
        {!compact && <span className="text-[11px] font-mono text-gray-400">{language}</span>}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('shop.regional.language')}
          className={`absolute z-50 ${compact ? 'right-0 bottom-full mb-2 w-52' : 'left-0 right-0 mt-1'} rounded-xl border border-gray-200 bg-white py-1 shadow-xl`}
        >
          {SUPPORTED_LANGUAGES.map(opt => (
            <li key={opt.code}>
              <button
                type="button"
                role="option"
                aria-selected={opt.code === language}
                onClick={() => choose(opt.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  opt.code === language ? 'font-bold text-red-700' : 'text-gray-700'
                }`}
              >
                <span aria-hidden="true">{opt.flag}</span>
                {/* Each language is listed in its OWN script, not in English. Somebody
                    opens this menu precisely because the interface is in a language they
                    cannot read, so "Thai" is the one label a Thai reader may not recognise
                    — ไทย they always will. `name` stays for aria/debug use. */}
                <span className="flex-1 truncate">{opt.nativeName}</span>
                {opt.code === language && <Check size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
