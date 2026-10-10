import { useState, useMemo } from 'react';
import { Clock, Sun, Moon, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';

interface ClockTimePickerProps {
  selectedTime: string; // Format "HH:mm" e.g. "09:00", "14:30"
  onSelectTime: (timeStr: string) => void;
  isTableAvailable?: (time: string) => boolean;
  isLight: boolean;
}

export default function ClockTimePicker({
  selectedTime,
  onSelectTime,
  isTableAvailable,
  isLight,
}: ClockTimePickerProps) {
  const { t } = useLanguage();

  // Parse current selected time into hour and minute
  const { currentHour24, currentMinute } = useMemo(() => {
    const parts = (selectedTime || '09:00').split(':');
    const h = parseInt(parts[0], 10) || 9;
    const m = parseInt(parts[1], 10) || 0;
    return { currentHour24: h, currentMinute: m };
  }, [selectedTime]);

  // Determine period: AM (Sáng: 7 - 11) or PM (Chiều & Tối: 12 - 22)
  const isPM = currentHour24 >= 12;

  // Clock hour 1 to 12
  const currentHour12 = useMemo(() => {
    let h = currentHour24 % 12;
    if (h === 0) h = 12;
    return h;
  }, [currentHour24]);

  // Minutes options
  const minuteOptions = [0, 15, 30, 45];

  // Helper to construct "HH:mm"
  const buildTimeString = (hour24: number, min: number) => {
    const hStr = String(hour24).padStart(2, '0');
    const mStr = String(min).padStart(2, '0');
    return `${hStr}:${mStr}`;
  };

  // Convert 12h clock number (1..12) into 24h depending on isPM
  const get24Hour = (hour12: number, pm: boolean) => {
    if (pm) {
      return hour12 === 12 ? 12 : hour12 + 12;
    } else {
      return hour12 === 12 ? 0 : hour12;
    }
  };

  const handleHourClick = (hour12: number) => {
    let targetHour24 = get24Hour(hour12, isPM);
    // Boundary check for coffee shop typical hours (07:00 - 22:30)
    if (targetHour24 < 7 && !isPM) targetHour24 = 7; // Cap morning
    if (targetHour24 > 22 && isPM) targetHour24 = 22; // Cap evening
    const newTime = buildTimeString(targetHour24, currentMinute);
    onSelectTime(newTime);
  };

  const handleMinuteClick = (min: number) => {
    const newTime = buildTimeString(currentHour24, min);
    onSelectTime(newTime);
  };

  const handlePeriodToggle = (toPM: boolean) => {
    let targetHour24 = get24Hour(currentHour12, toPM);
    if (targetHour24 < 7) targetHour24 = 8;
    if (targetHour24 > 22) targetHour24 = 20;
    const newTime = buildTimeString(targetHour24, currentMinute);
    onSelectTime(newTime);
  };

  // Radial positions for 12 hours on clock dial
  // Radius = 88px, Center = (115px, 115px)
  const CLOCK_RADIUS = 86;
  const CENTER_X = 115;
  const CENTER_Y = 115;

  const clockHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Calculate pointer angle (12 is at top = 0 deg or -90 deg in standard polar)
  const handRotationDeg = useMemo(() => {
    return (currentHour12 % 12) * 30; // 360 / 12 = 30 deg per hour
  }, [currentHour12]);

  // Check if current slot is available
  const currentSlotAvailable = isTableAvailable ? isTableAvailable(selectedTime) : true;

  // Quick preset slots
  const quickSlots = [
    '08:30', '09:00', '10:00', '11:30', 
    '14:00', '15:30', '17:00', '19:30', '20:30'
  ];

  return (
    <div className={`rounded-2xl p-4 border transition-all ${
      isLight 
        ? 'bg-white border-red-200/80 shadow-[0_4px_16px_rgba(128,0,32,0.06)]' 
        : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
    }`}>
      {/* Header with Title and Digital Display */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isLight ? 'bg-red-50 text-[#800020]' : 'bg-[#2A2018] text-[#D4AF37]'
          }`}>
            <Clock size={16} />
          </div>
          <div>
            <h3 className={`font-bold text-xs ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
              {t('booking.clockTitle', 'Đồng hồ tròn chọn giờ')}
            </h3>
            <p className="text-[10px] text-slate-500">{t('booking.clockSub', 'Chạm vào số trên mặt đồng hồ')}</p>
          </div>
        </div>

        {/* Digital Time Badge */}
        <div className="flex items-center gap-1.5">
          <div className={`px-3 py-1 rounded-xl font-mono text-sm font-black border flex items-center gap-1.5 ${
            isLight 
              ? 'bg-red-50 border-red-200 text-[#800020] shadow-sm' 
              : 'bg-[#18120D] border-[#3E3023] text-[#D4AF37] shadow-sm'
          }`}>
            <span>{selectedTime}</span>
            <span className="text-[9px] font-sans font-bold px-1 py-0.2 rounded uppercase bg-black/5 dark:bg-white/10">
              {isPM ? (currentHour24 >= 18 ? t('booking.evening', 'Tối') : t('booking.afternoon', 'Chiều')) : t('booking.morning', 'Sáng')}
            </span>
          </div>
        </div>
      </div>

      {/* AM / PM Toggle Switch */}
      <div className="flex justify-center mb-3">
        <div className={`p-1 rounded-xl border flex items-center gap-1 ${
          isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#15110E] border-[#2E241B]'
        }`}>
          <button
            type="button"
            onClick={() => handlePeriodToggle(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              !isPM
                ? isLight
                  ? 'bg-white text-[#800020] shadow-sm border border-red-200'
                  : 'bg-[#8B6E4E] text-white shadow-sm border border-[#D4AF37]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-[#A48F7A] hover:text-[#EBE3DB]'
            }`}
          >
            <Sun size={13} className={!isPM ? (isLight ? 'text-amber-500' : 'text-amber-300') : ''} />
            <span>{t('booking.morningAm', 'Buổi sáng (AM)')}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePeriodToggle(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              isPM
                ? isLight
                  ? 'bg-white text-[#800020] shadow-sm border border-red-200'
                  : 'bg-[#8B6E4E] text-white shadow-sm border border-[#D4AF37]'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-[#A48F7A] hover:text-[#EBE3DB]'
            }`}
          >
            <Moon size={13} className={isPM ? (isLight ? 'text-indigo-600' : 'text-indigo-300') : ''} />
            <span>{t('booking.afternoonPm', 'Buổi chiều / tối (PM)')}</span>
          </button>
        </div>
      </div>

      {/* Circular Clock Dial Container */}
      <div className="flex flex-col items-center justify-center my-2">
        <div 
          className={`relative w-[230px] h-[230px] rounded-full border-4 shadow-inner select-none transition-all flex items-center justify-center ${
            isLight
              ? 'bg-gradient-to-br from-slate-50 via-white to-slate-100 border-red-100 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)]'
              : 'bg-gradient-to-br from-[#1A1410] via-[#15100D] to-[#100C0A] border-[#382B1F] shadow-[inset_0_2px_12px_rgba(0,0,0,0.4)]'
          }`}
          style={{ touchAction: 'manipulation' }}
        >
          {/* Subtle Dial Markers (60 minute tick dashes) */}
          <div className="absolute inset-2 rounded-full border border-dashed border-black/5 dark:border-white/5 pointer-events-none" />

          {/* Center Pivot Pin */}
          <div 
            className={`absolute w-3 h-3 rounded-full z-20 shadow-md ${
              isLight ? 'bg-[#800020]' : 'bg-[#D4AF37]'
            }`}
            style={{ left: CENTER_X - 6, top: CENTER_Y - 6 }}
          />

          {/* Clock Hand Pointer (Rotates with smooth spring) */}
          <div
            className="absolute z-10 origin-bottom pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              left: CENTER_X - 1.5,
              top: CENTER_Y - CLOCK_RADIUS,
              width: 3,
              height: CLOCK_RADIUS,
              transformOrigin: '50% 100%',
              transform: `rotate(${handRotationDeg}deg)`,
            }}
          >
            {/* The line */}
            <div className={`w-full h-full rounded-t-full ${
              isLight ? 'bg-[#800020]' : 'bg-[#D4AF37]'
            }`} />

            {/* Glowing active circle at hand tip */}
            <div 
              className={`absolute -top-3.5 -left-3.5 w-8 h-8 rounded-full border-2 transition-all ${
                isLight 
                  ? 'border-[#800020] bg-red-600/15 shadow-sm' 
                  : 'border-[#D4AF37] bg-amber-400/20 shadow-sm'
              }`}
            />
          </div>

          {/* 12 Hour Numbers Arranged Radially */}
          {clockHours.map((h12) => {
            const h24 = get24Hour(h12, isPM);
            const isSelected = currentHour12 === h12;
            
            // Check availability if checker provided
            const testSlot = buildTimeString(h24, currentMinute);
            const isAvailable = isTableAvailable ? isTableAvailable(testSlot) : true;

            // Angle in radians: 12 is at 0 rad (top), 3 is at PI/2 (right)
            // (h12 / 12) * 2 * PI - PI / 2
            const angleRad = ((h12 % 12) * 30 - 90) * (Math.PI / 180);
            const x = CENTER_X + CLOCK_RADIUS * Math.cos(angleRad);
            const y = CENTER_Y + CLOCK_RADIUS * Math.sin(angleRad);

            // Display text: show 12h with subtle 24h indicator
            return (
              <button
                key={h12}
                type="button"
                onClick={() => handleHourClick(h12)}
                aria-label={t('booking.pickHour', 'Chọn {h}:00').replace('{h}', String(h24))}
                className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center font-bold text-xs transition-all z-20 ${
                  isSelected
                    ? isLight
                      ? 'bg-[#800020] text-white shadow-md font-black scale-110'
                      : 'bg-[#D4AF37] text-[#120E0C] shadow-md font-black scale-110'
                    : !isAvailable
                      ? isLight
                        ? 'text-slate-300 hover:text-slate-400 cursor-not-allowed'
                        : 'text-stone-600 hover:text-stone-500 cursor-not-allowed'
                      : isLight
                        ? 'text-slate-700 hover:bg-red-50 hover:text-[#800020] active:scale-95'
                        : 'text-[#D5C7B8] hover:bg-white/10 hover:text-white active:scale-95'
                }`}
                style={{ left: x, top: y }}
              >
                <span>{h12}</span>
                {/* Tiny red dot if table unavailable at this hour */}
                {!isAvailable && (
                  <span className="absolute -top-0.5 right-0 w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minute Selector Bar */}
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
            {t('booking.selectMinutes', 'Chọn phút:')}
          </span>
          <div className="flex gap-1.5">
            {minuteOptions.map((min) => {
              const isMinSelected = currentMinute === min;
              return (
                <button
                  key={min}
                  type="button"
                  onClick={() => handleMinuteClick(min)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                    isMinSelected
                      ? isLight
                        ? 'border-[#800020] bg-[#800020] text-white shadow-xs'
                        : 'border-[#D4AF37] bg-[#8B6E4E] text-white shadow-xs'
                      : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-red-300'
                        : 'border-[#3E3023] bg-[#1A1510] text-[#A48F7A] hover:border-[#5C452E]'
                  }`}
                >
                  :{String(min).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Slot Shortcuts */}
        <div className="mt-2.5">
          <div className="flex items-center gap-1 mb-1.5">
            <Sparkles size={11} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isLight ? 'text-slate-400' : 'text-stone-500'
            }`}>
              {t('booking.popularSlots', 'Khung giờ phổ biến')}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {quickSlots.map((slot) => {
              const isSelected = selectedTime === slot;
              const isAvailable = isTableAvailable ? isTableAvailable(slot) : true;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => onSelectTime(slot)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border whitespace-nowrap transition-all shrink-0 ${
                    isSelected
                      ? isLight
                        ? 'border-[#800020] bg-[#800020] text-white shadow-xs'
                        : 'border-[#D4AF37] bg-[#8B6E4E] text-white shadow-xs'
                      : !isAvailable
                        ? 'border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                        : isLight
                          ? 'border-slate-200 bg-slate-50 text-slate-600 hover:border-red-300'
                          : 'border-[#3E3023] bg-[#1A1510] text-[#A48F7A] hover:border-[#5C452E]'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Availability Notice */}
      {!currentSlotAvailable && (
        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle size={13} className="shrink-0" />
          <span>{t('booking.slotUnavailable', 'Bàn bạn đang chọn đã kín vào lúc {selectedTime}. Vui lòng đổi giờ hoặc chọn bàn khác.').replace('{selectedTime}', selectedTime)}</span>
        </div>
      )}
    </div>
  );
}
