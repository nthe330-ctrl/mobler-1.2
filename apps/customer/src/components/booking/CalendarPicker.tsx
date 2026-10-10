import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';

interface CalendarPickerProps {
  selectedDate: string;
  onSelectDate: (dateStr: string, formattedLabel: string) => void;
  isLight: boolean;
}

export default function CalendarPicker({ selectedDate, onSelectDate, isLight }: CalendarPickerProps) {
  const { t, language } = useLanguage();

  // Use current date as reference (defaults to September 2026 or real current time)
  const [currentMonth, setCurrentMonth] = useState(() => {
    // If selectedDate has format YYYY-MM-DD, parse it
    if (/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const parts = selectedDate.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const formatDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDayName = (d: Date) => {
    const dayIndex = d.getDay();
    const days = [
      t('booking.calSunday', 'Chủ Nhật'),
      t('booking.calMonday', 'Thứ Hai'),
      t('booking.calTuesday', 'Thứ Ba'),
      t('booking.calWednesday', 'Thứ Tư'),
      t('booking.calThursday', 'Thứ Năm'),
      t('booking.calFriday', 'Thứ Sáu'),
      t('booking.calSaturday', 'Thứ Bảy')
    ];
    return days[dayIndex];
  };

  const formatDisplayLabel = (d: Date) => {
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    
    if (diffDays === 0) {
      return `${t('booking.todayLabel', 'Hôm nay')} (${dayStr}/${monthStr})`;
    } else if (diffDays === 1) {
      return `${t('booking.tomorrowLabel', 'Ngày mai')} (${dayStr}/${monthStr})`;
    } else {
      return `${getDayName(d)}, ${dayStr}/${monthStr}/${d.getFullYear()}`;
    }
  };

  // Resolve normalized key for comparison
  const normalizedSelectedKey = useMemo(() => {
    if (selectedDate === 'Today') {
      return formatDateKey(today);
    }
    if (selectedDate === 'Tomorrow') {
      const tom = new Date(today);
      tom.setDate(tom.getDate() + 1);
      return formatDateKey(tom);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return selectedDate;
    }
    return formatDateKey(today);
  }, [selectedDate, today]);

  // Generate days for the active month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month (0 = Sunday, 1 = Monday, ...)
    const firstDay = new Date(year, month, 1);
    // Convert to Monday = 0, ..., Sunday = 6
    let startingDay = firstDay.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    // Padding before 1st of month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    // Days of month
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const monthLabel = useMemo(() => {
    const localeMap: Record<string, string> = {
      'vi': 'vi-VN',
      'zh-TW': 'zh-TW',
      'th': 'th-TH',
      'en': 'en-US'
    };
    const locale = localeMap[language] || 'vi-VN';
    return currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [currentMonth, language]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDay = (date: Date) => {
    const key = formatDateKey(date);
    const label = formatDisplayLabel(date);
    onSelectDate(key, label);
  };

  // Quick action presets
  const selectToday = () => {
    handleSelectDay(today);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const selectTomorrow = () => {
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    handleSelectDay(tom);
    setCurrentMonth(new Date(tom.getFullYear(), tom.getMonth(), 1));
  };

  const selectThisWeekend = () => {
    const sat = new Date(today);
    const currentDay = today.getDay(); // 0 is Sunday, 6 is Saturday
    const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
    sat.setDate(today.getDate() + daysUntilSaturday);
    handleSelectDay(sat);
    setCurrentMonth(new Date(sat.getFullYear(), sat.getMonth(), 1));
  };

  const dayOfWeekHeaders = useMemo(() => {
    if (language === 'zh-TW') return ['一', '二', '三', '四', '五', '六', '日'];
    if (language === 'th') return ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    if (language === 'en') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  }, [language]);

  return (
    <div className={`rounded-2xl p-4 border transition-all ${
      isLight 
        ? 'bg-white border-red-200/80 shadow-[0_4px_16px_rgba(128,0,32,0.06)]' 
        : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
    }`}>
      {/* Header with Title and Month Controls */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isLight ? 'bg-red-50 text-[#800020]' : 'bg-[#2A2018] text-[#D4AF37]'
          }`}>
            <CalendarIcon size={16} />
          </div>
          <div>
            <h3 className={`font-bold text-xs ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
              {t('booking.calendarTitle', 'Lịch chọn ngày đến')}
            </h3>
            <span className={`text-[11px] font-semibold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
              {monthLabel}
            </span>
          </div>
        </div>

        {/* Month Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label={t('booking.prevMonth', 'Tháng trước')}
            className={`p-1.5 rounded-lg border transition-all ${
              isLight 
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700 active:scale-95' 
                : 'border-[#3E3023] hover:bg-white/5 text-[#A48F7A] active:scale-95'
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label={t('booking.nextMonth', 'Tháng sau')}
            className={`p-1.5 rounded-lg border transition-all ${
              isLight 
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700 active:scale-95' 
                : 'border-[#3E3023] hover:bg-white/5 text-[#A48F7A] active:scale-95'
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Quick Select Preset Buttons */}
      <div className="flex gap-1.5 mb-3.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={selectToday}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 ${
            normalizedSelectedKey === formatDateKey(today)
              ? isLight
                ? 'border-[#800020] bg-[#800020] text-white shadow-sm'
                : 'border-[#D4AF37] bg-[#8B6E4E] text-white shadow-sm'
              : isLight
                ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-300'
                : 'border-[#3E3023] bg-[#1A1510] text-[#A48F7A] hover:border-[#5C452E]'
          }`}
        >
          {t('booking.today', 'Hôm nay')}
        </button>
        <button
          type="button"
          onClick={selectTomorrow}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 ${
            (() => {
              const tom = new Date(today);
              tom.setDate(tom.getDate() + 1);
              return normalizedSelectedKey === formatDateKey(tom);
            })()
              ? isLight
                ? 'border-[#800020] bg-[#800020] text-white shadow-sm'
                : 'border-[#D4AF37] bg-[#8B6E4E] text-white shadow-sm'
              : isLight
                ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-300'
                : 'border-[#3E3023] bg-[#1A1510] text-[#A48F7A] hover:border-[#5C452E]'
          }`}
        >
          {t('booking.tomorrow', 'Ngày mai')}
        </button>
        <button
          type="button"
          onClick={selectThisWeekend}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1 ${
            isLight
              ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-300'
              : 'border-[#3E3023] bg-[#1A1510] text-[#A48F7A] hover:border-[#5C452E]'
          }`}
        >
          <Sparkles size={11} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
          {t('booking.thisWeekend', 'Cuối tuần này')}
        </button>
      </div>

      {/* Calendar Grid Container */}
      <div className={`p-2.5 rounded-xl border ${
        isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-[#15110E] border-[#2E241B]'
      }`}>
        {/* Weekday Names */}
        <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
          {dayOfWeekHeaders.map((dayName, idx) => (
            <span 
              key={dayName} 
              className={`text-[10px] font-bold uppercase tracking-wider ${
                idx >= 5 
                  ? isLight ? 'text-red-800' : 'text-amber-400' 
                  : isLight ? 'text-slate-400' : 'text-stone-500'
              }`}
            >
              {dayName}
            </span>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayDate, idx) => {
            if (!dayDate) {
              return <div key={`empty-${idx}`} className="h-8 w-full" />;
            }

            const dayKey = formatDateKey(dayDate);
            const isPast = dayDate.getTime() < today.getTime();
            const isToday = dayDate.getTime() === today.getTime();
            const isSelected = dayKey === normalizedSelectedKey;
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

            return (
              <button
                key={dayKey}
                type="button"
                disabled={isPast}
                onClick={() => handleSelectDay(dayDate)}
                className={`h-8 w-full rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                  isSelected
                    ? isLight
                      ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white shadow-md scale-105 z-10'
                      : 'bg-gradient-to-b from-[#D4AF37] to-[#8B6E4E] text-[#120E0C] shadow-md scale-105 z-10'
                    : isPast
                      ? isLight
                        ? 'text-slate-300 bg-transparent cursor-not-allowed line-through opacity-40'
                        : 'text-[#4A3B2C] bg-transparent cursor-not-allowed line-through opacity-40'
                      : isLight
                        ? `hover:bg-red-50 text-slate-700 hover:text-[#800020] active:scale-95 ${isWeekend ? 'text-red-950 font-black' : ''}`
                        : `hover:bg-white/10 text-[#EBE3DB] hover:text-white active:scale-95 ${isWeekend ? 'text-amber-300 font-black' : ''}`
                }`}
              >
                <span>{dayDate.getDate()}</span>
                {/* Tiny Today Indicator Dot */}
                {isToday && !isSelected && (
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                    isLight ? 'bg-[#800020]' : 'bg-[#D4AF37]'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date readout banner */}
      <div className={`mt-3 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-medium border ${
        isLight ? 'bg-red-50/60 border-red-200 text-red-900' : 'bg-[#1E1712] border-[#3E3023] text-[#D4AF37]'
      }`}>
        <span className="text-[11px] opacity-80">{t('booking.selectedDate', 'Ngày đã chọn:')}</span>
        <span className="font-bold">
          {(() => {
            // Find matched date
            if (normalizedSelectedKey) {
              const parts = normalizedSelectedKey.split('-');
              const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              return formatDisplayLabel(d);
            }
            return t('booking.todayLabel', 'Hôm nay');
          })()}
        </span>
      </div>
    </div>
  );
}
