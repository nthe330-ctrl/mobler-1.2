import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  User, 
  Sparkles, 
  Coffee, 
  Armchair, 
  DoorOpen, 
  Footprints, 
  Trees, 
  BookOpen, 
  ChevronRight, 
  Info,
  Layers
} from 'lucide-react';
import { Table } from '@shared/types';
import { useLanguage } from '@shared/context/LanguageContext';

export type FloorId = 'floor1' | 'floor2';

interface FloorTablePlanProps {
  tables: Table[];
  selectedTable: Table | null;
  onSelectTable: (table: Table | null) => void;
  selectedDate: string;
  selectedTime: string;
  isTableAvailable: (tableId: string, date: string, time: string) => boolean;
  isLight: boolean;
}

// ----------------------------------------------------------------------
// 1. SWITCH TAB UI (Segmented Control - DUY NHẤT 1 Switch Tab đổi Tầng 1 / Tầng 2)
// ----------------------------------------------------------------------
interface SwitchTabProps {
  activeFloor: FloorId;
  onChangeFloor: (floor: FloorId) => void;
  isLight: boolean;
  floor1HasSelected: boolean;
  floor2HasSelected: boolean;
}

function SwitchTab({ 
  activeFloor, 
  onChangeFloor, 
  isLight, 
  floor1HasSelected, 
  floor2HasSelected 
}: SwitchTabProps) {
  const { t } = useLanguage();

  return (
    <div 
      id="floor-switch-tab-container"
      className={`w-full max-w-md mx-auto p-1 rounded-2xl border transition-all flex items-center gap-1.5 shadow-sm ${
        isLight 
          ? 'bg-stone-100/90 border-stone-300' 
          : 'bg-[#18120E]/95 border-[#3E3023]'
      }`}
    >
      {/* Tab Tầng 1 */}
      <button
        id="switch-tab-btn-floor1"
        type="button"
        onClick={() => onChangeFloor('floor1')}
        className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer relative ${
          activeFloor === 'floor1'
            ? isLight
              ? 'bg-gradient-to-r from-[#800020] to-[#68001A] text-white shadow-md ring-1 ring-red-300'
              : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white shadow-md ring-1 ring-amber-400/40'
            : isLight
              ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              : 'text-stone-400 hover:text-stone-200 hover:bg-[#251D17]'
        }`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${
          activeFloor === 'floor1' 
            ? 'bg-white animate-pulse' 
            : isLight ? 'bg-red-700' : 'bg-[#D4AF37]'
        }`} />
        <span className="tracking-wide">{t('booking.floor1', 'TẦNG 1')}</span>
        <span className="text-[10px] font-normal opacity-85 hidden xs:inline">
          {t('booking.floor1Desc', '(Trệt & Quầy Bar)')}
        </span>
        {floor1HasSelected && (
          <span 
            title={t('booking.tableSelectedF1', 'Đang có bàn chọn ở Tầng 1')}
            className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500 shrink-0 ml-0.5" 
          />
        )}
      </button>

      {/* Tab Tầng 2 */}
      <button
        id="switch-tab-btn-floor2"
        type="button"
        onClick={() => onChangeFloor('floor2')}
        className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer relative ${
          activeFloor === 'floor2'
            ? isLight
              ? 'bg-gradient-to-r from-[#800020] to-[#68001A] text-white shadow-md ring-1 ring-red-300'
              : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white shadow-md ring-1 ring-amber-400/40'
            : isLight
              ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              : 'text-stone-400 hover:text-stone-200 hover:bg-[#251D17]'
        }`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${
          activeFloor === 'floor2' 
            ? 'bg-white animate-pulse' 
            : isLight ? 'bg-red-700' : 'bg-[#D4AF37]'
        }`} />
        <span className="tracking-wide">{t('booking.floor2', 'TẦNG 2')}</span>
        <span className="text-[10px] font-normal opacity-85 hidden xs:inline">
          {t('booking.floor2Desc', '(Ban công ngoài trời)')}
        </span>
        {floor2HasSelected && (
          <span 
            title={t('booking.tableSelectedF2', 'Đang có bàn chọn ở Tầng 2')}
            className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500 shrink-0 ml-0.5" 
          />
        )}
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. MAIN COMPONENT: FloorTablePlan (Interactive Floor Plan with Switch Tab)
// ----------------------------------------------------------------------
export function FloorTablePlan({
  tables,
  selectedTable,
  onSelectTable,
  selectedDate,
  selectedTime,
  isTableAvailable,
  isLight,
}: FloorTablePlanProps) {
  const { t } = useLanguage();

  // Determine initial floor based on selected table (t5..t8 are Floor 2)
  const [activeFloor, setActiveFloor] = useState<FloorId>(() => {
    if (selectedTable && ['t5', 't6', 't7', 't8'].includes(selectedTable.id)) {
      return 'floor2';
    }
    return 'floor1';
  });

  // Automatically switch floor view if a table from another floor is selected
  useEffect(() => {
    if (selectedTable) {
      if (['t5', 't6', 't7', 't8'].includes(selectedTable.id) && activeFloor !== 'floor2') {
        setActiveFloor('floor2');
      } else if (['t1', 't2', 't3', 't4'].includes(selectedTable.id) && activeFloor !== 'floor1') {
        setActiveFloor('floor1');
      }
    }
  }, [selectedTable?.id]);

  const floor1HasSelected = Boolean(selectedTable && ['t1', 't2', 't3', 't4'].includes(selectedTable.id));
  const floor2HasSelected = Boolean(selectedTable && ['t5', 't6', 't7', 't8'].includes(selectedTable.id));

  // Find table helper
  const getTable = (id: string): Table => {
    const found = tables.find(t => t.id === id);
    if (found) return found;
    // Fallback default structure
    return {
      id,
      x: 0,
      y: 0,
      width: 60,
      height: 60,
      seats: id === 't5' ? 6 : id === 't3' || id === 't4' || id === 't6' ? 4 : 2,
      type: id === 't5' ? 'sofa' : id === 't3' || id === 't4' || id === 't6' ? 'rect' : 'round',
      status: 'empty',
      photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400',
    };
  };

  // Render Table Item
  const renderTableEnsemble = (tableId: string) => {
    const table = getTable(tableId);
    const isAvailable = isTableAvailable(table.id, selectedDate, selectedTime);
    const isSelected = selectedTable?.id === table.id;
    const tableCode = `T0${table.id.replace('t', '')}`;

    const handleSelect = () => {
      if (isSelected) {
        onSelectTable(null);
      } else if (isAvailable) {
        onSelectTable(table);
      }
    };

    // ROUND TABLE (2 SEATS)
    if (table.type === 'round') {
      return (
        <div
          key={table.id}
          id={`table-seat-${table.id}`}
          onClick={handleSelect}
          className={`flex flex-col items-center justify-center select-none transition-all duration-150 ${
            isAvailable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-not-allowed opacity-65'
          } ${isSelected ? 'z-30 scale-105' : 'z-10'}`}
          title={`${tableCode} (${table.seats} ${t('booking.seats', 'chỗ')}) - ${isAvailable ? t('booking.legendEmpty', 'Còn trống') : t('booking.legendOccupied', 'Đã kín')}`}
        >
          {/* Top Chair Cushion */}
          <div
            className={`w-6 h-3.5 rounded-t-md border shadow-2xs transition-colors flex items-center justify-center ${
              isSelected
                ? isLight ? 'bg-[#800020] border-red-700' : 'bg-[#D4AF37] border-amber-300'
                : isAvailable
                  ? isLight ? 'bg-emerald-100 border-emerald-500' : 'bg-[#1E251A] border-[#4D6D47]'
                  : isLight ? 'bg-rose-100 border-rose-400' : 'bg-[#2A1717] border-[#693535]'
            }`}
          >
            <div className="w-4 h-1 rounded-full bg-black/20" />
          </div>

          {/* Table Surface */}
          <div className="relative my-0.5 flex items-center justify-center">
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex flex-col items-center justify-center shadow-md transition-all ${
                isSelected
                  ? isLight
                    ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] border-red-600 text-white ring-2 ring-red-400/60 shadow-red-900/30'
                    : 'bg-gradient-to-b from-[#8B6E4E] to-[#5C452E] border-[#D4AF37] text-white ring-2 ring-amber-400/60'
                  : isAvailable
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 hover:bg-emerald-100'
                      : 'bg-[#1E2619] border-[#4B6845] text-[#86B47C] hover:bg-[#253020]'
                    : isLight
                      ? 'bg-rose-50 border-rose-300 text-rose-600'
                      : 'bg-[#2A1717] border-[#5E2E2E] text-[#B05B5B]'
              }`}
            >
              {isSelected ? (
                <Check size={16} className="text-white animate-in zoom-in-75 duration-150" />
              ) : (
                <>
                  <span className="text-[11px] font-black tracking-tight">{tableCode}</span>
                  <span className="text-[8px] font-bold opacity-80 flex items-center gap-0.5">
                    <User size={8} />
                    {table.seats}
                  </span>
                </>
              )}
            </div>

            {/* Floating selected badge */}
            {isSelected && (
              <div className={`absolute -top-3.5 px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-wider whitespace-nowrap shadow-xs border ${
                isLight ? 'bg-red-800 text-white border-white' : 'bg-[#D4AF37] text-black border-black'
              }`}>
                {t('booking.selectedBadge', 'Chọn')}
              </div>
            )}
          </div>

          {/* Bottom Chair Cushion */}
          <div
            className={`w-6 h-3.5 rounded-b-md border shadow-2xs transition-colors flex items-center justify-center ${
              isSelected
                ? isLight ? 'bg-[#800020] border-red-700' : 'bg-[#D4AF37] border-amber-300'
                : isAvailable
                  ? isLight ? 'bg-emerald-100 border-emerald-500' : 'bg-[#1E251A] border-[#4D6D47]'
                  : isLight ? 'bg-rose-100 border-rose-400' : 'bg-[#2A1717] border-[#693535]'
            }`}
          >
            <div className="w-4 h-1 rounded-full bg-black/20" />
          </div>
        </div>
      );
    }

    // RECTANGULAR TABLE (4 SEATS)
    if (table.type === 'rect') {
      return (
        <div
          key={table.id}
          id={`table-seat-${table.id}`}
          onClick={handleSelect}
          className={`flex flex-col items-center justify-center select-none transition-all duration-150 w-full max-w-[140px] ${
            isAvailable ? 'cursor-pointer hover:scale-103 active:scale-97' : 'cursor-not-allowed opacity-65'
          } ${isSelected ? 'z-30 scale-103' : 'z-10'}`}
          title={`${tableCode} (4 ${t('booking.seats', 'chỗ')}) - ${isAvailable ? t('booking.legendEmpty', 'Còn trống') : t('booking.legendOccupied', 'Đã kín')}`}
        >
          {/* Top 2 Chairs */}
          <div className="flex justify-around w-full px-2">
            {[1, 2].map((i) => (
              <div
                key={`c-top-${i}`}
                className={`w-6 h-3 rounded-t-md border shadow-2xs flex items-center justify-center ${
                  isSelected
                    ? isLight ? 'bg-[#800020] border-red-700' : 'bg-[#D4AF37] border-amber-300'
                    : isAvailable
                      ? isLight ? 'bg-emerald-100 border-emerald-500' : 'bg-[#1E251A] border-[#4D6D47]'
                      : isLight ? 'bg-rose-100 border-rose-400' : 'bg-[#2A1717] border-[#693535]'
                }`}
              >
                <div className="w-4 h-1 rounded-full bg-black/20" />
              </div>
            ))}
          </div>

          {/* Table Surface */}
          <div className="relative w-full my-0.5 px-0.5">
            <div
              className={`w-full h-10 sm:h-11 rounded-lg border-2 flex items-center justify-between px-2.5 shadow-md transition-all ${
                isSelected
                  ? isLight
                    ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] border-red-600 text-white ring-2 ring-red-400/60 shadow-red-900/30'
                    : 'bg-gradient-to-b from-[#8B6E4E] to-[#5C452E] border-[#D4AF37] text-white ring-2 ring-amber-400/60'
                  : isAvailable
                    ? isLight
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 hover:bg-emerald-100'
                      : 'bg-[#1E2619] border-[#4B6845] text-[#86B47C] hover:bg-[#253020]'
                    : isLight
                      ? 'bg-rose-50 border-rose-300 text-rose-600'
                      : 'bg-[#2A1717] border-[#5E2E2E] text-[#B05B5B]'
              }`}
            >
              <span className="text-xs font-black tracking-tight">{tableCode}</span>
              <div className="w-3 h-1.5 rounded-xs bg-black/10 border border-current opacity-30" />
              <div className="flex items-center gap-0.5 text-[9px] font-bold">
                <User size={9} />
                <span>4 {t('booking.seats', 'chỗ')}</span>
              </div>

              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/15 rounded-lg">
                  <Check size={16} className="text-white animate-in zoom-in-75" />
                </div>
              )}
            </div>

            {/* Selected floating badge */}
            {isSelected && (
              <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded text-[7px] font-black uppercase tracking-wider whitespace-nowrap shadow-xs border ${
                isLight ? 'bg-red-800 text-white border-white' : 'bg-[#D4AF37] text-black border-black'
              }`}>
                {t('booking.legendSelecting', 'Đang chọn')}
              </div>
            )}
          </div>

          {/* Bottom 2 Chairs */}
          <div className="flex justify-around w-full px-2">
            {[1, 2].map((i) => (
              <div
                key={`c-bot-${i}`}
                className={`w-6 h-3 rounded-b-md border shadow-2xs flex items-center justify-center ${
                  isSelected
                    ? isLight ? 'bg-[#800020] border-red-700' : 'bg-[#D4AF37] border-amber-300'
                    : isAvailable
                      ? isLight ? 'bg-emerald-100 border-emerald-500' : 'bg-[#1E251A] border-[#4D6D47]'
                      : isLight ? 'bg-rose-100 border-rose-400' : 'bg-[#2A1717] border-[#693535]'
                }`}
              >
                <div className="w-4 h-1 rounded-full bg-black/20" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // SOFA LOUNGE (6 SEATS)
    if (table.type === 'sofa') {
      return (
        <div
          key={table.id}
          id={`table-seat-${table.id}`}
          onClick={handleSelect}
          className={`rounded-xl border-2 p-2 transition-all flex flex-col justify-between shadow-md select-none w-full max-w-[210px] ${
            isSelected
              ? isLight 
                ? 'bg-gradient-to-br from-red-50 to-amber-50 border-red-600 ring-2 ring-red-400/60 shadow-red-950/20 scale-102 z-30'
                : 'bg-gradient-to-br from-[#261E16] to-[#1C1611] border-[#D4AF37] ring-2 ring-amber-400/60 scale-102 z-30'
              : isAvailable
                ? isLight 
                  ? 'bg-emerald-50/50 border-emerald-500 hover:bg-emerald-100/60' 
                  : 'bg-[#182015] border-[#4D6D47] hover:bg-[#202B1D]'
                : isLight 
                  ? 'bg-rose-50/40 border-rose-300 opacity-65' 
                  : 'bg-[#281515] border-[#5E2E2E] opacity-65'
          } ${isAvailable ? 'cursor-pointer hover:scale-102' : 'cursor-not-allowed'}`}
          title={`${tableCode} (${t('booking.sofaTable', 'Bàn Sofa')} 6 ${t('booking.seats', 'chỗ')}) - ${isAvailable ? t('booking.legendEmpty', 'Còn trống') : t('booking.legendOccupied', 'Đã kín')}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
              <Armchair size={12} className={isSelected ? (isLight ? 'text-[#800020]' : 'text-[#D4AF37]') : ''} />
              <span className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}>{t('booking.sofaTable', 'Sofa')} ({tableCode})</span>
            </div>
            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
              isSelected
                ? isLight ? 'bg-[#800020] text-white border-red-700' : 'bg-[#D4AF37] text-black border-black'
                : isLight ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-[#2A2018] border-[#4E3928] text-[#D4AF37]'
            }`}>
              {t('booking.vipSeats', '6 Chỗ VIP')}
            </span>
          </div>

          {/* Wraparound Cushions & Table */}
          <div className="my-1 space-y-1">
            <div className="flex justify-between gap-1">
              {[1, 2, 3].map((num) => (
                <div 
                  key={`cushion-${num}`} 
                  className={`h-3.5 flex-1 rounded-xs border text-[7px] font-bold flex items-center justify-center ${
                    isSelected
                      ? isLight ? 'bg-[#800020] text-white border-red-800' : 'bg-[#8B6E4E] text-white border-[#D4AF37]'
                      : isLight ? 'bg-amber-200 border-amber-400 text-amber-950' : 'bg-[#3A2B1E] border-[#5A4330] text-[#D5C7B8]'
                  }`}
                >
                  {t('booking.seat', 'Ghế')} {num}
                </div>
              ))}
            </div>

            {/* Main Long Table Surface */}
            <div className={`h-11 rounded-md border-2 shadow-xs flex items-center justify-center transition-all ${
              isSelected
                ? isLight 
                  ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] border-red-700 text-white' 
                  : 'bg-gradient-to-b from-[#8B6E4E] to-[#5C452E] border-[#D4AF37] text-white'
                : isAvailable
                  ? isLight ? 'bg-white border-emerald-500 text-emerald-950' : 'bg-[#15110E] border-[#4B6845] text-[#86B47C]'
                  : isLight ? 'bg-rose-50 border-rose-300 text-rose-500' : 'bg-[#2A1717] border-[#5E2E2E] text-[#B05B5B]'
            }`}>
              {isSelected ? (
                <div className="flex items-center gap-1">
                  <Check size={14} className="text-white" />
                  <span className="text-[10px] font-black uppercase">{t('booking.legendSelecting', 'Đang chọn')}</span>
                </div>
              ) : (
                <span className="text-[10px] font-black">{tableCode} • {t('booking.sofaTable', 'Bàn Sofa')}</span>
              )}
            </div>

            <div className="flex justify-between gap-1">
              {[4, 5, 6].map((num) => (
                <div 
                  key={`cushion-${num}`} 
                  className={`h-3.5 flex-1 rounded-xs border text-[7px] font-bold flex items-center justify-center ${
                    isSelected
                      ? isLight ? 'bg-[#800020] text-white border-red-800' : 'bg-[#8B6E4E] text-white border-[#D4AF37]'
                      : isLight ? 'bg-amber-200 border-amber-400 text-amber-950' : 'bg-[#3A2B1E] border-[#5A4330] text-[#D5C7B8]'
                  }`}
                >
                  {t('booking.seat', 'Ghế')} {num}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[7.5px] font-semibold text-slate-500 pt-0.5">
            <span>{t('booking.meeting', 'Tiếp khách / Họp')}</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">{t('booking.hasOutlet', 'Có ổ cắm điện')}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div id="floor-table-plan-root" className="space-y-3">
      {/* 1. Header & Status Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h2 className={`font-bold text-sm flex items-center gap-1.5 ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
            <Armchair size={16} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
            <span>{t('booking.floorPlanTitle', 'Sơ đồ không gian quán & Bàn ghế thực tế')}</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            {t('booking.floorPlanSub', 'Chạm vào bàn hoặc ghế để giữ chỗ trực quan')}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600 shadow-xs" />
            <span className={isLight ? 'text-slate-600' : 'text-stone-400'}>{t('booking.legendEmpty', 'Trống')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-600 shadow-xs" />
            <span className={isLight ? 'text-slate-600' : 'text-stone-400'}>{t('booking.legendOccupied', 'Đã kín')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full border shadow-xs ${
              isLight ? 'bg-[#800020] border-red-800' : 'bg-[#D4AF37] border-amber-300'
            }`} />
            <span className={isLight ? 'text-[#800020] font-black' : 'text-[#D4AF37] font-black'}>{t('booking.legendSelecting', 'Đang chọn')}</span>
          </div>
        </div>
      </div>

      {/* 2. DUY NHẤT 1 SWITCH TAB UI CHỌN TẦNG 1 HOẶC TẦNG 2 */}
      <div id="floor-switch-tab-section" className="pt-1">
        <SwitchTab
          activeFloor={activeFloor}
          onChangeFloor={setActiveFloor}
          isLight={isLight}
          floor1HasSelected={floor1HasSelected}
          floor2HasSelected={floor2HasSelected}
        />
      </div>

      {/* 3. MAIN FLOOR PLAN CONTAINER (CHỈ RENDER TẦNG ĐANG ACTIVE) */}
      <div className={`rounded-2xl border p-3 sm:p-4 shadow-sm transition-all overflow-hidden ${
        isLight 
          ? 'bg-white border-red-200/90 shadow-[0_4px_16px_rgba(128,0,32,0.05)]' 
          : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
      }`}>
        <AnimatePresence mode="wait">
          {activeFloor === 'floor1' ? (
            /* ========================= FLOOR 1 CANVAS ========================= */
            <motion.div
              key="floor1-canvas"
              id="floor1-plan-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className={`relative w-full max-w-[500px] mx-auto rounded-xl p-3 sm:p-4 border select-none transition-all space-y-3.5 ${
                isLight 
                  ? 'bg-[#F9F7F5] border-slate-300 shadow-inner' 
                  : 'bg-[#15110E] border-[#2C231B] shadow-inner'
              }`}
              style={{
                backgroundImage: isLight
                  ? 'radial-gradient(#E2DCD5 1px, transparent 1px)'
                  : 'radial-gradient(#2E251E 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              {/* 1. MẶT TIỀN QUÁN: Cửa Ra Vào Chính & Cửa Sổ Mặt Phố (Khách bước vào từ đây) */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold ${
                isLight 
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950' 
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              }`}>
                <div className="flex items-center gap-2">
                  <DoorOpen size={16} />
                  <span className="font-extrabold tracking-wide">{t('booking.mainEntrance', 'Cửa Ra Vào Chính (Lối Vào)')}</span>
                  <Footprints size={13} className="opacity-60" />
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] opacity-85">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span>{t('booking.streetWindow', '🪟 Cửa Sổ Kính Mặt Phố')}</span>
                </div>
              </div>

              {/* 2. KHU VỰC THƯỞNG THỨC CÀ PHÊ: Bàn T01 & Bàn T03 */}
              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {t('booking.nearStreetWindow', '🪟 Cạnh Cửa Sổ Phố')}
                  </span>
                  {renderTableEnsemble('t1')}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {t('booking.quiet4Seats', '🛋️ Bàn 4 Chỗ Yên Tĩnh')}
                  </span>
                  {renderTableEnsemble('t3')}
                </div>
              </div>

              {/* 3. KHU VỰC BÀN CÀ PHÊ: Bàn T02 & Bàn T04 */}
              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {t('booking.centerGreenery', '🪴 Khu Trung Tâm Cây Xanh')}
                  </span>
                  {renderTableEnsemble('t2')}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    {t('booking.barNear4Seats', '☕ Bàn 4 Chỗ Gần Bar')}
                  </span>
                  {renderTableEnsemble('t4')}
                </div>
              </div>

              {/* 4. KHU PHA CHẾ & LỐI CẦU THANG LÊN TẦNG 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-stretch">
                {/* Quầy Barista (chiếm 2 cột) */}
                <div className={`sm:col-span-2 rounded-xl border p-2.5 flex flex-col justify-between ${
                  isLight 
                    ? 'bg-amber-100/80 border-amber-300 text-amber-950' 
                    : 'bg-[#261C14] border-[#4E3928] text-[#EBE3DB]'
                }`}>
                  <div className="flex items-center justify-between border-b border-black/10 pb-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                      <Coffee size={13} className={isLight ? 'text-amber-900' : 'text-[#D4AF37]'} />
                      <span>{t('booking.baristaCounter', 'Quầy Barista & Thu Ngân')}</span>
                    </div>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-black/10">
                      Espresso Bar • POS
                    </span>
                  </div>

                  {/* Stools along bar */}
                  <div className="flex justify-around items-center pt-1.5">
                    {[1, 2, 3].map((stoolNum) => (
                      <div key={`stool-${stoolNum}`} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded-full border shadow-2xs ${
                          isLight ? 'bg-amber-700 border-amber-900' : 'bg-[#8B6E4E] border-[#D4AF37]'
                        }`} />
                        <span className="text-[7.5px] font-bold opacity-75">{t('booking.seat', 'Ghế')} {stoolNum}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Staircase button to Floor 2 (1 cột) */}
                <button
                  type="button"
                  onClick={() => setActiveFloor('floor2')}
                  className={`p-2 rounded-xl border flex sm:flex-col justify-between text-left transition-all ${
                    isLight 
                      ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900' 
                      : 'bg-purple-950/40 hover:bg-purple-900/50 border-purple-800/60 text-purple-300'
                  }`}
                  title={t('booking.switchToFloor2', 'Chạm để chuyển lên sơ đồ Tầng 2')}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base">🪜</span>
                    <ChevronRight size={14} className="text-purple-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold leading-tight">{t('booking.stairsUp', 'Cầu Thang')}</p>
                    <p className="text-[8px] opacity-75">{t('booking.toFloor2', 'Lên Tầng 2')}</p>
                  </div>
                </button>
              </div>

              {/* 5. GÓC KHUẤT CUỐI QUÁN: KHU VỆ SINH NAM & NỮ RIÊNG BIỆT (Tách biệt kín đáo phía sau) */}
              <div 
                id="floor1-restrooms-zone"
                className={`p-2.5 rounded-xl border space-y-2 shadow-xs ${
                  isLight 
                    ? 'bg-stone-100/90 border-stone-300 text-stone-800' 
                    : 'bg-[#1D1712]/90 border-[#3D2E22] text-[#EBE3DB]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span>{t('booking.restroomZone', 'Góc Cuối Quán — Lối Vào Khu Vệ Sinh (Kín Đáo)')}</span>
                  </span>
                  <span className="text-[8px] font-normal opacity-70">{t('booking.isolatedFromTables', 'Cách ly khu bàn')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* WC Nam - Góc Sau Trái */}
                  <div 
                    id="wc-men-badge"
                    className={`p-2 rounded-lg border flex items-center justify-between shadow-2xs ${
                      isLight 
                        ? 'bg-blue-50/90 border-blue-300 text-blue-900' 
                        : 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🚹</span>
                      <div>
                        <p className="text-[11px] font-extrabold leading-tight">{t('booking.wcMen', 'WC Nam')}</p>
                        <p className="text-[8px] opacity-75">{t('booking.wcMenDesc', 'Phòng vệ sinh Nam')}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60">{t('booking.wcLeftCorner', 'Góc Trái')}</span>
                  </div>

                  {/* WC Nữ - Góc Sau Phải */}
                  <div 
                    id="wc-women-badge"
                    className={`p-2 rounded-lg border flex items-center justify-between shadow-2xs ${
                      isLight 
                        ? 'bg-pink-50/90 border-pink-300 text-pink-900' 
                        : 'bg-pink-950/40 border-pink-800/60 text-pink-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🚺</span>
                      <div>
                        <p className="text-[11px] font-extrabold leading-tight">{t('booking.wcWomen', 'WC Nữ')}</p>
                        <p className="text-[8px] opacity-75">{t('booking.wcWomenDesc', 'Gương soi & Lavabo')}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-pink-100 dark:bg-pink-900/60">{t('booking.wcRightCorner', 'Góc Phải')}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ========================= FLOOR 2 CANVAS ========================= */
            <motion.div
              key="floor2-canvas"
              id="floor2-plan-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className={`relative w-full max-w-[500px] mx-auto rounded-xl p-3 sm:p-4 border select-none transition-all space-y-3.5 ${
                isLight 
                  ? 'bg-[#F9F7F5] border-slate-300 shadow-inner' 
                  : 'bg-[#15110E] border-[#2C231B] shadow-inner'
              }`}
              style={{
                backgroundImage: isLight
                  ? 'radial-gradient(#E2DCD5 1px, transparent 1px)'
                  : 'radial-gradient(#2E251E 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              {/* Floor Header Bar: Outdoor Patio VIP */}
              <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-bold ${
                isLight 
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
                  : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              }`}>
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Trees size={13} className="text-emerald-500" />
                  <span>{t('booking.balconyPatio', 'Ban công ngoài trời & Cây xanh ngắm phố')}</span>
                </span>
                <span className="text-[10px] font-mono opacity-80">Patio VIP</span>
              </div>

              {/* Row 1: T05 Sofa Lounge (6 chỗ) & T06 Working Table (4 chỗ) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" />
                    {t('booking.sofaMeeting', 'Bàn Sofa Họp Nhóm')}
                  </span>
                  {renderTableEnsemble('t5')}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen size={11} className="text-blue-500" />
                    {t('booking.workAndRead', 'Khu Làm Việc & Đọc Sách')}
                  </span>
                  {renderTableEnsemble('t6')}
                </div>
              </div>

              {/* Balcony Divider Banner */}
              <div className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold ${
                isLight 
                  ? 'bg-gradient-to-r from-emerald-100 to-teal-100 border-emerald-300 text-emerald-950' 
                  : 'bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border-emerald-700/60 text-emerald-300'
              }`}>
                <span className="flex items-center gap-1.5 text-[10px]">
                  <span>{t('booking.balconySheltered', '🌿 Khu vực ban công thoáng mát có dù che')}</span>
                </span>
                <span className="text-[9px] font-mono bg-black/10 px-2 py-0.5 rounded">
                  Outdoor View
                </span>
              </div>

              {/* Row 2: Balcony Tables T07 & T08 */}
              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {t('booking.balconyGarden', '🌱 Ban Công Sân Vườn')}
                  </span>
                  {renderTableEnsemble('t7')}
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {t('booking.balconyCityView', '🌇 Ban Công View Phố')}
                  </span>
                  {renderTableEnsemble('t8')}
                </div>
              </div>

              {/* Floor 2 Restroom Access Indicator */}
              <div 
                id="floor2-restrooms-zone"
                className={`p-2 rounded-xl border flex items-center justify-between text-xs shadow-xs ${
                  isLight 
                    ? 'bg-stone-100/90 border-stone-300 text-stone-800' 
                    : 'bg-[#1D1712]/90 border-[#3D2E22] text-[#EBE3DB]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🚻</span>
                  <div>
                    <p className="text-[10px] font-bold leading-tight">{t('booking.restroomGuide', 'Chỉ Dẫn Nhà Vệ Sinh (Nam & Nữ)')}</p>
                    <p className="text-[8px] text-slate-500">{t('booking.restroomLocation', 'Góc khuất sau cùng Tầng 1 (Đi xuống theo cầu thang)')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-[10px]">
                  <span className="px-2 py-0.5 rounded border bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                    {t('booking.menShort', '🚹 Nam')}
                  </span>
                  <span className="px-2 py-0.5 rounded border bg-pink-50 dark:bg-pink-950/50 border-pink-200 dark:border-pink-800 text-pink-800 dark:text-pink-300">
                    {t('booking.womenShort', '🚺 Nữ')}
                  </span>
                </div>
              </div>

              {/* Bottom Architectural Bar: Stairs to Floor 1 */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveFloor('floor1')}
                  className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all ${
                    isLight 
                      ? 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900' 
                      : 'bg-purple-950/40 hover:bg-purple-900/50 border-purple-800/60 text-purple-300'
                  }`}
                  title={t('booking.switchToFloor1', 'Chạm để chuyển về sơ đồ Tầng 1')}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🪜</span>
                    <div>
                      <p className="text-[10px] font-bold leading-tight">{t('booking.stairsDown', 'Lối Cầu Thang Xuống')}</p>
                      <p className="text-[8px] opacity-75">{t('booking.toFloor1', 'Quay lại Tầng 1 (Trệt & Quầy Bar)')}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="rotate-180" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Selected Table Callout with Quick Action */}
      {selectedTable && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all animate-in fade-in slide-in-from-bottom-2 ${
          isLight 
            ? 'bg-red-50/90 border-red-300 text-red-950 shadow-xs' 
            : 'bg-[#1D1712] border-[#4A3B2C] text-[#EBE3DB] shadow-xs'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
              isLight ? 'bg-[#800020] text-white' : 'bg-[#D4AF37] text-black'
            }`}>
              T0{selectedTable.id.replace('t', '')}
            </div>
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>{t('booking.selectedTable', 'Bàn đã chọn')}: T0{selectedTable.id.replace('t', '')}</span>
                <span className="text-[10px] font-normal opacity-80">
                  ({['t5', 't6', 't7', 't8'].includes(selectedTable.id) ? t('booking.floor2', 'Tầng 2') : t('booking.floor1', 'Tầng 1')} • {selectedTable.seats} {t('booking.seats', 'chỗ')})
                </span>
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                {t('booking.tableAvailableAt', 'Vị trí còn trống vào')} {selectedDate} {t('booking.atTime', 'lúc')} {selectedTime}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectTable(null)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
              isLight 
                ? 'border-red-300 hover:bg-red-100 text-red-900' 
                : 'border-[#4A3B2C] hover:bg-white/10 text-[#A48F7A]'
            }`}
          >
            {t('booking.deselect', 'Bỏ chọn')}
          </button>
        </div>
      )}
    </div>
  );
}

// Default export for backwards compatibility
export default FloorTablePlan;
