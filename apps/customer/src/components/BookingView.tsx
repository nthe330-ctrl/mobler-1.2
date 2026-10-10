import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  CalendarDays, 
  CheckCircle2, 
  X, 
  Coffee, 
  CreditCard, 
  QrCode, 
  Copy, 
  Check, 
  ShieldCheck, 
  ChevronRight, 
  ShoppingBag, 
  Tag, 
  Sparkles, 
  Smartphone, 
  Building2,
  Sliders,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Info,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ViewState, AppliedVoucherInfo } from '../App';
import { MOCK_SHOPS, MOCK_TABLES } from '@shared/data';
import { Table, MenuItem, CoffeeShop } from '@shared/types';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { LanguageControlButton } from './LanguageSelectorModal';
import CalendarPicker from './booking/CalendarPicker';
import ClockTimePicker from './booking/ClockTimePicker';
import InteractiveFloorPlan from './booking/InteractiveFloorPlan';
import { useAuth } from '../context/AuthContext';
import { api, http } from '../services/api';
import { connectRealtime, RealtimeStatus } from '@shared/api/realtime';
import { AvailabilityResponse, isTableFree, toIsoDate } from '@shared/booking';

interface Props {
  id: string;
  shops?: CoffeeShop[];
  initialVoucher?: AppliedVoucherInfo;
  onNavigate: (view: ViewState) => void;
}

export type DrinkSize = 'S' | 'M' | 'L';

export interface DrinkSizeOption {
  id: DrinkSize;
  name: string;
  shortLabel: string;
  volume: string;
  surcharge: number;
  description: string;
  iconScale: string;
}

export const DRINK_SIZES: DrinkSizeOption[] = [
  { 
    id: 'S', 
    name: 'Size S (Nhỏ)', 
    shortLabel: 'Size S', 
    volume: '350ml', 
    surcharge: 0, 
    description: 'Ly vừa vặn tiêu chuẩn',
    iconScale: 'text-xs'
  },
  { 
    id: 'M', 
    name: 'Size M (Vừa)', 
    shortLabel: 'Size M', 
    volume: '500ml', 
    surcharge: 6000, 
    description: 'Phổ biến nhất (+6.000đ)',
    iconScale: 'text-sm'
  },
  { 
    id: 'L', 
    name: 'Size L (Lớn)', 
    shortLabel: 'Size L', 
    volume: '700ml', 
    surcharge: 12000, 
    description: 'Thỏa thích giải khát (+12.000đ)',
    iconScale: 'text-base'
  }
];

export interface CustomCartItem {
  cartId: string;
  menuId: string;
  name: string;
  price: number;
  basePrice: number;
  image: string;
  category: string;
  quantity: number;
  size?: DrinkSize;
  sizeLabel?: string;
  sizeSurcharge?: number;
  ice: string;
  sugar: string;
  note?: string;
}

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const MENU_CATEGORIES = ['Tất cả', 'Cà phê', 'Trà & Trái cây', 'Bánh & Tráng miệng'];

const ICE_OPTIONS = [
  { label: 'Không đá', desc: '0% đá' },
  { label: '30% đá', desc: 'Ít đá' },
  { label: '50% đá', desc: 'Vừa phải' },
  { label: '100% đá', desc: 'Chuẩn vị quán' }
];

const SUGAR_OPTIONS = [
  { label: 'Không đường', desc: '0% đường' },
  { label: 'Ít đường', desc: '30% ngọt nhẹ' },
  { label: 'Nửa đường', desc: '50% thanh mát' },
  { label: 'Bình thường', desc: '100% chuẩn vị' },
  { label: 'Nhiều đường', desc: '120% đậm ngọt' }
];

export default function BookingView({ id, shops, initialVoucher, onNavigate }: Props) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { language, t, translateShop, translateMenuItem } = useLanguage();

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
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[2]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [dateTimeTab, setDateTimeTab] = useState<'both' | 'calendar' | 'clock'>('both');
  
  // Step state: 'booking' -> 'menu' -> 'confirm' -> 'payment' -> 'success'
  const [step, setStep] = useState<'booking' | 'menu' | 'confirm' | 'payment' | 'success'>('booking');
  
  // Detailed Cart with Ice & Sugar Customization
  const [cartItems, setCartItems] = useState<CustomCartItem[]>([]);
  const [menuFilter, setMenuFilter] = useState('Tất cả');
  const [bookingNote, setBookingNote] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number; label: string; type?: string } | null>(
    initialVoucher
      ? { code: initialVoucher.code, discount: initialVoucher.discount, label: initialVoucher.label, type: initialVoucher.type }
      : null
  );
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  
  // Product Detail & Customization Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [customSize, setCustomSize] = useState<DrinkSize>('M');
  const [customIce, setCustomIce] = useState<string>('100% đá');
  const [customSugar, setCustomSugar] = useState<string>('Bình thường');
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [customItemNote, setCustomItemNote] = useState<string>('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'momo' | 'zalopay' | 'card' | 'at_store'>('vietqr');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes countdown
  const [bookingCode, setBookingCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionStage, setSubmissionStage] = useState<number>(1);

  // ---------------- Live availability (real-time) ----------------
  const { isAuthenticated, openAuthModal } = useAuth();
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState<{ code?: string; message: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<RealtimeStatus>('connecting');
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The shop's real menu for pre-ordering drinks (empty if the shop has none).
  const [shopMenu, setShopMenu] = useState<MenuItem[]>([]);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);

  const resolveIsoDate = (dateKey: string) => {
    if (dateKey === 'Today') return toIsoDate(new Date());
    if (dateKey === 'Tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return toIsoDate(d);
    }
    return dateKey;
  };
  const isoDate = resolveIsoDate(selectedDate);
  const shopId = rawShop?.id;

  const loadAvailability = useCallback(async () => {
    if (!shopId) return;
    try {
      const res = await api.getAvailability(shopId, isoDate);
      setAvailability(res);
      setAvailabilityError(
        res.accepting_bookings === false
          ? { code: 'SHOP_PAUSED', message: 'Quán đang tạm ngưng nhận đặt bàn trực tuyến.' }
          : null
      );
    } catch (err: any) {
      setAvailability(null);
      setAvailabilityError({ code: err?.code, message: err?.message || 'Không tải được tình trạng bàn' });
    }
  }, [shopId, isoDate]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    if (!shopId) return;
    let alive = true;
    api.getShopMenu(shopId).then(r => alive && setShopMenu(r.items)).catch(() => alive && setShopMenu([]));
    return () => { alive = false; };
  }, [shopId]);

  // Subscribe to live changes for this shop: other customers booking, staff locking tables...
  const loadRef = useRef(loadAvailability);
  loadRef.current = loadAvailability;
  useEffect(() => {
    if (!shopId) return;
    return connectRealtime({
      watchShops: [shopId],
      onStatus: setLiveStatus,
      onEvent: (event, data) => {
        if (event === 'availability' && data?.shop_id === shopId) loadRef.current();
        if (event === 'ready') loadRef.current();
      }
    });
  }, [shopId]);

  // If the table the customer picked just got taken by someone else, tell them right away.
  useEffect(() => {
    if (!availability || !selectedTable || availability.date !== isoDate) return;
    if (!isTableFree(availability, selectedTable.id, selectedTime)) {
      setLiveNotice(`Bàn T0${selectedTable.id.replace('t', '')} vừa được đặt hoặc khóa lúc ${selectedTime}. Vui lòng chọn bàn hoặc giờ khác.`);
    } else {
      setLiveNotice(null);
    }
  }, [availability, selectedTable, selectedTime, isoDate]);

  const handleCompleteBookingAndVerify = async () => {
    setSubmitError(null);
    if (!isAuthenticated) {
      openAuthModal('login', {
        reason: 'Đăng nhập hoặc tạo tài khoản khách hàng để quán nhận được yêu cầu đặt bàn của bạn.',
        onSuccess: () => submitRef.current()
      });
      return;
    }
    if (!shop) return;

    setIsSubmitting(true);
    setSubmissionStage(1);
    const stage2 = setTimeout(() => setSubmissionStage(2), 700);
    const startedAt = Date.now();

    try {
      const res = await api.createBooking({
        shop_id: shop.id,
        date: isoDate,
        time: selectedTime,
        guests: selectedTable?.seats || 2,
        table_id: selectedTable?.id,
        note: bookingNote || undefined,
        order: cartItems.length > 0 ? {
          items: cartItems.map(c => ({
            name: c.name,
            quantity: c.quantity,
            price: c.price,
            options: `${c.size ? `Size ${c.size} • ` : ''}${c.ice} • ${c.sugar}${c.note ? ` • Ghi chú: ${c.note}` : ''}`,
            image: c.image
          })),
          subtotal: menuSubtotal,
          total: grandTotal
        } : undefined,
        voucher_applied: appliedVoucher || undefined,
        payment_method: paymentMethod,
        deposit_fee: depositFee,
        discount_amount: discountAmount,
        grand_total: grandTotal
      });
      if (res.achievements_unlocked?.length) {
        try {
          sessionStorage.setItem('mobler_new_achievements', JSON.stringify(res.achievements_unlocked));
        } catch { /* ignore */ }
      }
      const wait = Math.max(0, 1400 - (Date.now() - startedAt));
      setTimeout(() => {
        clearTimeout(stage2);
        setSubmissionStage(3);
        setTimeout(() => {
          setIsSubmitting(false);
          onNavigate({ name: 'bookings', highlightBookingId: res.booking.id });
        }, 700);
      }, wait);
    } catch (err: any) {
      clearTimeout(stage2);
      setIsSubmitting(false);
      if (err?.status === 401) {
        openAuthModal('login', { reason: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', onSuccess: () => submitRef.current() });
        return;
      }
      if (err?.code === 'SLOT_TAKEN' || err?.code === 'FULLY_BOOKED') {
        if (err.data?.availability) setAvailability(err.data.availability);
        setSelectedTable(null);
        setStep('booking');
      }
      setSubmitError(err?.message || 'Đặt bàn thất bại, vui lòng thử lại');
    }
  };
  const submitRef = useRef(handleCompleteBookingAndVerify);
  submitRef.current = handleCompleteBookingAndVerify;

  useEffect(() => {
    const randomCode = 'CF' + Math.floor(1000 + Math.random() * 9000);
    setBookingCode(randomCode);
  }, []);

  // Countdown timer for payment step
  useEffect(() => {
    if (step !== 'payment') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  if (!shop) {
    return (
      <div className={`p-8 text-center ${isLight ? 'text-slate-700' : 'text-[#A48F7A]'}`}>
        <p className="text-base font-bold mb-4">{t('booking.shopNotFound', 'Không tìm thấy thông tin quán.')}</p>
        <button 
          onClick={() => onNavigate({ name: 'home' })}
          className="px-4 py-2 rounded-xl bg-[#800020] text-white font-bold text-sm"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const isTableAvailable = (tableId: string, date: string, time: string) => {
    if (!availability) return !availabilityError;
    // Availability is loaded per day; for a different day assume free until it loads.
    if (availability.date !== resolveIsoDate(date)) return true;
    return isTableFree(availability, tableId, time);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (dateStr === 'Today') return t('booking.today', 'Hôm nay');
    if (dateStr === 'Tomorrow') return t('booking.tomorrow', 'Ngày mai');
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const totalItemCount: number = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const menuSubtotal: number = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const depositFee = 20000;
  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const grandTotal = Math.max(0, menuSubtotal + depositFee - discountAmount);

  const formatCurrency = (val: number) => val.toLocaleString('vi-VN') + 'đ';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const translatedMenu = useMemo(() => shopMenu.map(translateMenuItem), [language, shopMenu]);

  const filteredMenuItems = translatedMenu.filter(item => {
    if (menuFilter === 'Tất cả' || menuFilter === t('booking.allMenu', 'Tất cả')) return true;
    if (menuFilter === 'Cà phê' || menuFilter === t('booking.coffeeCategory', 'Cà phê')) return item.category === 'Cà phê' || item.category === 'Coffee' || item.category === '咖啡' || item.category === 'กาแฟ';
    if (menuFilter === 'Trà & Trái cây' || menuFilter === t('booking.teaCategory', 'Trà & Trái cây')) return item.category === 'Trà & Trái cây' || item.category === 'Tea & Fruits' || item.category === '茶與水果茶' || item.category === 'ชาและผลไม้';
    if (menuFilter === 'Bánh & Tráng miệng' || menuFilter === t('booking.bakeryCategory', 'Bánh & Tráng miệng')) return item.category === 'Bánh & Tráng miệng' || item.category === 'Pastry & Dessert' || item.category === '烘焙甜點' || item.category === 'เบเกอรี่และของหวาน';
    return true;
  });

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isBogoActive = appliedVoucher?.code === 'MORNINGCOFFEE' || appliedVoucher?.type === 'BOGO';

  const [voucherError, setVoucherError] = useState<string | null>(null);
  const handleApplyVoucher = async () => {
    const code = voucherCodeInput.trim().toUpperCase();
    if (!code) return;
    setVoucherError(null);
    try {
      // Checked by the server: shop vouchers, Mobler promos and your own reward vouchers.
      const res = await api.validateVoucher(code, shop?.id, menuSubtotal + depositFee);
      setAppliedVoucher({ code: res.voucher.code, discount: res.calculatedDiscount, label: `${res.voucher.title} -${res.calculatedDiscount.toLocaleString('vi-VN')}đ`, type: 'DISCOUNT' });
      setShowVoucherInput(false);
      setVoucherCodeInput('');
    } catch (err: any) {
      setVoucherError(err?.message || 'Mã không hợp lệ');
    }
  };

  // Open item customization modal (New or Edit)
  const openItemModal = (item: MenuItem, existingCartItem?: CustomCartItem) => {
    setCustomizingItem(item);
    if (existingCartItem) {
      setEditingCartId(existingCartItem.cartId);
      setCustomSize(existingCartItem.size || 'M');
      setCustomIce(existingCartItem.ice);
      setCustomSugar(existingCartItem.sugar);
      setCustomQuantity(existingCartItem.quantity);
      setCustomItemNote(existingCartItem.note || '');
    } else {
      setEditingCartId(null);
      setCustomSize('M'); // Default size M for drinks
      setCustomIce('100% đá');
      setCustomSugar('Bình thường');
      // If BOGO promo is active and item is eligible, default 1 converts to 2 (Buy 1 Get 1)
      const isEligibleForBogo = isBogoActive && (item.isBogoEligible || item.category === 'Cà phê');
      setCustomQuantity(isEligibleForBogo ? 2 : 1);
      setCustomItemNote(isEligibleForBogo ? 'Áp dụng Mua 1 Tặng 1 (Nhận 2 ly)' : '');
    }
  };

  // Save customized item to cart
  const handleSaveCustomItem = () => {
    if (!customizingItem) return;

    const isBakery = customizingItem.category.includes('Bánh');
    const finalSize: DrinkSize | undefined = isBakery ? undefined : customSize;
    const sizeConfig = DRINK_SIZES.find(s => s.id === finalSize) || DRINK_SIZES[0];
    const sizeSurcharge = isBakery ? 0 : sizeConfig.surcharge;
    const finalUnitPrice = customizingItem.price + sizeSurcharge;
    const finalSizeLabel = isBakery ? undefined : sizeConfig.name;
    const finalIce = isBakery ? 'Không đá' : customIce;
    const finalSugar = isBakery ? 'Bình thường' : customSugar;

    if (editingCartId) {
      // Update existing item
      setCartItems(prev => prev.map(item => {
        if (item.cartId === editingCartId) {
          return {
            ...item,
            size: finalSize,
            sizeLabel: finalSizeLabel,
            sizeSurcharge: sizeSurcharge,
            basePrice: customizingItem.price,
            price: finalUnitPrice,
            quantity: customQuantity,
            ice: finalIce,
            sugar: finalSugar,
            note: customItemNote.trim()
          };
        }
        return item;
      }));
    } else {
      // Add new item (or merge if same options exist)
      const sizeKey = finalSize || 'NONE';
      const cartKey = `${customizingItem.id}_${sizeKey}_${finalIce}_${finalSugar}_${customItemNote.trim()}`;
      
      setCartItems(prev => {
        const existingIdx = prev.findIndex(item => item.cartId === cartKey);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx].quantity += customQuantity;
          return next;
        } else {
          return [
            ...prev,
            {
              cartId: cartKey,
              menuId: customizingItem.id,
              name: customizingItem.name,
              basePrice: customizingItem.price,
              price: finalUnitPrice,
              size: finalSize,
              sizeLabel: finalSizeLabel,
              sizeSurcharge: sizeSurcharge,
              image: customizingItem.image,
              category: customizingItem.category,
              quantity: customQuantity,
              ice: finalIce,
              sugar: finalSugar,
              note: customItemNote.trim()
            }
          ];
        }
      });
    }

    setCustomizingItem(null);
  };

  const handleRemoveCartItem = (cartId: string) => {
    setCartItems(prev => prev.filter(item => item.cartId !== cartId));
  };

  const getItemCountInCart = (menuId: string) => {
    return cartItems.filter(item => item.menuId === menuId).reduce((sum, i) => sum + i.quantity, 0);
  };

  return (
    <div className={`flex flex-col min-h-full pb-28 transition-colors duration-300 ${isLight ? 'bg-[#F0F3F7]' : 'bg-[#120E0C]'}`}>
      {/* Top Header */}
      <div className={`border-b px-4 py-3.5 sticky top-0 z-30 shadow-sm transition-all ${
        isLight 
          ? 'bg-white/95 backdrop-blur-md border-red-200 text-[#1E1B18]' 
          : 'bg-[#120E0C]/95 backdrop-blur-md border-[#3E3023] text-[#EBE3DB]'
      }`}>
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => {
              if (step === 'menu') setStep('booking');
              else if (step === 'confirm') {
                if (totalItemCount > 0) setStep('menu');
                else setStep('booking');
              }
              else if (step === 'payment') setStep('confirm');
              else onNavigate({ name: 'store', id });
            }} 
            className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${
              isLight ? 'bg-slate-100 border-red-200 text-[#800020] hover:bg-red-50' : 'bg-[#1A1510] border-[#4A3B2C] text-white hover:bg-[#251E18]'
            }`}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="text-center">
            <h1 className="text-sm md:text-base font-bold truncate max-w-[200px] md:max-w-md">
              {step === 'booking' && `1. ${t('booking.step1', 'Chọn bàn & Giờ')}`}
              {step === 'menu' && `2. ${t('booking.step2', 'Chọn món trước')}`}
              {step === 'confirm' && `3. ${t('booking.step3', 'Xác nhận đặt bàn')}`}
              {step === 'payment' && `4. ${t('booking.step4', 'Thanh toán')}`}
              {step === 'success' && t('booking.success', 'Thành công')}
            </h1>
            <p className={`text-[10px] md:text-xs truncate max-w-[200px] md:max-w-md ${isLight ? 'text-red-900 font-semibold' : 'text-[#D4AF37]'}`}>
              {shop.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {step !== 'success' && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                isLight ? 'bg-red-100 text-[#800020]' : 'bg-[#251E18] text-[#D4AF37]'
              }`}>
                {step === 'booking' && '1/4'}
                {step === 'menu' && '2/4'}
                {step === 'confirm' && '3/4'}
                {step === 'payment' && '4/4'}
              </span>
            )}
            <LanguageControlButton variant="badge" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 md:p-6 flex-1 w-full max-w-4xl mx-auto">
        {/* Auto-applied Voucher Banner notice if applied */}
        {appliedVoucher && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-600 shrink-0" />
              <div className="text-left">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  Đang kích hoạt ưu đãi: {appliedVoucher.code} (-{appliedVoucher.discount.toLocaleString('vi-VN')}đ)
                </span>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  Khuyến mãi tự động khấu trừ trực tiếp khi thanh toán
                </p>
              </div>
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider shrink-0">
              Đã áp dụng
            </span>
          </div>
        )}
        
        {/* ================= LIVE STATUS & ERRORS ================= */}
        <div className="space-y-2 mb-4">
          {availabilityError ? (
            <div role="alert" className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs bg-amber-50 text-amber-900 border-amber-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>
                {availabilityError.code === 'SHOP_NOT_PARTNER'
                  ? 'Quán này chưa dùng Mobler Shop nên chưa nhận đặt bàn trực tuyến. Bạn vẫn có thể xem thông tin và gọi điện cho quán.'
                  : availabilityError.message}
              </span>
            </div>
          ) : (
            <div className={`flex items-center justify-between rounded-xl border px-3 py-2 text-[11px] font-semibold ${
              isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#18130F] border-[#3E3023] text-[#A48F7A]'
            }`}>
              <span className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${liveStatus === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                {liveStatus === 'live' ? 'Tình trạng bàn cập nhật trực tiếp' : 'Đang kết nối cập nhật trực tiếp…'}
              </span>
              {availability && (
                <span>{availability.tables.filter(tb => isTableFree(availability, tb.id, selectedTime)).length}/{availability.tables.length} bàn trống lúc {selectedTime}</span>
              )}
            </div>
          )}
          {liveNotice && step !== 'booking' && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs bg-rose-50 text-rose-700 border-rose-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{liveNotice}</span>
            </div>
          )}
          {submitError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs bg-rose-50 text-rose-700 border-rose-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span className="flex-1">{submitError}</span>
              <button type="button" onClick={() => setSubmitError(null)} aria-label={t('common.close', 'Đóng')}><X size={14} /></button>
            </div>
          )}
        </div>

        {/* ================= STEP 1: BOOKING ================= */}
        {step === 'booking' && (
          <div className="animate-in fade-in slide-in-from-right-3 space-y-5">
            {/* View Switcher Tabs: Calendar / Clock / Both */}
            <div className={`p-1.5 rounded-2xl border flex items-center gap-1 text-xs font-bold transition-all ${
              isLight 
                ? 'bg-red-50/80 border-red-200 shadow-sm' 
                : 'bg-[#18130F] border-[#3E3023]'
            }`}>
              <button
                type="button"
                onClick={() => setDateTimeTab('both')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  dateTimeTab === 'both'
                    ? isLight 
                      ? 'bg-white text-[#800020] shadow-sm font-extrabold' 
                      : 'bg-gradient-to-r from-[#8B6E4E] to-[#5C452E] text-white shadow-sm'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#A48F7A] hover:text-[#EBE3DB]'
                }`}
              >
                <span>⚡</span>
                <span className="truncate">{t('booking.dateTimeTabs', 'Lịch & Giờ hẹn')}</span>
              </button>

              <button
                type="button"
                onClick={() => setDateTimeTab('calendar')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  dateTimeTab === 'calendar'
                    ? isLight 
                      ? 'bg-white text-[#800020] shadow-sm font-extrabold' 
                      : 'bg-gradient-to-r from-[#8B6E4E] to-[#5C452E] text-white shadow-sm'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#A48F7A] hover:text-[#EBE3DB]'
                }`}
              >
                <CalendarDays size={14} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
                <span className="truncate">{t('booking.calendarTab', 'Lịch ngày')}: {formatDateDisplay(selectedDate)}</span>
              </button>

              <button
                type="button"
                onClick={() => setDateTimeTab('clock')}
                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  dateTimeTab === 'clock'
                    ? isLight 
                      ? 'bg-white text-[#800020] shadow-sm font-extrabold' 
                      : 'bg-gradient-to-r from-[#8B6E4E] to-[#5C452E] text-white shadow-sm'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-[#A48F7A] hover:text-[#EBE3DB]'
                }`}
              >
                <Clock size={14} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
                <span className="truncate">{t('booking.clockTab', 'Đồng hồ')}: {selectedTime}</span>
              </button>
            </div>

            {/* Date & Time Components */}
            <div className={`grid gap-4 ${dateTimeTab === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {(dateTimeTab === 'both' || dateTimeTab === 'calendar') && (
                <div className="w-full">
                  <CalendarPicker
                    selectedDate={selectedDate}
                    onSelectDate={(dateKey) => {
                      setSelectedDate(dateKey);
                      if (selectedTable && !isTableAvailable(selectedTable.id, dateKey, selectedTime)) {
                        setSelectedTable(null);
                      }
                    }}
                    isLight={isLight}
                  />
                </div>
              )}

              {(dateTimeTab === 'both' || dateTimeTab === 'clock') && (
                <div className="w-full">
                  <ClockTimePicker
                    selectedTime={selectedTime}
                    onSelectTime={(time) => setSelectedTime(time)}
                    isTableAvailable={(time) => selectedTable ? isTableAvailable(selectedTable.id, selectedDate, time) : true}
                    isLight={isLight}
                  />
                </div>
              )}
            </div>

            {/* Interactive Floor Plan with Tables and Chairs */}
            <div>
              <InteractiveFloorPlan
                tables={MOCK_TABLES}
                selectedTable={selectedTable}
                onSelectTable={(table) => setSelectedTable(table)}
                selectedDate={formatDateDisplay(selectedDate)}
                selectedTime={selectedTime}
                isTableAvailable={isTableAvailable}
                isLight={isLight}
              />
            </div>

            {/* Selected Table Detail Card */}
            {selectedTable && (() => {
              const isAvailable = isTableAvailable(selectedTable.id, selectedDate, selectedTime);
              return (
                <div className={`rounded-2xl p-4 border relative overflow-hidden animate-in slide-in-from-bottom-3 ${
                  !isAvailable
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-2 border-rose-500 shadow-md'
                    : isLight 
                      ? 'bg-white border-2 border-red-600 shadow-md' 
                      : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#D4AF37]'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${
                      !isAvailable
                        ? 'text-rose-600 dark:text-rose-400'
                        : isLight ? 'text-[#800020]' : 'text-[#D4AF37]'
                    }`}>
                      {!isAvailable ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                      {t('booking.tableSelectedPrefix', 'Bàn đã chọn')} (T0{selectedTable.id.replace('t', '')})
                    </h3>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      !isAvailable
                        ? 'bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}>
                      {!isAvailable ? t('booking.occupiedThisHour', 'Đã kín giờ này') : t('booking.tableFree', 'Bàn trống')}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <img src={selectedTable.photo} alt="Table view" className="w-20 h-20 rounded-xl object-cover border border-red-200" />
                    <div className="flex-1">
                      <p className={`font-bold text-xs mb-1.5 ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
                        {selectedTable.seats} {t('booking.seats', 'Chỗ ngồi')} • {selectedTable.type === 'sofa' ? t('booking.sofaComfort', 'Khu vực Sofa êm ái') : t('booking.seatsStandard', 'Bàn tiêu chuẩn')}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-900 border border-red-200">
                          {t('booking.quietCorner', 'Góc yên tĩnh')}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-900 border border-red-200">
                          {t('booking.nearPowerOutlet', 'Gần ổ cắm điện')}
                        </span>
                      </div>
                      <div className={`px-2.5 py-1 inline-flex text-xs font-bold rounded-lg ${
                        !isAvailable
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : isLight ? 'bg-red-100 text-[#800020]' : 'bg-[#1A1510] text-[#D4AF37] border border-[#3E3023]'
                      }`}>
                        {formatDateDisplay(selectedDate)} lúc {selectedTime}
                      </div>
                    </div>
                  </div>
                  {!isAvailable && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
                      <AlertCircle size={14} className="shrink-0 text-rose-500" />
                      <span>{t('booking.slotUnavailable', 'Bàn bạn đang chọn đã kín vào lúc ' + selectedTime + '. Vui lòng đổi giờ hoặc chọn bàn khác.')}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= STEP 2: MENU (CHỌN MÓN TRƯỚC VỚI TÙY BIẾN ĐÁ/ĐƯỜNG) ================= */}
        {step === 'menu' && (
          <div className="animate-in fade-in slide-in-from-right-3 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-base font-bold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                  {t('booking.preorderMenu', 'Thực đơn chọn trước')}
                </h2>
                <p className="text-xs text-slate-500">{t('booking.preorderMenuDesc', 'Nhấn vào món để xem mô tả và tùy chỉnh mức đá & đường')}</p>
              </div>
              {totalItemCount > 0 && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  isLight ? 'bg-red-100 text-[#800020]' : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                }`}>
                  {t('booking.itemsSelectedCount', `Đã chọn ${totalItemCount} món`).replace('{count}', totalItemCount.toString())}
                </span>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {MENU_CATEGORIES.map(cat => {
                const catLabel = cat === 'Tất cả' ? t('booking.catAll', 'Tất cả')
                  : cat === 'Cà phê' ? t('booking.catCoffee', 'Cà phê')
                  : cat === 'Trà & Trái cây' ? t('booking.catTea', 'Trà & Trái cây')
                  : cat === 'Bánh & Tráng miệng' ? t('booking.catBakery', 'Bánh & Tráng miệng')
                  : cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setMenuFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                      menuFilter === cat 
                        ? isLight ? 'bg-[#800020] text-white border-[#800020]' : 'bg-[#D4AF37] text-black border-[#D4AF37]' 
                        : isLight ? 'bg-white text-slate-700 border-red-200 hover:border-red-400' : 'bg-[#1A1510] text-[#A48F7A] border-[#3E3023]'
                    }`}
                  >
                    {catLabel}
                  </button>
                );
              })}
            </div>

            {/* Special BOGO promotion info banner in Menu step */}
            {isBogoActive && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 border-2 border-amber-500/40 flex items-start gap-3 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-black font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                  1+1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    Đang kích hoạt Mua 1 Tặng 1: {appliedVoucher?.code}
                  </h4>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-400/90 mt-0.5 leading-relaxed">
                    Chọn các món gắn nhãn <strong className="text-red-700 dark:text-amber-300 font-bold bg-amber-200/60 dark:bg-black/40 px-1 rounded">Mua 1 Tặng 1</strong> {t('booking.bogoAuto', 'sẽ tự động nhận')} <strong>2 ly</strong> và được tặng 100% giá trị ly thứ 2 khi thanh toán!
                  </p>
                </div>
              </div>
            )}

            {/* Selected Items summary strip if any */}
            {cartItems.length > 0 && (
              <div className={`p-3 rounded-2xl border space-y-2 ${
                isLight ? 'bg-amber-50/70 border-amber-200' : 'bg-[#1E1712] border-[#4A3B2C]'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold flex items-center gap-1.5 ${
                    isLight ? 'text-amber-900' : 'text-[#D4AF37]'
                  }`}>
                    <ShoppingBag size={14} /> Món đang chọn trong giỏ ({totalItemCount}):
                  </span>
                  <button 
                    onClick={() => setCartItems([])}
                    className="text-[11px] text-slate-400 hover:text-red-500 font-semibold"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {cartItems.map(cItem => (
                    <div 
                      key={cItem.cartId}
                      onClick={() => {
                        const original = shopMenu.find(m => m.id === cItem.menuId);
                        if (original) openItemModal(original, cItem);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 shrink-0 cursor-pointer shadow-sm ${
                        isLight ? 'bg-white border-amber-300' : 'bg-[#251E18] border-[#3E3023]'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-red-100 text-[#800020] text-[10px] font-bold flex items-center justify-center">
                        {cItem.quantity}
                      </span>
                      <div className="text-left">
                        <p className={`text-xs font-bold truncate max-w-[120px] ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {cItem.name}
                        </p>
                        <p className="text-[9px] text-slate-500">
                          {cItem.sizeLabel ? `Size ${cItem.size || 'M'} • ` : ''}{cItem.ice} • {cItem.sugar}
                        </p>
                      </div>
                      <Edit2 size={12} className="text-slate-400 ml-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items List */}
            <div className="space-y-3">
              {shopMenu.length === 0 && (
                <p className={`col-span-full text-center text-sm py-8 ${isLight ? 'text-slate-500' : 'text-[#A48F7A]'}`}>
                  Quán chưa cập nhật thực đơn. Bạn có thể bỏ qua bước gọi món trước và chọn món tại quán.
                </p>
              )}
              {filteredMenuItems.map(item => {
                const count = getItemCountInCart(item.id);
                const isBakery = item.category.includes('Bánh');
                const isBogoItem = isBogoActive && (item.isBogoEligible || item.category === 'Cà phê');

                return (
                  <div 
                    key={item.id} 
                    onClick={() => openItemModal(item)}
                    className={`border rounded-2xl p-3.5 flex gap-3.5 transition-all cursor-pointer group relative overflow-hidden ${
                      isLight 
                        ? count > 0 
                          ? 'bg-white border-2 border-red-600 shadow-md ring-2 ring-red-100' 
                          : 'bg-white border-red-200 hover:border-red-400 shadow-sm' 
                        : count > 0 
                          ? 'bg-[#1E1813] border border-[#D4AF37] shadow-md' 
                          : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C] hover:border-[#6B533E]'
                    }`}
                  >
                    {isBogoItem && (
                      <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-red-600 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-bl-xl shadow-xs flex items-center gap-1 z-10 uppercase tracking-wider">
                        <Sparkles size={10} /> Mua 1 Tặng 1 (Nhận 2)
                      </div>
                    )}

                    <div className="relative w-24 h-24 shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full rounded-2xl object-cover border border-red-100" 
                      />
                      {count > 0 && (
                        <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-[#800020] text-white text-xs font-bold flex items-center justify-center shadow-md border-2 border-white">
                          {count}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h3 className={`font-bold text-sm ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'} group-hover:text-[#800020] transition-colors`}>
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Customization tags preview */}
                      {!isBakery && (
                        <div className="flex items-center flex-wrap gap-1.5 text-[9px] text-slate-400 mt-1">
                          {isBogoItem && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">
                              🎁 Mua 1 = Nhận 2
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#251E18] text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-[#3E3023]">
                            🥤 Size S / M / L
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#251E18] border border-slate-200 dark:border-[#3E3023]">
                            🧊 Tùy chọn đá
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#251E18] border border-slate-200 dark:border-[#3E3023]">
                            🍯 Mức đường
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-100 dark:border-[#251E18]">
                        <p className={`font-bold text-sm ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                          {item.price.toLocaleString('vi-VN')}đ
                        </p>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openItemModal(item);
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                            isLight 
                              ? count > 0 
                                ? 'bg-red-50 text-[#800020] border border-red-300' 
                                : 'bg-[#800020] text-white shadow-sm hover:bg-[#6B0D1B]' 
                              : count > 0 
                                ? 'bg-[#251E18] text-[#D4AF37] border border-[#D4AF37]' 
                                : 'bg-[#D4AF37] text-black font-bold'
                          }`}
                        >
                          <Sliders size={13} />
                          <span>{count > 0 ? `${t('booking.customizeBtn', 'Tùy chọn')} (${count})` : t('booking.selectItemBtn', 'Chọn món')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 3: CONFIRM ================= */}
        {step === 'confirm' && (
          <div className="animate-in fade-in slide-in-from-right-3 space-y-4">
            <h2 className={`text-base font-bold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
              {t('booking.checkBookingDetails', 'Kiểm tra thông tin đặt bàn')}
            </h2>

            {/* Store & Table details card */}
            <div className={`rounded-2xl p-4 border ${
              isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
            }`}>
              <div className="flex justify-between items-start mb-3 pb-3 border-b border-dashed border-red-200 dark:border-[#3E3023]">
                <div>
                  <h3 className={`font-bold text-sm ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>{shop.name}</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[220px]">{shop.address}</p>
                </div>
                <button 
                  onClick={() => setStep('booking')} 
                  className={`text-xs font-bold underline ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}
                >
                  {t('booking.changeBtn', 'Thay đổi')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t('booking.tableLocation', 'Vị trí bàn')}</p>
                  <p className={`font-bold text-sm ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
                    {selectedTable ? `${t('booking.table', 'Bàn')} T0${selectedTable.id.replace('t', '')} (${selectedTable.seats} ${t('booking.seats', 'chỗ')})` : t('booking.tableDefault', 'Bàn tự chọn')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t('booking.arrivalTime', 'Thời gian đến')}</p>
                  <p className={`font-bold text-sm ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                    {selectedTime} • {formatDateDisplay(selectedDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Ordered Menu Review with Ice & Sugar Breakdown */}
            <div className={`rounded-2xl p-4 border ${
              isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Coffee size={16} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
                  <h3 className={`font-bold text-xs uppercase tracking-wider ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
                    {t('booking.selectedItemsReview', 'Món đã chọn')} ({totalItemCount})
                  </h3>
                </div>
                <button 
                  onClick={() => setStep('menu')} 
                  className={`text-xs font-bold underline ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}
                >
                  {totalItemCount > 0 ? t('booking.addOrEditItems', 'Thêm / Sửa món') : `+ ${t('booking.selectItemBtn', 'Chọn món')}`}
                </button>
              </div>

              {cartItems.length > 0 ? (
                <div className="space-y-3 mb-2">
                  {cartItems.map((item) => {
                    const isBakery = item.category.includes('Bánh');
                    return (
                      <div key={item.cartId} className="flex justify-between items-start text-xs py-2 border-b border-slate-100 dark:border-[#251E18] last:border-none">
                        <div className="flex gap-2.5">
                          <span className="font-bold px-2 py-0.5 rounded-lg bg-red-100 text-[#800020] text-xs h-fit shrink-0">
                            {item.quantity}x
                          </span>
                          <div>
                            <p className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-[#EBE3DB]'}`}>
                              {item.name}
                            </p>
                            {!isBakery && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {item.size && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-[#800020] dark:bg-[#302114] dark:text-[#D4AF37] font-bold border border-red-200 dark:border-[#523820]">
                                    🥤 {item.sizeLabel || `Size ${item.size}`}
                                  </span>
                                )}
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                  🧊 {item.ice}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                                  🍯 {item.sugar}
                                </span>
                              </div>
                            )}
                            {item.note && (
                              <p className="text-[10px] text-slate-500 italic mt-1">
                                ✎ Ghi chú: {item.note}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <span className={`font-bold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                          </span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const orig = shopMenu.find(m => m.id === item.menuId);
                                if (orig) openItemModal(orig, item);
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-700 underline"
                            >
                              Sửa
                            </button>
                            <button 
                              onClick={() => handleRemoveCartItem(item.cartId)}
                              className="text-[10px] text-red-400 hover:text-red-600"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-1">
                  Chưa chọn món trước (Bạn có thể gọi trực tiếp tại quầy khi đến quán).
                </p>
              )}
            </div>

            {/* Voucher & Promotion */}
            <div className={`rounded-2xl p-4 border ${
              isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Tag size={16} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
                  <span className={`text-xs font-bold ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>{t('booking.voucherSection', 'Mã giảm giá / Voucher')}</span>
                </div>
                <button 
                  onClick={() => setShowVoucherInput(!showVoucherInput)} 
                  className={`text-xs font-bold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}
                >
                  {showVoucherInput ? t('common.close', 'Đóng') : 'Nhập mã'}
                </button>
              </div>

              {appliedVoucher ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{appliedVoucher.code}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{appliedVoucher.label}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setAppliedVoucher(null)} 
                    className="text-xs text-slate-400 hover:text-red-600 px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : showVoucherInput ? (
                <div className="flex gap-2 mt-2">
                  <input 
                    type="text" 
                    placeholder={t('booking.voucherPlaceholder', 'Nhập mã (VIP50, MORNINGCOFFEE...)')} 
                    value={voucherCodeInput}
                    onChange={(e) => setVoucherCodeInput(e.target.value)}
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border uppercase font-bold focus:outline-none ${
                      isLight ? 'bg-slate-50 border-red-300 focus:border-red-600' : 'bg-[#120E0C] border-[#3E3023] text-white'
                    }`}
                  />
                  <button 
                    onClick={handleApplyVoucher}
                    className="px-3.5 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold"
                  >
                    Áp dụng
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">{t('booking.voucherHint', 'Chạm "Nhập mã" để áp dụng ưu đãi của bạn (kể cả voucher thưởng thành tựu)')}</p>
              )}
              {voucherError && <p role="alert" className="text-[11px] text-rose-600 mt-1.5">{voucherError}</p>}
            </div>

            {/* Note input for shop */}
            <div>
              <h3 className={`font-bold text-xs mb-1.5 ${isLight ? 'text-slate-800' : 'text-[#EBE3DB]'}`}>
                Ghi chú cho quán khi đến nhận bàn (Tùy chọn)
              </h3>
              <textarea 
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder={t('booking.notePlaceholder', 'Ví dụ: Giữ bàn cạnh cửa sổ, có mang theo laptop làm việc...')}
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none ${
                  isLight ? 'bg-white border-red-300 text-slate-800 focus:border-red-600' : 'bg-[#1A1510] border-[#3E3023] text-[#EBE3DB]'
                }`}
                rows={2}
              />
            </div>

            {/* Price breakdown */}
            <div className={`rounded-2xl p-4 border space-y-2 text-xs ${
              isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
            }`}>
              <div className="flex justify-between text-slate-500">
                <span>{t('booking.itemsTotal', 'Tiền món')} ({totalItemCount} {t('booking.itemsUnit', 'món')})</span>
                <span>{formatCurrency(menuSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t('booking.depositFee', 'Phí đặt cọc giữ bàn')}</span>
                <span>{formatCurrency(depositFee)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles size={13} />
                    {isBogoActive ? `${t('promotions.bogoBadge', 'Mua 1 Tặng 1')} (${appliedVoucher?.code})` : `${t('booking.discountAmount', 'Ưu đãi giảm giá')} (${appliedVoucher?.code})`}
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className={`flex justify-between items-center pt-2 border-t font-bold text-sm ${
                isLight ? 'border-red-100 text-[#1E1B18]' : 'border-[#3E3023] text-[#EBE3DB]'
              }`}>
                <span>{t('booking.grandTotal', 'Tổng thanh toán')}</span>
                <span className={`text-base font-bold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PAYMENT ================= */}
        {step === 'payment' && (
          <div className="animate-in fade-in slide-in-from-right-3 space-y-4">
            {/* Top countdown banner */}
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-700 dark:text-amber-400 animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{t('booking.countdownHolding', 'Đang giữ chỗ cho bạn')}</p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400">{t('booking.countdownDesc', 'Vui lòng hoàn tất thanh toán trước khi hết hạn')}</p>
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-amber-900 dark:text-amber-200 bg-white/80 dark:bg-black/40 px-2.5 py-1 rounded-lg border border-amber-300">
                {formatCountdown(timeLeft)}
              </span>
            </div>

            {/* Total Amount Card */}
            <div className={`p-4 rounded-2xl border ${
              isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
            }`}>
              <div className="text-center pb-3 border-b border-dashed border-red-100 dark:border-[#3E3023]">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">{t('booking.totalAmount', 'Số tiền thanh toán')}</p>
                <p className={`text-2xl font-bold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                  {formatCurrency(grandTotal)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedTable ? `${t('booking.table', 'Bàn')} T0${selectedTable.id.replace('t', '')}` : t('booking.table', 'Bàn')} • {shop.name}
                </p>
              </div>

              <div className="pt-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>{t('booking.itemsTotal', 'Tiền món')} ({totalItemCount}) + {t('booking.depositFee', 'Cọc bàn')}:</span>
                  <span>{formatCurrency(menuSubtotal + depositFee)}</span>
                </div>
                {discountAmount > 0 && appliedVoucher && (
                  <div className="flex justify-between text-emerald-600 font-bold items-center">
                    <span className="flex items-center gap-1">
                      <Sparkles size={13} /> {t('promotions.discountBadge', 'Khuyến mãi')} ({appliedVoucher.code}):
                    </span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <h3 className={`font-bold text-xs uppercase tracking-wider mb-2.5 ${isLight ? 'text-slate-800' : 'text-[#EBE3DB]'}`}>
                {t('booking.choosePaymentMethod', 'Chọn phương thức thanh toán')}
              </h3>

              <div className="space-y-2">
                {/* Option 1: VietQR */}
                <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'vietqr'
                    ? isLight ? 'bg-red-50/70 border-red-600 shadow-sm' : 'bg-[#251E18] border-[#D4AF37]'
                    : isLight ? 'bg-white border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      checked={paymentMethod === 'vietqr'} 
                      onChange={() => setPaymentMethod('vietqr')} 
                      className="accent-[#800020]"
                    />
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                      QR
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>{t('booking.vietqrName', 'Chuyển khoản QR (VietQR / Napas 24/7)')}</p>
                      <p className="text-[10px] text-slate-500">{t('booking.scanQrToPay', 'Quét mã bằng bất kỳ app ngân hàng nào')}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {t('common.recommended', 'Khuyên dùng')}
                  </span>
                </label>

                {/* Option 2: MoMo */}
                <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'momo'
                    ? isLight ? 'bg-red-50/70 border-red-600 shadow-sm' : 'bg-[#251E18] border-[#D4AF37]'
                    : isLight ? 'bg-white border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      checked={paymentMethod === 'momo'} 
                      onChange={() => setPaymentMethod('momo')} 
                      className="accent-[#800020]"
                    />
                    <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-700 font-bold text-xs">
                      MoMo
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>{t('booking.momoName', 'Ví điện tử MoMo')}</p>
                      <p className="text-[10px] text-slate-500">{t('booking.momoDesc', 'Mở ứng dụng MoMo thanh toán 1 chạm')}</p>
                    </div>
                  </div>
                </label>

                {/* Option 3: ZaloPay */}
                <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'zalopay'
                    ? isLight ? 'bg-red-50/70 border-red-600 shadow-sm' : 'bg-[#251E18] border-[#D4AF37]'
                    : isLight ? 'bg-white border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      checked={paymentMethod === 'zalopay'} 
                      onChange={() => setPaymentMethod('zalopay')} 
                      className="accent-[#800020]"
                    />
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 font-bold text-xs">
                      Zalo
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>{t('booking.payWithZaloPay', 'Ví ZaloPay')}</p>
                      <p className="text-[10px] text-slate-500">{t('booking.payWithZaloPayDesc', 'Thanh toán qua ZaloPay hoặc Zalo app')}</p>
                    </div>
                  </div>
                </label>

                {/* Option 4: Thẻ ATM / Quốc tế */}
                <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'card'
                    ? isLight ? 'bg-red-50/70 border-red-600 shadow-sm' : 'bg-[#251E18] border-[#D4AF37]'
                    : isLight ? 'bg-white border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      checked={paymentMethod === 'card'} 
                      onChange={() => setPaymentMethod('card')} 
                      className="accent-[#800020]"
                    />
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xs">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>{t('booking.cardName', 'Thẻ Visa / Master / Napas')}</p>
                      <p className="text-[10px] text-slate-500">{t('booking.cardGateway', 'Cổng thanh toán thẻ nội địa & quốc tế')}</p>
                    </div>
                  </div>
                </label>

                {/* Option 5: Thanh toán tại quán */}
                <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'at_store'
                    ? isLight ? 'bg-red-50/70 border-red-600 shadow-sm' : 'bg-[#251E18] border-[#D4AF37]'
                    : isLight ? 'bg-white border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      checked={paymentMethod === 'at_store'} 
                      onChange={() => setPaymentMethod('at_store')} 
                      className="accent-[#800020]"
                    />
                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>{t('booking.payAtCounter', 'Thanh toán khi đến quán')}</p>
                      <p className="text-[10px] text-slate-500">{t('booking.payAtCounterSub', 'Nhân viên sẽ thu tiền khi bạn nhận bàn')}</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Dynamic Payment Detail based on selected method */}
            {paymentMethod === 'vietqr' && (
              <div className={`p-4 rounded-2xl border text-center space-y-3 ${
                isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
              }`}>
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-blue-700">
                  <ShieldCheck size={16} /> Quét mã VietQR để thanh toán tự động
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-300 inline-block shadow-md">
                  <QrCode size={160} className="text-slate-900" />
                </div>

                {/* Bank transfer info fields with quick copy buttons */}
                <div className="space-y-2 text-left pt-2 text-xs">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-[#120E0C] border border-slate-200 dark:border-[#3E3023]">
                    <div>
                      <p className="text-[10px] text-slate-400">{t('booking.bankLabel', 'Ngân hàng')}</p>
                      <p className="font-bold text-[#1E1B18] dark:text-white">Vietcombank (Hội sở chính)</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-[#120E0C] border border-slate-200 dark:border-[#3E3023]">
                    <div>
                      <p className="text-[10px] text-slate-400">{t('booking.accountNumber', 'Số tài khoản')}</p>
                      <p className="font-bold text-[#800020] dark:text-[#D4AF37] font-mono">1038 9988 6622</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard('103899886622', 'acc')}
                      className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-slate-200 dark:bg-[#251E18] text-slate-700 dark:text-[#EBE3DB]"
                    >
                      {copiedField === 'acc' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-[#120E0C] border border-slate-200 dark:border-[#3E3023]">
                    <div>
                      <p className="text-[10px] text-slate-400">{t('booking.transferNote', 'Nội dung chuyển khoản')}</p>
                      <p className="font-bold text-[#800020] dark:text-[#D4AF37] font-mono">{bookingCode}</p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(bookingCode, 'content')}
                      className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded bg-slate-200 dark:bg-[#251E18] text-slate-700 dark:text-[#EBE3DB]"
                    >
                      {copiedField === 'content' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copiedField === 'content' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(paymentMethod === 'momo' || paymentMethod === 'zalopay') && (
              <div className={`p-4 rounded-2xl border text-center space-y-3 ${
                isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
              }`}>
                <Smartphone className="mx-auto text-[#800020] dark:text-[#D4AF37]" size={36} />
                <h4 className="font-bold text-sm">Chuyển hướng đến {paymentMethod === 'momo' ? 'MoMo' : 'ZaloPay'}</h4>
                <p className="text-xs text-slate-500">
                  Hệ thống sẽ liên kết trực tiếp tới ứng dụng ví của bạn để xác nhận giao dịch an toàn.
                </p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className={`p-4 rounded-2xl border text-center space-y-3 ${
                isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
              }`}>
                <CreditCard className="mx-auto text-[#800020] dark:text-[#D4AF37]" size={36} />
                <h4 className="font-bold text-sm">{t('booking.otpGateway', 'Cổng thanh toán thẻ bảo mật OTP')}</h4>
                <p className="text-xs text-slate-500">
                  Hỗ trợ thanh toán qua thẻ tín dụng, ghi nợ quốc tế Visa/Mastercard hoặc thẻ ATM nội địa có đăng ký Internet Banking.
                </p>
              </div>
            )}

            {paymentMethod === 'at_store' && (
              <div className={`p-4 rounded-2xl border text-center space-y-2 ${
                isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
              }`}>
                <Building2 className="mx-auto text-purple-600" size={36} />
                <h4 className="font-bold text-sm">{t('booking.payAtCounter', 'Thanh toán trực tiếp tại quầy')}</h4>
                <p className="text-xs text-slate-500">
                  Bạn có thể thanh toán bằng tiền mặt hoặc thẻ khi đến quán và check-in nhận bàn.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 5: SUCCESS ================= */}
        {step === 'success' && (
          <div className="animate-in zoom-in-95 fade-in flex flex-col items-center justify-center pt-4 pb-12 space-y-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border shadow-lg ${
              isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'bg-[#1A1510] border-emerald-500 text-emerald-400'
            }`}>
              <CheckCircle2 size={36} />
            </div>
            
            <div className="text-center space-y-1">
              <h2 className={`text-xl font-bold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                Đặt bàn thành công!
              </h2>
              <p className="text-slate-500 text-xs max-w-[280px] mx-auto leading-relaxed">
                Quán đã nhận được yêu cầu đặt chỗ và chuẩn bị thực đơn theo đúng tùy chọn của bạn.
              </p>
            </div>

            {/* Ticket Card */}
            <div className={`p-5 rounded-3xl border shadow-xl flex flex-col items-center gap-4 w-full max-w-sm ${
              isLight ? 'bg-white border-red-300' : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C]'
            }`}>
              <div className="bg-white p-3 rounded-2xl w-44 h-44 flex items-center justify-center border border-slate-200 shadow-inner">
                <QrCode size={150} className="text-black" />
              </div>

              <div className="flex flex-col items-center border-b pb-3 w-full border-slate-200 dark:border-[#3E3023]">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('booking.bookingCode', 'Mã đặt bàn')}</span>
                <span className={`text-xl font-bold tracking-widest ${isLight ? 'text-[#800020]' : 'text-[#EBE3DB]'}`}>
                  {bookingCode}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                  paymentMethod === 'at_store' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {paymentMethod === 'at_store' ? 'Thanh toán tại quán' : 'Đã thanh toán online'}
                </span>
              </div>

              <div className="w-full space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('booking.shopLabel', 'Quán:')}</span>
                  <span className="font-bold truncate max-w-[180px]">{shop.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('booking.tableLabel', 'Bàn:')}</span>
                  <span className="font-bold">Bàn T0{selectedTable?.id.replace('t', '') || '1'} ({selectedTable?.seats || 2} chỗ)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('booking.timeLabel', 'Thời gian:')}</span>
                  <span className="font-bold">{selectedTime} • {formatDateDisplay(selectedDate)}</span>
                </div>

                {cartItems.length > 0 && (
                  <div className="pt-2 border-t border-dashed border-slate-200 dark:border-[#3E3023]">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                      Danh sách món gọi trước ({totalItemCount}):
                    </p>
                    <div className="space-y-1.5">
                      {cartItems.map((c) => (
                        <div key={c.cartId} className="flex justify-between text-xs">
                          <div>
                            <span className="font-bold">{c.quantity}x {c.name}</span>
                            <span className="text-[10px] text-slate-500 block">
                              ({c.size ? `Size ${c.size}, ` : ''}{c.ice}, {c.sugar})
                            </span>
                          </div>
                          <span className="font-bold">{formatCurrency(c.price * c.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {discountAmount > 0 && appliedVoucher && (
                  <div className="flex justify-between text-emerald-600 font-bold text-xs pt-1">
                    <span>Ưu đãi áp dụng ({appliedVoucher.code}):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-[#251E18]">
                  <span className="font-bold">Tổng thanh toán:</span>
                  <span className={`font-bold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="w-full max-w-sm flex gap-3 pt-2">
              <button 
                onClick={() => onNavigate({ name: 'bookings' })}
                className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all ${
                  isLight ? 'bg-white border-red-600 text-[#800020] hover:bg-red-50' : 'bg-[#1A1510] border-[#D4AF37] text-[#D4AF37]'
                }`}
              >
                {t('booking.viewTicketInBookings', 'Xem vé trong lịch')}
              </button>
              <button 
                onClick={() => onNavigate({ name: 'home' })}
                className={`flex-1 py-3 rounded-xl font-bold text-xs text-white shadow-md ${
                  isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B]' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E]'
                }`}
              >
                {t('booking.returnHome', 'Về trang chủ')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= PRODUCT DETAIL & ICE/SUGAR CUSTOMIZATION MODAL ================= */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border max-h-[90vh] flex flex-col overflow-hidden shadow-2xl transition-all animate-in slide-in-from-bottom-6 ${
            isLight ? 'bg-white border-red-200 text-[#1E1B18]' : 'bg-[#1A1510] border-[#4A3B2C] text-[#EBE3DB]'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'border-red-100 bg-red-50/50' : 'border-[#3E3023] bg-[#201A16]'
            }`}>
              <div className="flex items-center gap-2">
                <Coffee size={18} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
                <h3 className="font-bold text-sm">
                  {editingCartId ? 'Chỉnh sửa món' : 'Tùy chỉnh món nước'}
                </h3>
              </div>
              <button 
                onClick={() => setCustomizingItem(null)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                  isLight ? 'bg-white border-slate-200 text-slate-500 hover:text-black' : 'bg-[#251E18] border-[#4A3B2C] text-slate-400 hover:text-white'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-5">
              {/* Item Info Banner */}
              <div className="flex gap-3.5">
                <img 
                  src={customizingItem.image} 
                  alt={customizingItem.name} 
                  className="w-24 h-24 rounded-2xl object-cover border border-red-100 shrink-0 shadow-sm"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLight ? 'bg-red-100 text-[#800020]' : 'bg-[#251E18] text-[#D4AF37]'
                      }`}>
                        {customizingItem.category}
                      </span>
                    </div>
                    <h4 className="font-bold text-base">{customizingItem.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {customizingItem.description}
                    </p>
                  </div>
                  <p className={`font-bold text-base mt-2 ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                    {((customizingItem.price + (!customizingItem.category.includes('Bánh') ? (DRINK_SIZES.find(s => s.id === customSize)?.surcharge || 0) : 0))).toLocaleString('vi-VN')}đ
                    {!customizingItem.category.includes('Bánh') && (DRINK_SIZES.find(s => s.id === customSize)?.surcharge || 0) > 0 && (
                      <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                        (gốc {customizingItem.price.toLocaleString('vi-VN')}đ + {((DRINK_SIZES.find(s => s.id === customSize)?.surcharge || 0)).toLocaleString('vi-VN')}đ)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Option 1: DRINK SIZE (Kích cỡ ly To / Nhỏ) - for drinks */}
              {!customizingItem.category.includes('Bánh') && (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🥤</span>
                      <div>
                        <h5 className="font-bold text-xs uppercase tracking-wider">{t('booking.sizeTitle', 'Kích cỡ ly (Size)')}</h5>
                        <p className="text-[10px] text-slate-500">{t('booking.sizeDesc', 'Chọn dung tích ly to hoặc nhỏ theo nhu cầu')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-[#800020] dark:bg-[#3E2510] dark:text-[#D4AF37]">
                      Bắt buộc
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {DRINK_SIZES.map((sizeOpt) => {
                      const isSelected = customSize === sizeOpt.id;
                      return (
                        <button
                          key={sizeOpt.id}
                          type="button"
                          onClick={() => setCustomSize(sizeOpt.id)}
                          className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between transition-all relative ${
                            isSelected
                              ? isLight 
                                ? 'bg-red-50/90 border-2 border-[#800020] text-[#800020] shadow-sm' 
                                : 'bg-[#2A1E14] border-2 border-[#D4AF37] text-white shadow-sm'
                              : isLight
                                ? 'bg-white border-slate-200 text-slate-700 hover:border-red-300'
                                : 'bg-[#201A16] border-[#3E3023] text-[#A48F7A] hover:border-slate-500'
                          }`}
                        >
                          {isSelected && (
                            <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center ${
                              isLight ? 'bg-[#800020] text-white' : 'bg-[#D4AF37] text-black'
                            }`}>
                              <Check size={10} strokeWidth={3} />
                            </div>
                          )}

                          {/* Visual Cup Indicator */}
                          <div className="my-1 flex items-center justify-center h-8">
                            <span className={`font-bold ${
                              sizeOpt.id === 'S' ? 'text-lg' : sizeOpt.id === 'M' ? 'text-2xl' : 'text-3xl'
                            }`}>
                              🥤
                            </span>
                          </div>

                          <p className="text-xs font-bold">{sizeOpt.shortLabel}</p>
                          <p className="text-[10px] opacity-70 font-medium">{sizeOpt.volume}</p>
                          
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-[#3E3023] w-full">
                            <span className={`text-[10px] font-bold ${
                              sizeOpt.surcharge === 0 
                                ? 'text-slate-400' 
                                : isLight ? 'text-[#800020]' : 'text-[#D4AF37]'
                            }`}>
                              {sizeOpt.surcharge === 0 ? '+0đ' : `+${sizeOpt.surcharge.toLocaleString('vi-VN')}đ`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option 2: ICE LEVEL (Mức Đá) - for drinks */}
              {!customizingItem.category.includes('Bánh') && (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🧊</span>
                      <div>
                        <h5 className="font-bold text-xs uppercase tracking-wider">{t('booking.iceTitle', 'Mức đá (Ice Level)')}</h5>
                        <p className="text-[10px] text-slate-500">{t('booking.iceDesc', 'Chọn lượng đá theo khẩu vị')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Bắt buộc
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {ICE_OPTIONS.map((opt) => {
                      const isSelected = customIce === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setCustomIce(opt.label)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? isLight 
                                ? 'bg-blue-50 border-2 border-blue-600 text-blue-900 shadow-sm' 
                                : 'bg-[#1E2530] border-2 border-[#5C89C7] text-white shadow-sm'
                              : isLight
                                ? 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                                : 'bg-[#201A16] border-[#3E3023] text-[#A48F7A] hover:border-slate-500'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold">{opt.label}</p>
                            <p className="text-[10px] opacity-70">{opt.desc}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'border-slate-300'
                          }`}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option 3: SUGAR LEVEL (Mức Đường) - for drinks */}
              {!customizingItem.category.includes('Bánh') && (
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🍯</span>
                      <div>
                        <h5 className="font-bold text-xs uppercase tracking-wider">{t('booking.sugarTitle', 'Mức đường (Độ ngọt)')}</h5>
                        <p className="text-[10px] text-slate-500">{t('booking.sugarDesc', 'Độ ngọt yêu thích của bạn')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      Bắt buộc
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {SUGAR_OPTIONS.map((opt) => {
                      const isSelected = customSugar === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setCustomSugar(opt.label)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? isLight 
                                ? 'bg-amber-50/90 border-2 border-amber-600 text-amber-900 shadow-sm' 
                                : 'bg-[#2A2318] border-2 border-[#D4AF37] text-white shadow-sm'
                              : isLight
                                ? 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                                : 'bg-[#201A16] border-[#3E3023] text-[#A48F7A] hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected 
                                ? isLight ? 'bg-amber-600 border-amber-600 text-white' : 'bg-[#D4AF37] border-[#D4AF37] text-black' 
                                : 'border-slate-300'
                            }`}>
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className="text-xs font-bold">{opt.label}</span>
                          </div>
                          <span className="text-[11px] opacity-75 font-medium">{opt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Note per item */}
              <div>
                <label className="block text-xs font-bold mb-1.5">
                  Ghi chú cho món này (Tùy chọn)
                </label>
                <input 
                  type="text" 
                  value={customItemNote}
                  onChange={(e) => setCustomItemNote(e.target.value)}
                  placeholder={t('booking.itemNotePlaceholder', 'Ví dụ: Mang thêm ly đá riêng, ít sữa đặc, để riêng ống hút...')}
                  className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none ${
                    isLight 
                      ? 'bg-white border-slate-300 focus:border-red-600' 
                      : 'bg-[#15110E] border-[#3E3023] text-white focus:border-[#D4AF37]'
                  }`}
                />
              </div>

              {/* BOGO Active Notice inside modal if eligible */}
              {isBogoActive && (customizingItem.isBogoEligible || customizingItem.category === 'Cà phê') && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                        Ưu đãi Mua 1 Tặng 1 đã áp dụng!
                      </p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">
                        Số lượng đã tự động được đặt thành 2 ly (Miễn phí ly thứ 2).
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-black uppercase">
                    1 + 1 Tặng
                  </span>
                </div>
              )}

              {/* Quantity selector */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
              }`}>
                <div>
                  <span className="text-xs font-bold block">{t('booking.quantityTitle', 'Số lượng món')}</span>
                  {isBogoActive && (customizingItem.isBogoEligible || customizingItem.category === 'Cà phê') && (
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Tự động nhân đôi theo ưu đãi 1+1
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setCustomQuantity(prev => (prev > 1 ? prev - 1 : 1))}
                    disabled={customQuantity <= 1}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                      customQuantity <= 1 
                        ? 'opacity-40 cursor-not-allowed border-slate-200' 
                        : isLight ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800' : 'bg-[#251E18] border-[#3E3023] text-white hover:bg-[#322820]'
                    }`}
                  >
                    <Minus size={14} />
                  </button>

                  <span className="text-sm font-bold w-6 text-center">{customQuantity}</span>

                  <button 
                    type="button"
                    onClick={() => setCustomQuantity(prev => prev + 1)}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                      isLight ? 'bg-[#800020] text-white border-[#800020]' : 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    }`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Bottom Confirm Button */}
            <div className={`p-4 border-t shrink-0 ${
              isLight ? 'border-red-100 bg-white' : 'border-[#3E3023] bg-[#1A1510]'
            }`}>
              <button 
                type="button"
                onClick={handleSaveCustomItem}
                className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                  isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B]' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E]'
                }`}
              >
                <span>
                  {editingCartId ? 'Cập nhật món' : 'Thêm vào đơn hàng'} • {formatCurrency((customizingItem.price + (!customizingItem.category.includes('Bánh') ? (DRINK_SIZES.find(s => s.id === customSize)?.surcharge || 0) : 0)) * customQuantity)}
                </span>
                <CheckCircle2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STICKY BOTTOM ACTION BARS ================= */}
      
      {/* 1. Bar for Step: BOOKING */}
      {step === 'booking' && selectedTable && (() => {
        const isCurrentTableAvailable = isTableAvailable(selectedTable.id, selectedDate, selectedTime);
        return (
          <div className={`fixed bottom-0 left-0 right-0 w-full z-40 border-t shadow-2xl transition-all pb-[env(safe-area-inset-bottom,0px)] ${
            isLight ? 'bg-white/95 backdrop-blur-xl border-red-300' : 'bg-[#120E0C]/95 backdrop-blur-xl border-[#4A3B2C]'
          }`}>
            <div className="w-full max-w-4xl mx-auto p-4 md:px-6 md:py-3.5">
              <div className="flex justify-between items-center mb-2.5 px-1">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('booking.selected', 'Bàn đã chọn')}</p>
                  <p className={`font-bold text-sm md:text-base flex items-center gap-2 ${
                    !isCurrentTableAvailable 
                      ? 'text-rose-600 dark:text-rose-400' 
                      : isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'
                  }`}>
                    <span>T0{selectedTable.id.replace('t', '')} • {selectedTime}</span>
                    {!isCurrentTableAvailable && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        Đã kín
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('booking.selectDate', 'Ngày đến')}</p>
                  <p className={`font-bold text-xs md:text-sm ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                    {formatDateDisplay(selectedDate)}
                  </p>
                </div>
              </div>

              {/* Notice when selected table is booked for this time */}
              {!isCurrentTableAvailable && (
                <div className="mb-3 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
                  <AlertCircle size={14} className="shrink-0 text-rose-500" />
                  <span className="text-[11px] md:text-xs">
                    Bàn bạn đang chọn đã kín vào lúc {selectedTime}. Vui lòng đổi giờ hoặc chọn bàn khác.
                  </span>
                </div>
              )}
              
              <div className="flex gap-3">
                <button 
                  disabled={!isCurrentTableAvailable}
                  onClick={() => {
                    if (isCurrentTableAvailable) setStep('confirm');
                  }}
                  className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-xs md:text-sm border transition-all ${
                    !isCurrentTableAvailable
                      ? 'bg-slate-100 dark:bg-[#181411] border-slate-200 dark:border-[#2D241C] text-slate-400 dark:text-stone-600 cursor-not-allowed opacity-70'
                      : isLight ? 'bg-white border-red-600 text-[#800020] hover:bg-red-50' : 'bg-[#1A1510] border-[#D4AF37] text-[#D4AF37]'
                  }`}
                >
                  {t('booking.skipDrinks', 'Bỏ qua món')}
                </button>
                <button 
                  disabled={!isCurrentTableAvailable}
                  onClick={() => {
                    if (isCurrentTableAvailable) setStep('menu');
                  }}
                  className={`flex-[2] py-3 md:py-3.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
                    !isCurrentTableAvailable
                      ? 'bg-slate-200 dark:bg-[#251E18] text-slate-400 dark:text-stone-500 border border-slate-300 dark:border-[#3E3023] cursor-not-allowed opacity-75 shadow-none'
                      : isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white shadow-md' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white shadow-md'
                  }`}
                >
                  <Coffee size={15} /> 
                  <span>
                    {!isCurrentTableAvailable 
                      ? `Bàn đã kín (${selectedTime})` 
                      : t('booking.preorderDrinksBtn', 'Chọn trước món')}
                  </span> 
                  {isCurrentTableAvailable && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 2. Bar for Step: MENU */}
      {step === 'menu' && (
        <div className={`fixed bottom-0 left-0 right-0 w-full z-40 border-t shadow-2xl transition-all pb-[env(safe-area-inset-bottom,0px)] ${
          isLight ? 'bg-white/95 backdrop-blur-xl border-red-300' : 'bg-[#120E0C]/95 backdrop-blur-xl border-[#4A3B2C]'
        }`}>
          <div className="w-full max-w-4xl mx-auto p-4 md:px-6 md:py-3.5">
            <div className="flex justify-between items-center mb-3 px-1">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('booking.selected', 'Đã chọn')}</p>
                  <p className={`font-bold text-xs md:text-sm ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
                    {totalItemCount > 0 ? `${totalItemCount} món` : t('booking.noItemsSelected', 'Chưa chọn món')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('booking.itemsTotal', 'Tạm tính')}</p>
                <p className={`font-bold text-sm md:text-base ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                  {formatCurrency(menuSubtotal)}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setStep('confirm')}
              className={`w-full py-3.5 md:py-4 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B]' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E]'
              }`}
            >
              <span>{t('booking.continueReview', 'Tiếp tục (Xem lại & Xác nhận)')}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Bar for Step: CONFIRM */}
      {step === 'confirm' && (
        <div className={`fixed bottom-0 left-0 right-0 w-full z-40 border-t shadow-2xl transition-all pb-[env(safe-area-inset-bottom,0px)] ${
          isLight ? 'bg-white/95 backdrop-blur-xl border-red-300' : 'bg-[#120E0C]/95 backdrop-blur-xl border-[#4A3B2C]'
        }`}>
          <div className="w-full max-w-4xl mx-auto p-4 md:px-6 md:py-3.5">
            <div className="flex justify-between items-center mb-3 px-1">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{t('booking.grandTotal', 'Tổng thanh toán')}</p>
                <p className={`font-bold text-lg md:text-xl ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                  {formatCurrency(grandTotal)}
                </p>
              </div>
              <span className="text-[10px] md:text-xs font-semibold text-slate-400">
                {t('booking.depositAndVoucherIncluded', 'Đã gồm cọc & trừ voucher')}
              </span>
            </div>

            <button 
              onClick={() => setStep('payment')}
              className={`w-full py-3.5 md:py-4 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B]' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E]'
              }`}
            >
              <span>{t('booking.proceedPayment', 'Tiếp tục thanh toán')} ({formatCurrency(grandTotal)})</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 4. Bar for Step: PAYMENT */}
      {step === 'payment' && (
        <div className={`fixed bottom-0 left-0 right-0 w-full z-40 border-t shadow-2xl transition-all pb-[env(safe-area-inset-bottom,0px)] ${
          isLight ? 'bg-white/95 backdrop-blur-xl border-red-300' : 'bg-[#120E0C]/95 backdrop-blur-xl border-[#4A3B2C]'
        }`}>
          <div className="w-full max-w-4xl mx-auto p-4 md:px-6 md:py-3.5">
            <button 
              onClick={handleCompleteBookingAndVerify}
              disabled={isSubmitting || !!availabilityError}
              className={`w-full py-3.5 md:py-4 rounded-xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] hover:from-[#6B0D1B] hover:to-[#500A14]' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] hover:from-[#966D38] hover:to-[#735A40]'
              } ${isSubmitting ? 'opacity-80 cursor-wait' : ''}`}
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              <span>
                {paymentMethod === 'at_store' ? t('booking.payAtStoreBtn', 'Xác nhận đặt bàn (Thanh toán tại quán)') : t('booking.paidConfirm', 'Tôi đã thanh toán / Hoàn tất')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STORE CONFIRMATION LOADING OVERLAY ================= */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl transition-all text-center flex flex-col items-center animate-in zoom-in-95 ${
            isLight ? 'bg-white border-red-200 text-[#1E1B18]' : 'bg-[#18130F] border-[#4A3B2C] text-[#EBE3DB]'
          }`}>
            {/* Animated Radar Pulse with Coffee Icon */}
            <div className="relative w-24 h-24 flex items-center justify-center my-3">
              <span className="absolute inset-0 rounded-full bg-red-500/20 dark:bg-amber-500/20 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-red-500/10 dark:bg-amber-500/10 animate-pulse" />
              <div className={`relative z-10 w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg ${
                isLight 
                  ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 text-[#800020]' 
                  : 'bg-gradient-to-br from-[#2A2018] to-[#1C1612] border-[#4A3B2C] text-[#D4AF37]'
              }`}>
                {submissionStage === 3 ? (
                  <CheckCircle2 size={32} className="text-emerald-500 animate-bounce" />
                ) : (
                  <Coffee size={30} className="animate-pulse" />
                )}
              </div>
            </div>

            {/* Main Title Requested by User */}
            <h3 className={`text-lg md:text-xl font-bold mb-1.5 leading-snug px-2 ${
              isLight ? 'text-[#800020]' : 'text-[#D4AF37]'
            }`}>
              {t('booking.waitingConfirmationTitle', 'Đang gửi đơn, đợi quán xác nhận đặt bàn của bạn...')}
            </h3>

            <p className="text-xs text-slate-500 mb-6 max-w-xs">
              Đang đồng bộ trực tiếp với quầy pha chế của <span className="font-semibold text-slate-700 dark:text-stone-300">{shop.name}</span>
            </p>

            {/* 3 Step Progress Tracker */}
            <div className={`w-full rounded-2xl p-4 border space-y-3.5 mb-6 text-left ${
              isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-[#120E0C] border-[#2E241B]'
            }`}>
              {/* Step 1 */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                  submissionStage >= 1
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-stone-800 text-slate-400'
                }`}>
                  {submissionStage > 1 ? <Check size={13} /> : <Loader2 size={13} className="animate-spin" />}
                </div>
                <span className={`text-xs font-semibold ${
                  submissionStage === 1 ? (isLight ? 'text-[#800020] font-bold' : 'text-[#D4AF37] font-bold') : (submissionStage > 1 ? 'text-slate-600 dark:text-stone-400' : 'text-slate-400')
                }`}>
                  {t('booking.waitingStep1', 'Đang gửi thông tin đặt chỗ đến hệ thống quán...')}
                </span>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                  submissionStage >= 2
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-stone-800 text-slate-400'
                }`}>
                  {submissionStage > 2 ? <Check size={13} /> : submissionStage === 2 ? <Loader2 size={13} className="animate-spin" /> : '2'}
                </div>
                <span className={`text-xs font-semibold ${
                  submissionStage === 2 ? (isLight ? 'text-[#800020] font-bold' : 'text-[#D4AF37] font-bold') : (submissionStage > 2 ? 'text-slate-600 dark:text-stone-400' : 'text-slate-400')
                }`}>
                  {t('booking.waitingStep2', 'Quán đang kiểm tra chỗ ngồi & danh sách món nước...')}
                </span>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                  submissionStage >= 3
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-stone-800 text-slate-400'
                }`}>
                  {submissionStage >= 3 ? <Check size={13} /> : '3'}
                </div>
                <span className={`text-xs font-semibold ${
                  submissionStage >= 3 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'
                }`}>
                  {t('booking.waitingStep3', 'Quán đã xác nhận đặt bàn thành công!')}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden mb-3">
              <div 
                className={`h-full transition-all duration-700 rounded-full ${
                  isLight ? 'bg-gradient-to-r from-[#800020] to-emerald-500' : 'bg-gradient-to-r from-[#D4AF37] to-emerald-500'
                }`}
                style={{ 
                  width: submissionStage === 1 ? '35%' : submissionStage === 2 ? '75%' : '100%' 
                }}
              />
            </div>

            <p className="text-[11px] text-slate-400 italic">
              {submissionStage === 3 
                ? t('booking.autoRedirect', 'Đang chuyển đến danh sách đặt bàn của bạn...') 
                : 'Vui lòng giữ màn hình trong giây lát...'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
