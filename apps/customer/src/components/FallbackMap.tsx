import { useState } from 'react';
import { MapPin, Navigation, Star, ChevronRight, X, ZoomIn, ZoomOut, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CoffeeShop } from '@shared/types';
import { ViewState } from '../App';

interface FallbackMapProps {
  shops: CoffeeShop[];
  onNavigate: (view: ViewState) => void;
  isAuthFailed?: boolean;
  isBillingError?: boolean;
  onOpenKeyConfig?: () => void;
}

export default function FallbackMap({ 
  shops, 
  onNavigate, 
  isAuthFailed, 
  isBillingError, 
  onOpenKeyConfig 
}: FallbackMapProps) {
  const [selectedShop, setSelectedShop] = useState<CoffeeShop | null>(shops[0] || null);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(true);

  // Normalization for map coordinates centered around HCMC District 1
  // Lat: ~10.77 - 10.78, Lng: ~106.69 - 106.71
  const mapCenter = { lat: 10.7769, lng: 106.7009 };

  const getPinPosition = (shop: CoffeeShop) => {
    const lat = shop.location?.lat || mapCenter.lat;
    const lng = shop.location?.lng || mapCenter.lng;
    
    // Scale coordinates into percentage within the SVG/Canvas map container
    const deltaLat = (lat - mapCenter.lat) * 2000;
    const deltaLng = (lng - mapCenter.lng) * 2000;

    const x = 50 + deltaLng; // center is 50%
    const y = 50 - deltaLat; // lat increases going north (up)

    // Clamp values inside 10% to 90% range
    const clampedX = Math.max(12, Math.min(88, x));
    const clampedY = Math.max(15, Math.min(85, y));

    return { x: clampedX, y: clampedY };
  };

  return (
    <div className="relative w-full h-[320px] bg-[#0E0B09] border-b border-[#4A3B2C] overflow-hidden select-none font-sans">
      {/* Background SVG Styling - Stylized Dark Map Grid & HCMC Landmarks */}
      <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4A3B2C" strokeWidth="0.5" strokeDasharray="2,2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Saigon River SVG Curve */}
        <path 
          d="M -10,280 C 100,240 180,310 280,220 C 350,150 400,180 500,80" 
          fill="none" 
          stroke="#2A3B4D" 
          strokeWidth="24" 
          strokeLinecap="round" 
        />
        <path 
          d="M -10,280 C 100,240 180,310 280,220 C 350,150 400,180 500,80" 
          fill="none" 
          stroke="#1A2733" 
          strokeWidth="16" 
          strokeLinecap="round" 
        />

        {/* Main Avenues / Roads */}
        <line x1="10%" y1="20%" x2="90%" y2="80%" stroke="#3E3023" strokeWidth="4" />
        <line x1="20%" y1="90%" x2="80%" y2="10%" stroke="#3E3023" strokeWidth="3" />
        <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#3E3023" strokeWidth="2" strokeDasharray="6,4" />
        <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="#3E3023" strokeWidth="2" strokeDasharray="6,4" />

        {/* District 1 Road Labels */}
        <text x="15%" y="30%" fill="#7A6450" fontSize="9" fontWeight="bold" letterSpacing="1">Đ. LÊ LỢI</text>
        <text x="60%" y="25%" fill="#7A6450" fontSize="9" fontWeight="bold" letterSpacing="1">Đ. NGUYỄN HUỆ</text>
        <text x="25%" y="75%" fill="#7A6450" fontSize="9" fontWeight="bold" letterSpacing="1">Đ. ĐỒNG KHỞI</text>
        <text x="65%" y="65%" fill="#2A3B4D" fontSize="10" fontWeight="bold" letterSpacing="2">SÔNG SÀI GÒN</text>
      </svg>

      {/* Map Control Overlay */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
        <div className="bg-[#120E0C]/90 backdrop-blur border border-[#4A3B2C] text-[#D4AF37] text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5">
          <Navigation size={12} className="text-[#D4AF37] animate-pulse" />
          <span>Bản đồ Quận 1 ({shops.length} địa điểm)</span>
        </div>
        {onOpenKeyConfig && (
          <button
            type="button"
            onClick={onOpenKeyConfig}
            className="bg-[#120E0C]/90 backdrop-blur border border-[#4A3B2C] hover:border-[#D4AF37] text-[#A48F7A] hover:text-[#EBE3DB] text-[10px] px-2.5 py-1.5 rounded-full font-semibold transition-all shadow-md flex items-center gap-1"
          >
            <span>Cấu hình Maps</span>
          </button>
        )}
      </div>

      {/* Map Controls */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5">
        <button 
          onClick={() => setZoom(prev => Math.min(prev + 0.2, 1.4))}
          className="w-8 h-8 rounded-lg bg-[#120E0C]/90 backdrop-blur border border-[#4A3B2C] flex items-center justify-center text-[#EBE3DB] hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all shadow-md"
        >
          <ZoomIn size={14} />
        </button>
        <button 
          onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.8))}
          className="w-8 h-8 rounded-lg bg-[#120E0C]/90 backdrop-blur border border-[#4A3B2C] flex items-center justify-center text-[#EBE3DB] hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all shadow-md"
        >
          <ZoomOut size={14} />
        </button>
      </div>

      {/* Map Area with Zoom transform */}
      <div 
        className="relative w-full h-full transition-transform duration-300 ease-out"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        {/* Interactive Coffee Shop Pins */}
        {shops.map((shop) => {
          const { x, y } = getPinPosition(shop);
          const isSelected = selectedShop?.id === shop.id;

          return (
            <motion.div
              key={shop.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => setSelectedShop(shop)}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative group flex flex-col items-center">
                {/* Pin Icon */}
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all border-2 ${
                    isSelected 
                      ? 'bg-[#D4AF37] border-white text-[#120E0C] scale-110 shadow-[0_0_20px_rgba(212,175,55,0.8)] z-30' 
                      : 'bg-[#1A1510] border-[#D4AF37] text-[#D4AF37] hover:border-white'
                  }`}
                >
                  <MapPin size={18} className={isSelected ? 'fill-[#120E0C]' : 'fill-[#D4AF37]/20'} />
                </div>

                {/* Mini Shop Badge Label */}
                <span 
                  className={`mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md border ${
                    isSelected 
                      ? 'bg-[#D4AF37] text-[#120E0C] border-white' 
                      : 'bg-[#120E0C]/90 text-[#EBE3DB] border-[#4A3B2C]'
                  }`}
                >
                  {shop.name}
                </span>

                {/* Pulse animation for selected shop */}
                {isSelected && (
                  <span className="absolute -inset-1 rounded-full bg-[#D4AF37]/30 animate-ping pointer-events-none" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Shop Info Card Modal Overlay */}
      <AnimatePresence>
        {selectedShop && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-2 left-2 right-2 z-30 bg-gradient-to-r from-[#1A1510] to-[#120E0C] border border-[#D4AF37] rounded-xl p-3 shadow-[0_8px_25px_rgba(0,0,0,0.9)] backdrop-blur-md"
          >
            <div className="flex gap-3 items-center">
              <img 
                src={selectedShop.coverImage} 
                alt={selectedShop.name} 
                className="w-16 h-16 rounded-lg object-cover border border-[#4A3B2C] shadow"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-[#EBE3DB] truncate">{selectedShop.name}</h4>
                  <button 
                    onClick={() => setSelectedShop(null)}
                    className="text-[#7A6450] hover:text-[#EBE3DB] p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center text-xs text-[#A48F7A] mb-1.5">
                  <MapPin size={12} className="mr-1 text-[#D4AF37]" />
                  <span className="truncate">{selectedShop.address}</span>
                  <span className="mx-1 text-[#4A3B2C]">•</span>
                  <span className="text-[#D4AF37] font-bold">{selectedShop.distance}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-[#120E0C] px-2 py-0.5 rounded border border-[#3E3023]">
                    <Star size={11} className="text-[#D4AF37] fill-[#D4AF37]" />
                    <span className="text-[11px] font-bold text-[#EBE3DB]">{selectedShop.rating}</span>
                  </div>
                  <button 
                    onClick={() => onNavigate({ name: 'store', id: selectedShop.id })}
                    className="text-[11px] font-bold text-[#D4AF37] hover:text-white flex items-center gap-1 bg-[#251E18] px-2.5 py-1 rounded-lg border border-[#4A3B2C] hover:border-[#D4AF37] transition-all"
                  >
                    Chi tiết <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Notice Banner if Auth Failed, Billing Error, or Key Missing */}
      {showInfo && (isAuthFailed || isBillingError) && (
        <div className="absolute top-12 left-2 right-2 z-20 bg-[#1A1510]/95 border border-[#4A3B2C] text-[#A48F7A] p-2 rounded-lg text-[10px] flex items-center justify-between backdrop-blur shadow-md">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Info size={14} className="text-[#D4AF37] flex-shrink-0" />
            <span className="truncate">
              {isBillingError 
                ? 'Đang dùng Bản đồ Vector tương tác (Google Cloud Project chưa kích hoạt thanh toán).' 
                : 'Đang hiển thị bản đồ vector tương tác mượt mà.'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenKeyConfig && (
              <button 
                onClick={onOpenKeyConfig}
                className="text-[#D4AF37] hover:underline font-bold"
              >
                Cấu hình Key
              </button>
            )}
            <button onClick={() => setShowInfo(false)} className="text-[#7A6450] hover:text-[#EBE3DB] p-0.5 ml-1">
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
