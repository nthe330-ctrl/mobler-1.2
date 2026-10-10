import { useState } from 'react';
import { Gift, Coffee, MapPin, Tag, Smartphone, Sparkles, ArrowRight, CheckCircle2, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState, AppliedVoucherInfo } from '../App';
import { MOCK_SHOPS } from '@shared/data';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { LanguageControlButton } from './LanguageSelectorModal';

interface Props {
  onNavigate: (view: ViewState) => void;
}

export default function PromotionsView({ onNavigate }: Props) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'store' | 'app'>('store');
  const [storeFilter, setStoreFilter] = useState<'all' | 'favorite' | 'visited'>('all');
  const [selectedAppPromo, setSelectedAppPromo] = useState<any | null>(null);

  const storePromotions = [
    {
      id: '1',
      store: MOCK_SHOPS[0],
      title: 'Mua 1 Tặng 1 Cafe Sáng',
      titleKey: 'promotions.promo1Title',
      description: 'Áp dụng cho tất cả các loại cafe Việt Nam. Tự động giảm 45.000đ khi thanh toán.',
      descKey: 'promotions.promo1Desc',
      code: 'MORNINGCOFFEE',
      discount: 45000,
      discountText: 'Giảm 45.000đ',
      discountKey: 'promotions.promo1Discount',
      validUntil: '31/08/2026',
      type: 'BOGO',
      from: 'Quán quen',
      fromKey: 'promotions.fromFavorite',
      category: 'favorite',
      image: MOCK_SHOPS[0].images[0]
    },
    {
      id: '2',
      store: MOCK_SHOPS[1],
      title: 'Giảm 20.000đ Combo Bánh & Nước',
      titleKey: 'promotions.promo2Title',
      description: 'Thưởng thức bánh ngọt Pháp thơm ngon cùng thức uống yêu thích.',
      descKey: 'promotions.promo2Desc',
      code: 'SWEET20',
      discount: 20000,
      discountText: 'Giảm 20.000đ',
      discountKey: 'promotions.promo2Discount',
      validUntil: '15/09/2026',
      type: 'DISCOUNT',
      from: 'Đã từng ghé',
      fromKey: 'promotions.fromVisited',
      category: 'visited',
      image: MOCK_SHOPS[1].images[0]
    },
    {
      id: '3',
      store: MOCK_SHOPS[2],
      title: 'Miễn Phí Nâng Size (Upsize)',
      titleKey: 'promotions.promo3Title',
      description: 'Giảm ngay 15.000đ cho đơn đặt bàn trước và chọn món trực tuyến.',
      descKey: 'promotions.promo3Desc',
      code: 'UPSIZEFREE',
      discount: 15000,
      discountText: 'Giảm 15.000đ',
      discountKey: 'promotions.promo3Discount',
      validUntil: '30/09/2026',
      type: 'FREEBIE',
      from: 'Gợi ý cho bạn',
      fromKey: 'promotions.fromSuggested',
      category: 'suggested',
      image: MOCK_SHOPS[2].images[0]
    }
  ];

  const filteredStorePromotions = storePromotions.filter(promo => {
    if (storeFilter === 'favorite') {
      return promo.category === 'favorite';
    }
    if (storeFilter === 'visited') {
      return promo.category === 'visited' || promo.category === 'favorite';
    }
    return true;
  });

  const appPromotions = [
    {
      id: 'app-1',
      title: 'Giảm 30.000đ Thành Viên VIP',
      titleKey: 'promotions.appPromo1Title',
      description: 'Đặc quyền thành viên: Giảm trực tiếp 30.000đ khi đặt bàn tại bất kỳ quán nào trên hệ thống.',
      descKey: 'promotions.appPromo1Desc',
      code: 'VIP50',
      discount: 30000,
      discountText: 'Giảm 30.000đ',
      discountKey: 'promotions.appPromo1Discount',
      validUntil: '31/08/2026',
      type: 'DISCOUNT',
      from: 'Hệ thống',
      fromKey: 'promotions.fromSystem',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1000'
    },
    {
      id: 'app-2',
      title: 'Thưởng 20.000đ Bạn Mới Check-in',
      titleKey: 'promotions.appPromo2Title',
      description: 'Giảm 20.000đ cho hóa đơn đặt bàn hoặc gọi đồ uống đầu tiên trên app.',
      descKey: 'promotions.appPromo2Desc',
      code: 'SHARE100',
      discount: 20000,
      discountText: 'Giảm 20.000đ',
      discountKey: 'promotions.appPromo2Discount',
      validUntil: '31/12/2026',
      type: 'REWARD',
      from: 'Sự kiện',
      fromKey: 'promotions.fromEvent',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000'
    }
  ];

  const handleUseStorePromo = (promo: typeof storePromotions[0]) => {
    const voucherPayload: AppliedVoucherInfo = {
      code: promo.code,
      discount: promo.discount,
      label: t(promo.titleKey, promo.title),
      type: promo.type,
      storeId: promo.store.id,
      storeName: promo.store.name,
      description: t(promo.descKey, promo.description)
    };
    
    // Navigate directly to the store page with the auto applied voucher
    onNavigate({
      name: 'store',
      id: promo.store.id,
      appliedVoucher: voucherPayload
    });
  };

  const handleUseAppPromo = (shopId: string) => {
    if (!selectedAppPromo) return;
    const targetShop = MOCK_SHOPS.find(s => s.id === shopId) || MOCK_SHOPS[0];
    
    const voucherPayload: AppliedVoucherInfo = {
      code: selectedAppPromo.code,
      discount: selectedAppPromo.discount,
      label: t(selectedAppPromo.titleKey, selectedAppPromo.title),
      type: selectedAppPromo.type,
      storeId: targetShop.id,
      storeName: targetShop.name,
      description: t(selectedAppPromo.descKey, selectedAppPromo.description)
    };

    setSelectedAppPromo(null);
    onNavigate({
      name: 'store',
      id: targetShop.id,
      appliedVoucher: voucherPayload
    });
  };

  return (
    <div className={`flex flex-col min-h-full max-w-6xl mx-auto w-full px-4 md:px-8 py-6 animate-in fade-in pb-28 transition-colors duration-300 ${isLight ? 'bg-[#F0F3F7]' : 'bg-transparent'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} size={28} />
          <div>
            <h1 className={`text-2xl font-bold ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
              {t('promotions.title', 'Khuyến mãi')}
            </h1>
            <p className="text-[11px] text-slate-500">
              {t('promotions.subtitle', 'Ấn "Dùng ngay" để tự động áp dụng khi đặt bàn & thanh toán')}
            </p>
          </div>
        </div>
        <LanguageControlButton variant="badge" />
      </div>

      {/* Tabs */}
      <div className={`flex rounded-2xl p-1.5 border mb-6 transition-all duration-300 ${
        isLight ? 'bg-white border-red-200/80 shadow-[0_2px_10px_rgba(128,0,32,0.05)]' : 'bg-[#120E0C]/95 border-[#4A3B2C]'
      }`}>
        <button 
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
            activeTab === 'store' 
              ? isLight 
                ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white shadow-[0_2px_8px_rgba(128,0,32,0.25)] border border-red-700/20' 
                : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white shadow-[0_2px_8px_rgba(212,175,55,0.25)] border border-[#D4AF37]/30' 
              : isLight 
                ? 'text-slate-600 hover:text-[#800020] hover:bg-slate-50' 
                : 'text-[#A48F7A] hover:text-[#EBE3DB] hover:bg-[#1E1813]'
          }`}
        >
          <span>{t('promotions.storeVouchers', 'Voucher từ quán')}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'store'
              ? isLight ? 'bg-white/20 text-white' : 'bg-black/25 text-[#FFF2D6]'
              : isLight ? 'bg-slate-100 text-slate-500' : 'bg-[#251E18] text-[#8C7660]'
          }`}>
            {storePromotions.length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('app')}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
            activeTab === 'app' 
              ? isLight 
                ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white shadow-[0_2px_8px_rgba(128,0,32,0.25)] border border-red-700/20' 
                : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white shadow-[0_2px_8px_rgba(212,175,55,0.25)] border border-[#D4AF37]/30' 
              : isLight 
                ? 'text-slate-600 hover:text-[#800020] hover:bg-slate-50' 
                : 'text-[#A48F7A] hover:text-[#EBE3DB] hover:bg-[#1E1813]'
          }`}
        >
          <span>{t('promotions.appVouchers', 'Voucher hệ thống')}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'app'
              ? isLight ? 'bg-white/20 text-white' : 'bg-black/25 text-[#FFF2D6]'
              : isLight ? 'bg-slate-100 text-slate-500' : 'bg-[#251E18] text-[#8C7660]'
          }`}>
            {appPromotions.length}
          </span>
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'store' ? (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-2">
              <button 
                onClick={() => setStoreFilter('all')}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  storeFilter === 'all' 
                    ? isLight ? 'bg-[#800020] text-white' : 'bg-[#D4AF37] text-black' 
                    : isLight ? 'border border-red-300 text-slate-700 bg-white' : 'border border-[#4A3B2C] text-[#7A6450] bg-[#120E0C]'
                }`}
              >
                {t('promotions.filterAll', 'Tất cả')}
              </button>
              <button 
                onClick={() => setStoreFilter('favorite')}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  storeFilter === 'favorite' 
                    ? isLight ? 'bg-[#800020] text-white' : 'bg-[#D4AF37] text-black' 
                    : isLight ? 'border border-red-300 text-slate-700 bg-white' : 'border border-[#4A3B2C] text-[#7A6450] bg-[#120E0C]'
                }`}
              >
                {t('promotions.filterFavorite', 'Quán quen')}
              </button>
              <button 
                onClick={() => setStoreFilter('visited')}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  storeFilter === 'visited' 
                    ? isLight ? 'bg-[#800020] text-white' : 'bg-[#D4AF37] text-black' 
                    : isLight ? 'border border-red-300 text-slate-700 bg-white' : 'border border-[#4A3B2C] text-[#7A6450] bg-[#120E0C]'
                }`}
              >
                {t('promotions.filterVisited', 'Đã ghé')}
              </button>
            </div>

            {filteredStorePromotions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStorePromotions.map((promo) => (
                <motion.div 
                  whileTap={{ scale: 0.99 }} 
                  key={promo.id} 
                  className={`border rounded-2xl overflow-hidden relative transition-all ${
                    isLight 
                      ? 'bg-white border-red-700/30 shadow-[0_4px_12px_rgba(128,0,32,0.06)]' 
                      : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
                  }`}
                >
                  <div className="h-32 relative">
                    <img src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                    
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-bold shadow-xs border flex items-center gap-1 ${
                        isLight
                          ? 'bg-white/95 text-[#800020] border-red-200/80 shadow-[0_1px_3px_rgba(128,0,32,0.08)]'
                          : 'bg-[#18130F]/95 text-[#D4AF37] border-[#D4AF37]/30 shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
                      }`}>
                        {t(promo.fromKey, promo.from)}
                      </span>
                      <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold shadow-sm flex items-center gap-1 tracking-wide">
                        <Sparkles size={11} /> {t(promo.discountKey, promo.discountText)}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-3 text-white">
                      <span className="text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {t('promotions.code', 'Mã:')} <strong className="text-amber-300">{promo.code}</strong>
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 relative">
                    <div 
                      className="absolute -top-6 right-4 w-12 h-12 rounded-full border-2 border-white bg-white flex items-center justify-center overflow-hidden cursor-pointer shadow-lg hover:scale-105 transition-transform" 
                      onClick={() => onNavigate({ name: 'store', id: promo.store.id })}
                    >
                       <img src={promo.store.images[1]} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    
                    <div 
                      className="mb-1 flex items-center gap-1 cursor-pointer" 
                      onClick={() => onNavigate({ name: 'store', id: promo.store.id })}
                    >
                      <Store size={13} className={isLight ? 'text-red-900' : 'text-[#D4AF37]'} />
                      <span className={`text-[11px] uppercase tracking-wider font-bold ${isLight ? 'text-red-900' : 'text-[#D4AF37]'}`}>
                        {promo.store.name}
                      </span>
                    </div>
                    
                    <h3 className={`font-bold text-sm mb-1.5 ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
                      {t(promo.titleKey, promo.title)}
                    </h3>
                    <p className={`text-xs leading-relaxed mb-3.5 ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
                      {t(promo.descKey, promo.description)}
                    </p>
                    
                    <div className={`flex items-center justify-between border-t pt-3 ${isLight ? 'border-red-100' : 'border-[#3E3023]'}`}>
                      <div className={`flex items-center gap-1 text-[10px] ${isLight ? 'text-slate-500' : 'text-[#7A6450]'}`}>
                        <Tag size={12} /> {t('promotions.validUntil', 'HSD:')} {promo.validUntil}
                      </div>

                      <motion.button 
                        whileTap={{ scale: 0.95 }} 
                        onClick={() => handleUseStorePromo(promo)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all border ${
                          isLight 
                            ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white border-red-600 hover:opacity-90' 
                            : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white border-[#D4AF37] hover:opacity-90'
                        }`}
                      >
                        <span>{t('promotions.useNow', 'Dùng ngay')}</span>
                        <ArrowRight size={13} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-red-300 text-slate-500">
                <p className="text-sm font-medium">{t('promotions.noVouchers', 'Chưa có voucher phù hợp')}</p>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appPromotions.map((promo) => (
            <motion.div 
              whileTap={{ scale: 0.99 }} 
              key={promo.id} 
              className={`border rounded-2xl overflow-hidden relative transition-all ${
                isLight 
                  ? 'bg-white border-red-700/30 shadow-[0_4px_12px_rgba(128,0,32,0.06)]' 
                  : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
              }`}
            >
              <div className="h-32 relative">
                <img src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className={`backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-bold shadow-xs border flex items-center gap-1 ${
                    isLight
                      ? 'bg-white/95 text-[#800020] border-red-200/80 shadow-[0_1px_3px_rgba(128,0,32,0.08)]'
                      : 'bg-[#18130F]/95 text-[#D4AF37] border-[#D4AF37]/30 shadow-[0_1px_3px_rgba(0,0,0,0.4)]'
                  }`}>
                    {t(promo.fromKey, promo.from)}
                  </span>
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold shadow-sm flex items-center gap-1 tracking-wide">
                    <Sparkles size={11} /> {t(promo.discountKey, promo.discountText)}
                  </span>
                </div>

                <div className="absolute bottom-2 left-3 text-white">
                  <span className="text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {t('promotions.code', 'Mã:')} <strong className="text-amber-300">{promo.code}</strong>
                  </span>
                </div>
              </div>
              
              <div className="p-4 relative">
                <div className="absolute -top-6 right-4 w-12 h-12 rounded-full border-2 border-white bg-red-50 flex items-center justify-center overflow-hidden shadow-lg">
                   <Smartphone className="text-[#800020]" size={24} />
                </div>
                
                <h3 className={`font-bold text-sm mb-1.5 mt-1 ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
                  {t(promo.titleKey, promo.title)}
                </h3>
                <p className={`text-xs leading-relaxed mb-3.5 ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
                  {t(promo.descKey, promo.description)}
                </p>
                
                <div className={`flex items-center justify-between border-t pt-3 ${isLight ? 'border-red-100' : 'border-[#3E3023]'}`}>
                  <div className={`flex items-center gap-1 text-[10px] ${isLight ? 'text-slate-500' : 'text-[#7A6450]'}`}>
                    <Tag size={12} /> {t('promotions.validUntil', 'HSD:')} {promo.validUntil}
                  </div>
                  
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => setSelectedAppPromo(promo)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all border ${
                      isLight 
                        ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white border-red-600 hover:opacity-90' 
                        : 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    }`}
                  >
                    <span>{t('promotions.useNow', 'Dùng ngay')}</span>
                    <ArrowRight size={13} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
          </div>
        )}
      </div>

      {/* Modal to pick shop for App Promos */}
      <AnimatePresence>
        {selectedAppPromo && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-end justify-center sm:items-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl ${
                isLight ? 'bg-white border-red-300' : 'bg-[#1A1510] border-[#4A3B2C] text-white'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  <div>
                    <h3 className="font-bold text-sm">
                      {t('promotions.selectStoreTitle', 'Chọn quán áp dụng voucher')}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {t('promotions.code', 'Mã:')} {selectedAppPromo.code} ({t(selectedAppPromo.discountKey, selectedAppPromo.discountText)})
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAppPromo(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                {t('promotions.selectStoreDesc', 'Ưu đãi sẽ được tự động kích hoạt và khấu trừ thẳng vào hóa đơn thanh toán khi đặt bàn.')}
              </p>

              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar mb-4">
                {MOCK_SHOPS.map(shop => (
                  <div 
                    key={shop.id}
                    onClick={() => handleUseAppPromo(shop.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-all ${
                      isLight ? 'bg-slate-50 hover:bg-red-50 border-slate-200 hover:border-red-400' : 'bg-[#251E18] hover:bg-[#322820] border-[#3E3023]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={shop.images[0]} alt={shop.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <h4 className="font-bold text-xs truncate max-w-[170px]">{shop.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{shop.address}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#800020] dark:text-[#D4AF37] px-2.5 py-1 rounded-lg bg-white dark:bg-black/40 border">
                      {t('promotions.selectBtn', 'Chọn →')}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
