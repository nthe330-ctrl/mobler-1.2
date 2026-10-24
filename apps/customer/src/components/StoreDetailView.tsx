import { useState, useMemo, useEffect, type MouseEvent } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Star, MapPin, Share2, Heart, Check, ShieldCheck, Navigation, ExternalLink, Sparkles, X, Coffee as CoffeeIcon, Calendar, CheckCircle2, Armchair, Image as ImageIcon, MessageSquare } from 'lucide-react';
import FreeMap from './FreeMap';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState, AppliedVoucherInfo } from '../App';
import { MOCK_SHOPS, AMENITIES_CONFIG, SPECIAL_MODELS_CONFIG, STYLES_CONFIG } from '@shared/data';
import { CoffeeShop, Review } from '@shared/types';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { getGoogleMapsUrl, openGoogleMaps } from '@shared/utils/googleMapsUrl';
import AiShopIntelDiv from './AiShopIntelDiv';
import { AmenityIcon, ModelIcon, StyleIcon } from './ModelStyleIcons';

interface Props {
  id: string;
  shops?: CoffeeShop[];
  appliedVoucher?: AppliedVoucherInfo;
  hasValidKey?: boolean;
  onNavigate: (view: ViewState) => void;
}

export default function StoreDetailView({ id, shops, appliedVoucher, hasValidKey, onNavigate }: Props) {
  const { theme } = useTheme();
  const { language, t, translateAmenity, translateStyle, translateModel, translateShop, translateMenuItem } = useLanguage();
  // Real menu created by the shop; empty until the shop adds items.
  const [shopMenu, setShopMenu] = useState<any[]>([]);
  useEffect(() => {
    let alive = true;
    api.getShopMenu(String(id)).then(r => alive && setShopMenu(r.items)).catch(() => alive && setShopMenu([]));
    return () => { alive = false; };
  }, [id]);
  const isLight = theme === 'light';

  const getLocalizedCuratorVerdict = (lang: string, shopName: string) => {
    switch (lang) {
      case 'zh-TW':
        return `「${shopName} 是一處獨具特色的精緻咖啡空間，巧妙融合了高品質的醇厚風味、高雅怡人的空間美學以及貼心細緻的待客體驗。」`;
      case 'th':
        return `"${shopName} เป็นพื้นที่ร้านกาแฟสุดพิเศษที่ผสมผสานรสชาติเครื่องดื่มระดับพรีเมียม บรรยากาศตกแต่งที่ประณีต และการบริการที่อบอุ่นสำหรับผู้รักกาแฟ"`;
      case 'en':
        return `"${shopName} is an exceptional coffee destination, harmoniously blending artisan coffee quality, refined interior design, and attentive hospitality for coffee enthusiasts."`;
      case 'vi':
      default:
        return `"${shopName} là không gian cà phê đặc sắc, kết hợp hài hòa giữa hương vị chất lượng, phong cách bài trí tinh tế và trải nghiệm chu đáo cho người yêu cà phê."`;
    }
  };

  // Combine shops from props and MOCK_SHOPS to guarantee finding the requested shop
  const combinedShops = useMemo(() => {
    const list: CoffeeShop[] = [];
    const seenIds = new Set<string>();

    if (shops && shops.length > 0) {
      shops.forEach(s => {
        if (s && s.id && !seenIds.has(s.id)) {
          seenIds.add(s.id);
          list.push(s);
        }
      });
    }

    MOCK_SHOPS.forEach(s => {
      if (s && s.id && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        list.push(s);
      }
    });

    return list;
  }, [shops]);

  const targetId = String(id || '').trim();
  const rawShop = combinedShops.find(s => 
    s.id === targetId || 
    String(s.id).trim() === targetId ||
    (s.placeId && s.placeId === targetId) ||
    (s.slug && s.slug === targetId) ||
    s.name.toLowerCase() === targetId.toLowerCase()
  );
  const shop = rawShop ? translateShop(rawShop) : undefined;

  const [isLiked, setIsLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentHeroPhotoIndex, setCurrentHeroPhotoIndex] = useState(0);
  
  if (!shop) {
    const fallbackSuggestions = combinedShops.slice(0, 3);
    return (
      <div className={`min-h-full flex flex-col p-6 transition-colors duration-300 ${
        isLight ? 'bg-[#FAFBFD] text-slate-800' : 'bg-[#0A0807] text-[#EBE3DB]'
      }`}>
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <button
            onClick={() => onNavigate({ name: 'home' })}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                : 'bg-white/10 hover:bg-white/15 text-[#EBE3DB]'
            }`}
          >
            <ArrowLeft size={16} />
            <span>{t('store.back', 'Quay lại')}</span>
          </button>
          <span className="text-xs font-semibold opacity-60">Mobler Coffee</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto py-8">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
            isLight ? 'bg-red-50 text-[#800020] border border-red-100' : 'bg-white/5 text-[#D4AF37] border border-[#4A3B2C]'
          }`}>
            <CoffeeIcon size={28} />
          </div>

          <h2 className="text-lg font-bold mb-2">
            {t('store.notFoundTitle', 'Không tìm thấy thông tin quán')}
          </h2>
          <p className={`text-xs mb-6 max-w-xs ${isLight ? 'text-slate-500' : 'text-[#A48F7A]'}`}>
            {t('store.notFoundDesc', 'Quán cà phê này có thể vừa đổi thông tin hoặc chưa có trong cơ sở dữ liệu. Hãy thử chọn các quán nổi bật bên dưới:')}
          </p>

          <button
            onClick={() => onNavigate({ name: 'home' })}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 mb-8 ${
              isLight
                ? 'bg-gradient-to-r from-[#800020] to-[#5a0016] text-white hover:opacity-95'
                : 'bg-gradient-to-r from-[#D4AF37] to-[#AA8010] text-black hover:opacity-95'
            }`}
          >
            {t('store.goToExplore', 'Khám phá tất cả các quán')}
          </button>

          {fallbackSuggestions.length > 0 && (
            <div className="w-full text-left">
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 px-1 ${
                isLight ? 'text-slate-400' : 'text-[#A48F7A]'
              }`}>
                {t('store.suggestedShops', 'Gợi ý quán cà phê nổi bật')}
              </p>
              <div className="space-y-2">
                {fallbackSuggestions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onNavigate({ name: 'store', id: s.id })}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all hover:scale-[1.01] ${
                      isLight
                        ? 'bg-white border-slate-200/80 hover:border-red-300 shadow-sm'
                        : 'bg-[#15100C] border-[#2A1F16] hover:border-[#D4AF37]/40'
                    }`}
                  >
                    <img
                      src={s.coverImage || s.images?.[0]}
                      alt={s.name}
                      className="w-12 h-12 rounded-lg object-cover flex-none"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{s.name}</p>
                      <p className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-[#A48F7A]'}`}>
                        {s.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 flex-none">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span>{s.rating > 0 ? s.rating : 'Mới'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const customerImages = shop.reviews.flatMap(r => r.images.map(img => ({ img, review: r })));

  // Fallback coffee aesthetic images if shop has fewer than 3 images
  const fallbackAestheticImages = [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&q=80&w=1200'
  ];

  // Combine unique valid images ensure at least 3+ images available for carousel
  const heroGallery = useMemo(() => {
    const rawList: string[] = [];
    if (shop.coverImage) rawList.push(shop.coverImage);
    if (shop.images && shop.images.length > 0) {
      shop.images.forEach(img => {
        if (img && !rawList.includes(img)) rawList.push(img);
      });
    }
    // Add customer review photos if available
    shop.reviews.forEach(r => {
      r.images.forEach(img => {
        if (img && !rawList.includes(img)) rawList.push(img);
      });
    });
    // If still less than 3 photos, enrich with aesthetic cafe photos
    let fallbackIdx = 0;
    while (rawList.length < 3 && fallbackIdx < fallbackAestheticImages.length) {
      const fb = fallbackAestheticImages[fallbackIdx];
      if (!rawList.includes(fb)) rawList.push(fb);
      fallbackIdx++;
    }
    return rawList;
  }, [shop]);

  // Auto-play infinite roll carousel every 3 seconds (resets to 0 after last photo)
  useEffect(() => {
    if (heroGallery.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroPhotoIndex((prev) => (prev + 1) % heroGallery.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [heroGallery.length]);

  const allImages = heroGallery;

  const cleanPlaceId = shop.id.startsWith('gplace_') 
    ? shop.id.replace('gplace_', '') 
    : shop.id;

  const displayPlaceId = cleanPlaceId.length > 20 
    ? `${cleanPlaceId.slice(0, 18)}...` 
    : cleanPlaceId;

  const currentHeroImage = heroGallery[currentHeroPhotoIndex] || shop.coverImage;

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${
      isLight ? 'bg-[#F8F7F4] text-[#1A1A18]' : 'bg-[#120E0C] text-[#EBE3DB]'
    }`}>
      <div className="min-h-screen lg:h-screen lg:overflow-hidden lg:grid lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_480px]">
        {/* --- LEFT SIDE: HERO PANEL (Full Bleed Editorial Hero on Desktop with Multi-Photo Gallery) --- */}
        <div className="relative h-96 sm:h-[460px] lg:h-full overflow-hidden bg-black flex flex-col justify-between group select-none">
          {/* Active Hero Image with Motion Fade */}
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentHeroPhotoIndex}
              src={currentHeroImage} 
              alt={`${shop.name} photo ${currentHeroPhotoIndex + 1}`}
              initial={{ opacity: 0.3, scale: 1.05 }}
              animate={{ opacity: 0.85, scale: 1 }}
              exit={{ opacity: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover cursor-pointer"
              onClick={() => setActivePhoto(currentHeroImage)}
            />
          </AnimatePresence>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

          {/* Floating Top Nav (Overlay on Hero) */}
          <div className="relative z-20 p-4 sm:p-6 lg:p-8 flex justify-between items-center">
            <button 
              onClick={() => onNavigate({ name: 'home' })}
              className="flex items-center gap-2 font-[Arial,Helvetica,sans-serif] text-xs normal-case font-bold px-3.5 py-2 bg-black/60 backdrop-blur-md text-white border border-white/30 rounded-full hover:bg-white/20 hover:border-white/50 transition-all shadow-sm"
            >
              <ArrowLeft size={14} />
              <span className="font-[Arial,Helvetica,sans-serif] font-bold normal-case">{t('nav.back', 'Quay lại')}</span>
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsLiked(!isLiked)}
                className="p-2.5 bg-black/60 backdrop-blur-md text-white border border-white/30 rounded-full hover:bg-white/20 hover:border-white/50 transition-all shadow-sm"
                title={t('home.share', 'Yêu thích')}
              >
                <Heart size={16} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
              </button>
              <button 
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: shop.name, text: shop.address, url: window.location.href });
                  }
                }}
                className="p-2.5 bg-black/60 backdrop-blur-md text-white border border-white/30 rounded-full hover:bg-white/20 hover:border-white/50 transition-all shadow-sm"
                title={t('home.share', 'Chia sẻ')}
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* Compact Bottom Hero Overlay (Streamlined to expose maximum photo canvas) */}
          <div className="relative z-20 p-4 sm:p-6 lg:p-8 text-white flex flex-col justify-end">
            {/* The photo is the hero; it only needs the one badge a guest actually acts on.
                The concept label and the model/style chips moved out — four stacked chips
                over the image buried the shop's own name. Model and style still appear in
                the body, where there is room to read them. */}
            {shop.isGoogleVerified && (
              <div className="mb-1.5">
                <span className="inline-flex items-center gap-1 bg-[#800020]/90 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider">
                  <ShieldCheck size={10} /> {t('home.verified', 'Đã xác thực')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2.5 mb-1.5 min-w-0 w-full">
              <h1 className="font-['Times_New_Roman',Times,serif] font-bold text-lg xs:text-xl sm:text-2xl lg:text-3xl leading-tight tracking-tight drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1 block">
                {shop.name}
              </h1>

              {/* Minimalist Carousel Progress Dots */}
              {heroGallery.length > 1 && (
                <div className="flex items-center gap-1.5 py-1 shrink-0">
                  {heroGallery.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentHeroPhotoIndex(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        currentHeroPhotoIndex === idx 
                          ? 'w-5 sm:w-6 bg-amber-400' 
                          : 'w-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs opacity-85 max-w-xl mb-2.5 font-light leading-snug flex items-center gap-1.5">
              <MapPin size={13} className="text-red-400 shrink-0" />
              <span className="line-clamp-1">{shop.address}</span>
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-5 font-mono text-[11px] opacity-90 border-t border-white/15 pt-2">
              <span className="flex items-center gap-1 font-bold">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                {shop.rating > 0 ? `${shop.rating} (${shop.reviewCount || shop.reviews.length})` : t('store.noReviewsYet', 'Chưa có đánh giá')}
              </span>
              <span className="font-['Times_New_Roman',Times,serif] text-[11px]">
                {t('store.open', 'Mở cửa')}: {shop.openingHours?.[0]?.time || t('store.notUpdated', 'Chưa cập nhật')}
              </span>
              <span className="text-emerald-400 font-bold">
                {t('store.distanceFromYou', 'Cách bạn')} {shop.distance}
              </span>
            </div>
          </div>
        </div>

        {/* --- RIGHT SIDE: CONTENT PANEL (Scrollable Detail Pane) --- */}
        <div className={`h-full overflow-y-auto flex flex-col ${
          isLight ? 'bg-[#F8F7F4] text-[#1A1A18] border-l border-black/10' : 'bg-[#181310] text-[#EBE3DB] border-l border-white/10'
        }`}>
          {/* Active Voucher Banner */}
          {appliedVoucher && (
            <div className={`m-4 p-4 border rounded-2xl flex items-center justify-between shadow-sm ${
              isLight ? 'bg-emerald-50/90 border-[#2D5337]/30 text-[#2D5337]' : 'bg-[#18261A] border-[#3F593A]/60 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#2D5337] text-white">
                      {appliedVoucher.code}
                    </span>
                    <span className="text-xs font-bold">
                      -{appliedVoucher.discount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-0.5">{appliedVoucher.label}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate({ name: 'booking', id: shop.id, initialVoucher: appliedVoucher })}
                className="font-mono text-[11px] font-bold uppercase px-3.5 py-1.5 rounded-xl bg-[#2D5337] text-white hover:bg-emerald-900 transition-all shadow-sm"
              >
                {t('promotions.useNow', 'Dùng ngay')}
              </button>
            </div>
          )}

          {/* Deep AI Intel Component */}
          <div className="px-4 sm:px-6 mt-4 mb-4">
            <AiShopIntelDiv shop={shop} defaultExpanded={false} />
          </div>

          {/* Environment & Facilities (Compact Tags) */}
          <section className={`p-4 sm:p-5 border-t ${isLight ? 'border-black/10' : 'border-white/10'}`}>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] opacity-60 mb-2.5 flex items-center gap-1.5">
              <Armchair size={13} className="text-emerald-500 shrink-0" />
              <span>{t('store.amenities', 'Tiện ích không gian')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AMENITIES_CONFIG.map((amenity) => {
                const hasAmenity = shop.amenities?.includes(amenity.id);
                if (!hasAmenity) return null;
                return (
                  <div 
                    key={amenity.id}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border flex items-center gap-1.5 transition-colors ${
                      isLight 
                        ? 'bg-white border-black/10 text-[#1A1A18] font-medium shadow-2xs' 
                        : 'bg-[#221A14] border-white/10 text-[#EBE3DB] font-medium'
                    }`}
                  >
                    <AmenityIcon amenity={amenity.id} size={14} className={isLight ? 'text-emerald-700' : 'text-emerald-400'} />
                    <span>{translateAmenity(amenity.name)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Visual Gallery Strip */}
          <section className={`p-6 border-t ${isLight ? 'border-black/10' : 'border-white/10'}`}>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-60 mb-3 flex items-center gap-1.5">
              <ImageIcon size={13} className="text-sky-500 shrink-0" />
              <span>{t('store.photos', 'Hình ảnh không gian')}</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
              {allImages.map((img, idx) => (
                <img 
                  key={idx} 
                  src={img} 
                  alt="" 
                  onClick={() => setActivePhoto(img)}
                  className={`h-24 w-24 object-cover flex-shrink-0 cursor-pointer rounded-xl border hover:scale-105 transition-transform ${
                    isLight ? 'border-black/10' : 'border-white/10'
                  }`} 
                />
              ))}
            </div>
          </section>

          {/* Verified Community Reviews */}
          <section className={`p-6 border-t ${isLight ? 'border-black/10' : 'border-white/10'}`}>
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-60 mb-4 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-amber-500 shrink-0" />
              <span>{t('store.verifiedReviews', 'Đánh giá xác thực')}</span>
            </div>
            <div className="space-y-3">
              {shop.reviews.map((review) => (
                <div key={review.id} className={`p-4 rounded-xl border ${
                  isLight ? 'bg-white border-black/5 shadow-xs' : 'bg-[#221A14] border-white/5'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <img 
                      src={review.userAvatar} 
                      alt={review.userName} 
                      className="w-8 h-8 rounded-full object-cover border border-black/10 dark:border-white/10" 
                    />
                    <div>
                      <p className="font-bold text-xs">{review.userName}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-[#800020] dark:text-[#D4AF37]">
                        {review.userSystemBadge || t('store.verifiedReviewer', 'Verified Reviewer')}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed opacity-80 italic">
                    "{review.content}"
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Location & Navigation */}
          <section className={`p-6 border-t mb-24 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-60 flex items-center gap-1.5">
                <span>📍</span> {t('store.locationMap', 'Vị trí & Bản đồ')}
              </div>
              <a 
                href={getGoogleMapsUrl(shop)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => openGoogleMaps(shop, e)}
                className="font-mono text-[10px] font-bold text-[#800020] dark:text-[#D4AF37] flex items-center gap-1 hover:underline"
              >
                <span>Google Maps</span>
                <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-xs opacity-75 mb-3">{shop.address}</p>

            <div className={`h-44 w-full rounded-2xl border overflow-hidden relative ${
              isLight ? 'border-black/10' : 'border-white/10'
            }`}>
              <FreeMap
                center={{ lat: shop.location?.lat || 10.7769, lng: shop.location?.lng || 106.7009 }}
                zoom={15}
                dark={!isLight}
                markers={shop.location ? [{ id: shop.id, lat: shop.location.lat, lng: shop.location.lng, label: shop.name }] : []}
              />
            </div>
          </section>

          {/* Sticky Footer Actions */}
          <div className={`fixed lg:absolute bottom-0 right-0 w-full lg:w-[450px] xl:w-[480px] p-4 sm:p-5 border-t grid grid-cols-2 gap-3 z-30 ${
            isLight ? 'bg-[#F8F7F4]/95 backdrop-blur-md border-black/10' : 'bg-[#181310]/95 backdrop-blur-md border-white/10'
          }`}>
            <button 
              onClick={() => setShowMenu(true)}
              className={`p-3.5 rounded-xl font-[Arial,Helvetica,sans-serif] text-sm font-bold normal-case tracking-normal border transition-all shadow-xs ${
                isLight 
                  ? 'border-black/20 bg-white text-[#1A1A18] hover:bg-black/5 hover:border-black/30' 
                  : 'border-white/20 bg-[#221A14] text-[#EBE3DB] hover:bg-white/5 hover:border-white/30'
              }`}
            >
              {t('store.viewMenu', 'Thực đơn')}
            </button>
            <button 
              onClick={() => onNavigate({ name: 'booking', id: shop.id, initialVoucher: appliedVoucher })}
              className="p-3.5 rounded-xl font-[Arial,Helvetica,sans-serif] text-sm font-bold normal-case tracking-normal text-white bg-[#800020] hover:bg-[#68001a] active:scale-[0.98] transition-all shadow-sm"
            >
              {appliedVoucher ? `${t('store.bookNow', 'Đặt bàn')} (-${appliedVoucher.discount.toLocaleString('vi-VN')}đ)` : t('store.bookTableNow', 'Đặt bàn ngay')}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Overlay Modal */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in">
          <div className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl ${
            isLight ? 'bg-white border-black/15 text-[#1A1A1A]' : 'bg-[#181310] border-white/15 text-[#EBE3DB]'
          }`}>
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isLight ? 'border-black/10' : 'border-white/10'
            }`}>
              <div className="flex items-center gap-2.5">
                <CoffeeIcon size={20} className="text-[#800020] dark:text-[#D4AF37]" />
                <h2 className="font-['Cormorant_Garamond',serif] font-bold text-2xl">{t('store.menu', 'Thực đơn')} — {shop.name}</h2>
              </div>
              <button 
                onClick={() => setShowMenu(false)}
                className="p-2 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {shopMenu.length === 0 && (
                  <p className="text-sm opacity-70 col-span-full py-8 text-center">{t('store.noMenu', 'Quán chưa cập nhật thực đơn trên Mobler.')}</p>
                )}
                {shopMenu.map(rawItem => {
                  const item = translateMenuItem(rawItem);
                  return (
                  <div 
                    key={item.id} 
                    className={`p-3.5 rounded-xl border flex gap-3 ${
                      isLight ? 'border-black/10 bg-[#F8F7F4]' : 'border-white/10 bg-[#221A14]'
                    }`}
                  >
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg border border-black/10 dark:border-white/10 shrink-0" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs">{item.name}</h4>
                        <p className="text-[10px] opacity-70 line-clamp-2 mt-0.5">{item.description}</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#800020] dark:text-[#D4AF37] mt-1">
                        {item.price.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>

            <div className={`p-4 border-t flex justify-end ${
              isLight ? 'border-black/10' : 'border-white/10'
            }`}>
              <button 
                onClick={() => setShowMenu(false)}
                className="px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase bg-[#800020] text-white hover:bg-[#68001a] transition-all shadow-sm"
              >
                {t('nav.close', 'Đóng')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Photo Zoom Modal */}
      {activePhoto && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setActivePhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={activePhoto} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/20 shadow-2xl" />
            <button 
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/80 text-white border border-white/30 rounded-full hover:bg-black transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
