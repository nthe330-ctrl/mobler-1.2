import { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Clock, 
  MapPin, 
  X, 
  QrCode, 
  Phone, 
  CheckCircle2, 
  Coffee, 
  Sparkles, 
  Receipt,
  Users,
  Building2,
  Share2,
  Star
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewState } from '../App';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { LanguageControlButton } from './LanguageSelectorModal';
import { useAuth } from '../context/AuthContext';
import { api, http, BookingData } from '../services/api';
import { connectRealtime } from '@shared/api/realtime';
import { BOOKING_STATUS_LABEL_VI, BookingStatus, formatDateVi, hasCheckedIn, isActiveBooking } from '@shared/booking';
import { CoffeeShop } from '@shared/types';
import BookingQrCode from './booking/BookingQrCode';

interface Props {
  shops?: CoffeeShop[];
  onNavigate: (view: ViewState) => void;
  highlightBookingId?: string;
}

/** Shape used by the existing booking cards & ticket modal. */
/** Server-stored table names look like "Bàn 2 (Bàn tròn)"; show them in the active language. */
export function localizeTableName(name: string, t: (k: string, f: string) => string): string {
  const m = /^Bàn\s+(\d+)\s*\((.+)\)$/.exec(name.trim());
  if (!m) return name;
  const typeKey = { 'Bàn tròn': 'table.round', 'Bàn chữ nhật': 'table.rect', 'Ghế sofa': 'table.sofa' }[m[2].trim()];
  const label = t('table.nPrefix', 'Bàn {n}').replace('{n}', m[1]);
  return typeKey ? `${label} (${t(typeKey, m[2])})` : label;
}

function toDisplay(b: BookingData, shops: CoffeeShop[] | undefined, t: (k: string, f: string) => string) {
  const shop = shops?.find(s => s.id === b.shop_id);
  return {
    id: b.id,
    /** Needed to post a review against the right shop. */
    shopId: b.shop_id,
    store: {
      id: b.shop_id,
      name: b.shop_name,
      address: b.shop_address,
      phone: b.shop_phone || shop?.phoneNumber,
      images: [b.shop_image || shop?.coverImage || shop?.images?.[0]].filter(Boolean)
    },
    date: formatDateVi(b.date),
    time: b.time,
    guests: b.guests,
    status: isActiveBooking(b.status) ? 'upcoming' : b.status === 'completed' ? 'completed' : 'cancelled',
    liveStatus: b.status as BookingStatus,
    table: b.table_name ? localizeTableName(b.table_name, t) : t('bookings.tableByShop', 'Bàn do quán sắp xếp'),
    paymentMethod: b.payment_method,
    paymentStatus: b.payment_status,
    depositFee: b.deposit_fee,
    discountAmount: b.discount_amount || 0,
    grandTotal: b.grand_total,
    contactName: b.user_name,
    contactPhone: b.user_phone,
    bookingNote: b.note,
    shopNote: b.shop_note,
    order: b.order
  };
}

const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
  arrived: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700',
  completed: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300',
  cancelled: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
};

export default function BookingsView({ shops, onNavigate, highlightBookingId }: Props) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const { isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();
  const [rawBookings, setRawBookings] = useState<BookingData[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  /** Booking ids this session already reviewed, so the form doesn't invite a duplicate. */
  const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);
  const allBookings = rawBookings.map(b => toDisplay(b, shops, t));

  const load = async () => {
    setIsLoadingList(true);
    try {
      const res = await api.getMyBookings();
      setRawBookings(res.bookings);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || t('bookings.loadFailed', 'Không tải được lịch đặt bàn'));
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setRawBookings([]);
      return;
    }
    load();
    // Live updates: the shop confirming / rejecting / checking you in shows up instantly.
    return connectRealtime({
      http,
      onEvent: (event, data) => {
        if (event === 'achievement' && data?.unlocked?.length) {
          setToast(t('bookings.missionUnlockedToast', '🏆 Mở khóa nhiệm vụ: {list}').replace('{list}', data.unlocked.map((a: any) => `${a.icon} ${a.title} (${a.rewardLabel})`).join(', ')));
          setTimeout(() => setToast(null), 7000);
          return;
        }
        if (event === 'achievement' && data?.rankedUp) {
          setToast(t('bookings.rankUpToast', '{icon} Lên hạng mới: {rank}!').replace('{icon}', data.rankedUp.icon).replace('{rank}', t(`rank.${data.rankedUp.id}.title`, data.rankedUp.title)));
          setTimeout(() => setToast(null), 7000);
          return;
        }
        if (event !== 'booking' || !data?.booking) return;
        const incoming: BookingData = data.booking;
        setRawBookings(prev => {
          const exists = prev.some(b => b.id === incoming.id);
          return exists ? prev.map(b => (b.id === incoming.id ? incoming : b)) : [incoming, ...prev];
        });
        setSelectedBooking((cur: any) => (cur && cur.id === incoming.id ? toDisplay(incoming, shops, t) : cur));
        if (data.action === 'updated') {
          setToast(`${incoming.shop_name}: ${BOOKING_STATUS_LABEL_VI[incoming.status]} (${incoming.id})`);
          setTimeout(() => setToast(null), 5000);
        }
      }
    });
  }, [isAuthenticated]);

  // Celebrate achievements unlocked by the booking that was just made.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('mobler_new_achievements');
      if (!raw) return;
      sessionStorage.removeItem('mobler_new_achievements');
      const list = JSON.parse(raw) as { icon: string; title: string; rewardLabel: string }[];
      if (list.length) {
        setToast(t('bookings.missionUnlockedToast', '🏆 Mở khóa nhiệm vụ: {list}').replace('{list}', list.map(a => `${a.icon} ${a.title} (${a.rewardLabel})`).join(', ')));
        setTimeout(() => setToast(null), 7000);
      }
    } catch { /* ignore */ }
  }, []);

  // Open the freshly created booking.
  useEffect(() => {
    if (!highlightBookingId) return;
    const found = rawBookings.find(b => b.id === highlightBookingId);
    if (found) {
      setSelectedBooking(toDisplay(found, shops, t));
      setActiveTab(isActiveBooking(found.status) ? 'upcoming' : 'history');
    }
  }, [highlightBookingId, rawBookings.length]);

  const handleCancel = async (id: string) => {
    if (!window.confirm(t('bookings.confirmCancel', 'Bạn chắc chắn muốn hủy lịch đặt bàn này?'))) return;
    setCancelling(true);
    try {
      const res = await api.cancelBooking(id);
      setRawBookings(prev => prev.map(b => (b.id === id ? res.booking : b)));
      setSelectedBooking(toDisplay(res.booking, shops, t));
    } catch (err: any) {
      setToast(err?.message || t('bookings.cancelFailed', 'Không hủy được lịch đặt'));
      setTimeout(() => setToast(null), 5000);
    } finally {
      setCancelling(false);
    }
  };

  const reviewDone = !!selectedBooking && reviewedBookingIds.includes(selectedBooking.id);

  /**
   * Post a review for the shop of the open booking. The server re-checks that this guest
   * really checked in at this shop, so a failure here is reported rather than hidden.
   */
  const handleSubmitReview = async () => {
    if (!selectedBooking) return;
    const shopId = selectedBooking.shopId || selectedBooking.store?.id;
    if (!shopId) {
      setReviewError(t('bookings.reviewNoShop', 'Không xác định được quán của lịch đặt này.'));
      return;
    }
    setReviewSending(true);
    setReviewError(null);
    try {
      await api.addReview(shopId, {
        content: reviewText.trim(),
        rating: reviewRating,
        metrics: { noise: reviewRating, seating: reviewRating, accuracy: reviewRating }
      });
      setReviewedBookingIds(prev => [...prev, selectedBooking.id]);
      setReviewText('');
      setToast(t('bookings.reviewThanks', 'Cảm ơn bạn đã đánh giá quán!'));
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      setReviewError(err?.message || t('bookings.reviewFailed', 'Không gửi được đánh giá, vui lòng thử lại.'));
    } finally {
      setReviewSending(false);
    }
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setReviewText('');
    setReviewRating(5);
    setReviewError(null);
    window.dispatchEvent(new CustomEvent('show-bottom-nav'));
  };

  const filteredBookings = activeTab === 'upcoming' 
    ? allBookings.filter(b => b.status === 'upcoming')
    : allBookings.filter(b => b.status !== 'upcoming');

  const formatPrice = (val?: number) => {
    if (typeof val !== 'number') return '0đ';
    return val.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className={`flex flex-col min-h-full pb-32 transition-colors duration-300 ${isLight ? 'bg-[#F0F3F7]' : 'bg-transparent'}`}>
      <div className="max-w-5xl mx-auto w-full px-4 md:px-8 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
              isLight ? 'bg-red-50 border-red-200 text-[#800020]' : 'bg-[#251E18] border-[#3E3023] text-[#D4AF37]'
            }`}>
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className={`text-xl md:text-2xl font-bold ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
                {t('bookings.title', 'Lịch đặt bàn')}
              </h1>
              <p className="text-[11px] text-slate-500">
                {t('bookings.subtitle', 'Quản lý lịch đặt chỗ và xem mã QR nhận bàn')}
              </p>
            </div>
          </div>
          <LanguageControlButton variant="badge" />
        </div>

        {/* Tab Switcher */}
        <div className={`flex rounded-2xl p-1 border mb-6 transition-all ${
          isLight 
            ? 'bg-white border-red-200/80 shadow-xs' 
            : 'bg-[#120E0C]/90 border-[#4A3B2C]'
        }`}>
          <button 
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'upcoming' 
                ? isLight 
                  ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white shadow-sm' 
                  : 'bg-[#251E18] text-[#D4AF37] border border-[#3E3023] shadow-sm' 
                : isLight ? 'text-slate-600 hover:text-red-900' : 'text-[#7A6450] hover:text-[#A48F7A]'
            }`}
          >
            <span>{t('bookings.upcoming', 'Sắp tới')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'upcoming' 
                ? 'bg-white/20 text-white' 
                : isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#18130F] text-[#8C7662]'
            }`}>
              {allBookings.filter(b => b.status === 'upcoming').length}
            </span>
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history' 
                ? isLight 
                  ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white shadow-sm' 
                  : 'bg-[#251E18] text-[#D4AF37] border border-[#3E3023] shadow-sm' 
                : isLight ? 'text-slate-600 hover:text-red-900' : 'text-[#7A6450] hover:text-[#A48F7A]'
            }`}
          >
            <span>{t('bookings.history', 'Lịch sử')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'history' 
                ? 'bg-white/20 text-white' 
                : isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#18130F] text-[#8C7662]'
            }`}>
              {allBookings.filter(b => b.status !== 'upcoming').length}
            </span>
          </button>
        </div>
      </div>

      {/* Bookings List Cards */}
      <div className="max-w-5xl mx-auto w-full px-4 md:px-8">
        {!isAuthenticated && !authLoading ? (
          <div className={`text-center py-14 px-6 rounded-2xl border ${isLight ? 'bg-white border-red-200' : 'bg-[#18130F] border-[#3E3023]'}`}>
            <CalendarDays size={44} className="mx-auto mb-3 opacity-40 text-[#800020] dark:text-[#D4AF37]" />
            <p className="font-bold text-sm mb-1">{t('bookings.signInTitle', 'Đăng nhập để xem lịch đặt bàn')}</p>
            <p className="text-xs text-slate-500 mb-4">{t('bookings.signInDesc', 'Lịch đặt được lưu vào tài khoản và cập nhật trực tiếp khi quán xác nhận.')}</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => openAuthModal('login')} className="px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold shadow-md">{t('auth.signIn', 'Đăng nhập')}</button>
              <button onClick={() => openAuthModal('register')} className="px-4 py-2 rounded-xl border border-[#800020] text-[#800020] dark:text-[#D4AF37] dark:border-[#D4AF37] text-xs font-bold">{t('auth.createAccount', 'Tạo tài khoản')}</button>
            </div>
          </div>
        ) : loadError ? (
          <div role="alert" className="text-center py-10 text-sm text-rose-600">
            <p className="mb-3">{loadError}</p>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold">{t('common.tryAgain', 'Thử lại')}</button>
          </div>
        ) : isLoadingList && allBookings.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">{t('bookings.loading', 'Đang tải lịch đặt bàn…')}</div>
        ) : filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            {filteredBookings.map((booking) => {
              const isNewlyCreated = highlightBookingId === booking.id;
              return (
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  key={booking.id} 
                  className={`border rounded-2xl p-4.5 cursor-pointer transition-all relative overflow-hidden ${
                    isNewlyCreated
                      ? isLight
                        ? 'bg-white border-2 border-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.18)] ring-2 ring-emerald-400/30'
                        : 'bg-gradient-to-b from-[#1C281F] to-[#121A14] border-2 border-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.25)]'
                      : isLight 
                      ? 'bg-white border-red-200/80 hover:border-red-500 shadow-[0_4px_16px_rgba(128,0,32,0.06)]' 
                      : booking.status === 'upcoming' 
                      ? 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#D4AF37]' 
                      : 'bg-[#120E0C] border-[#3E3023]'
                  }`}
                  onClick={() => setSelectedBooking(booking)}
                >
                  {isNewlyCreated && (
                    <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-xs">
                      <Sparkles size={12} />
                      <span>{t('bookings.justSent', 'Vừa gửi tới quán')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl border overflow-hidden shrink-0 shadow-xs ${
                        isLight ? 'border-red-200 bg-red-50' : 'border-[#4A3B2C] bg-[#1A1510]'
                      }`}>
                        <img 
                          src={booking.store?.images?.[0] || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400'} 
                          alt={booking.store?.name || 'Coffee Shop'} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <h3 className={`font-bold text-sm line-clamp-1 ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>
                          {booking.store?.name}
                        </h3>
                        <p className={`text-[10px] font-mono tracking-wider ${isLight ? 'text-slate-500' : 'text-[#7A6450]'}`}>
                          {booking.id}
                        </p>
                      </div>
                    </div>

                    <div className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border shrink-0 ${STATUS_BADGE[booking.liveStatus]}`}>
                      {BOOKING_STATUS_LABEL_VI[booking.liveStatus]}
                    </div>
                  </div>

                  {/* Booking Date, Time, Table Details */}
                  <div className={`p-3 rounded-xl mb-3 space-y-2 text-xs border ${
                    isLight ? 'bg-slate-50/80 border-slate-200/80' : 'bg-[#18130F] border-[#2A2018]'
                  }`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-[#A48F7A]'}`}>
                        <CalendarDays size={13} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} /> 
                        <span className="font-semibold truncate">{booking.date}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-[#A48F7A]'}`}>
                        <Clock size={13} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} /> 
                        <span className="font-semibold">{booking.time}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-dashed border-slate-200 dark:border-[#2D231A]">
                      <Users size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        <strong className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}>{booking.guests} {t('bookings.guestsUnit', 'người')}</strong> • {booking.table}
                      </span>
                    </div>

                    {booking.order?.items && booking.order.items.length > 0 && (
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Coffee size={12} className="text-amber-600" />
                          <span>Đặt trước {booking.order.items.reduce((s: number, i: any) => s + i.quantity, 0)} món nước</span>
                        </span>
                        <span className="font-bold text-slate-700 dark:text-stone-300">
                          {formatPrice(booking.grandTotal || booking.order.total)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Bar */}
                  <div className={`pt-2.5 border-t flex items-center justify-between ${isLight ? 'border-red-100' : 'border-[#2A2018]'}`}>
                    <span className={`text-[11px] font-bold flex items-center gap-1.5 ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                      <QrCode size={16} />
                      <span>{t('bookings.tapForDetails', 'Xem vé QR & Chi tiết đầy đủ')}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 uppercase">
                      {t('bookings.details', t('bookings.details', 'Chi tiết'))}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <CalendarDays size={48} className="mx-auto mb-4 opacity-30 text-[#800020] dark:text-[#D4AF37]" />
            <p className="font-medium text-sm">{t('bookings.noBookings', 'Không có lịch đặt bàn nào')}</p>
            <button
              onClick={() => onNavigate({ name: 'home' })}
              className="mt-4 px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold shadow-md hover:bg-[#6B0D1B] transition-all"
            >
              {t('bookings.emptyCta', 'Khám phá quán và đặt bàn ngay')}
            </button>
          </div>
        )}
      </div>

      {/* ================= COMPREHENSIVE BOOKING DETAILS MODAL ================= */}
      {selectedBooking && (
        <div 
          role="dialog" 
          aria-modal="true" 
          data-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-[80] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-3xl border max-h-[92vh] flex flex-col overflow-hidden shadow-2xl transition-all my-auto ${
            isLight ? 'bg-white border-red-200 text-[#1E1B18]' : 'bg-[#18130F] border-[#4A3B2C] text-[#EBE3DB]'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isLight ? 'border-red-100 bg-red-50/50' : 'border-[#3E3023] bg-[#201A16]'
            }`}>
              <div className="flex items-center gap-2">
                <Receipt size={18} className={isLight ? 'text-[#800020]' : 'text-[#D4AF37]'} />
                <div>
                  <h3 className="font-bold text-sm">{t('bookings.ticketTitle', 'Vé Đặt Bàn & Chi Tiết Đơn Hàng')}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Mã đơn: {selectedBooking.id}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={closeModal} 
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                  isLight ? 'bg-white border-slate-200 text-slate-600 hover:text-black' : 'bg-[#251E18] border-[#4A3B2C] text-slate-400 hover:text-white'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              
              {/* Store Quick Info Header */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#14100D] border-[#2E241B]'
              }`}>
                <img 
                  src={selectedBooking.store?.images?.[0] || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400'} 
                  alt={selectedBooking.store?.name} 
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-300 dark:border-[#3E3023]" 
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{selectedBooking.store?.name}</h4>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                    <MapPin size={11} className="shrink-0 text-red-600" />
                    <span>{selectedBooking.store?.address || 'TP. Hồ Chí Minh'}</span>
                  </p>
                  <p className={`text-[10px] font-semibold flex items-center gap-1 mt-0.5 ${
                    selectedBooking.liveStatus === 'pending' ? 'text-amber-600' : ['cancelled', 'rejected'].includes(selectedBooking.liveStatus) ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <CheckCircle2 size={11} />
                    <span>{BOOKING_STATUS_LABEL_VI[selectedBooking.liveStatus as BookingStatus]}</span>
                  </p>
                </div>
              </div>

              {/* QR Code Check-in Box — a real, scannable code, and only once the shop has
                  confirmed. Nothing but the booking code is encoded or shown here. */}
              <div className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center ${
                isLight ? 'bg-red-50/50 border-red-200' : 'bg-[#1C1612] border-[#3E3023]'
              }`}>
                {selectedBooking.liveStatus === 'confirmed' ? (
                  <>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">
                      {t('booking.qrAtCounter', 'Quét mã QR tại quầy để nhận bàn & nhận nước')}
                    </p>
                    <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200 inline-block mb-3">
                      <BookingQrCode value={selectedBooking.id} size={140} />
                    </div>
                  </>
                ) : (
                  <div className="mb-3 flex flex-col items-center gap-1.5">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                      hasCheckedIn(selectedBooking.liveStatus) ? 'bg-emerald-100 text-emerald-700' : 'bg-black/5 dark:bg-white/10 text-slate-500'
                    }`}>
                      {hasCheckedIn(selectedBooking.liveStatus) ? <CheckCircle2 size={22} /> : <QrCode size={22} />}
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-stone-300 max-w-[16rem]">
                      {selectedBooking.liveStatus === 'pending'
                        ? t('booking.qrAfterConfirm', 'Mã QR nhận bàn sẽ hiện ở đây ngay khi quán xác nhận lịch đặt.')
                        : selectedBooking.liveStatus === 'arrived'
                          ? t('booking.qrCheckedIn', 'Bạn đã nhận bàn. Chúc bạn có buổi cà phê thật vui!')
                          : selectedBooking.liveStatus === 'completed'
                            ? t('booking.qrVisitDone', 'Lượt ghé quán này đã hoàn tất.')
                            : t('booking.qrUnavailable', 'Lịch đặt này không còn hiệu lực nên không có mã nhận bàn.')}
                    </p>
                  </div>
                )}

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-black/5 dark:bg-white/10">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">{t('bookings.code', 'Mã đặt bàn:')}</span>
                  <span className="font-mono text-sm font-black tracking-widest text-[#800020] dark:text-[#D4AF37]">
                    {selectedBooking.id}
                  </span>
                </div>
              </div>

              {/* Review — unlocked by a real check-in, so it appears only after the shop
                  scanned the guest in. The server enforces the same rule. */}
              {hasCheckedIn(selectedBooking.liveStatus) && (
                <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-[#1C1612] border-[#3E3023]'
                }`}>
                  <h5 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-500">
                    <Star size={13} />
                    <span>{t('bookings.reviewTitle', 'Đánh giá quán')}</span>
                  </h5>
                  {reviewDone ? (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      {t('bookings.reviewThanks', 'Cảm ơn bạn đã đánh giá quán!')}
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] text-slate-500">
                        {t('bookings.reviewHint', 'Bạn đã nhận bàn tại quán này nên có thể để lại đánh giá.')}
                      </p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${n}/5`}
                            onClick={() => setReviewRating(n)}
                            className="p-0.5"
                          >
                            <Star
                              size={20}
                              className={n <= reviewRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-stone-600'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        rows={3}
                        placeholder={t('bookings.reviewPlaceholder', 'Quán thế nào? Chia sẻ cảm nhận của bạn…')}
                        className={`w-full px-3 py-2 rounded-xl border text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#14100D] border-[#2E241B] text-stone-200'
                        }`}
                      />
                      {reviewError && <p className="text-[11px] font-bold text-rose-600">{reviewError}</p>}
                      <button
                        type="button"
                        disabled={!reviewText.trim() || reviewSending}
                        onClick={handleSubmitReview}
                        className="w-full py-2.5 rounded-xl bg-[#800020] hover:bg-[#6b001b] text-white text-xs font-bold disabled:opacity-50"
                      >
                        {reviewSending
                          ? t('bookings.reviewSending', 'Đang gửi…')
                          : t('bookings.reviewSubmit', 'Gửi đánh giá')}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Booking Information Grid */}
              <div className={`p-3.5 rounded-2xl border space-y-2.5 text-xs ${
                isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#14100D] border-[#2E241B]'
              }`}>
                <h5 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-500">
                  <CalendarDays size={13} />
                  <span>{t('bookings.scheduleInfo', 'Thông tin lịch hẹn')}</span>
                </h5>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-[#2D231A]">
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t('bookings.arriveDate', 'Ngày đến:')}</span>
                    <span className="font-bold">{selectedBooking.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t('bookings.timeSlot', 'Khung giờ:')}</span>
                    <span className="font-bold text-[#800020] dark:text-[#D4AF37]">{selectedBooking.time}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t('bookings.assignedTable', 'Bàn chỉ định:')}</span>
                    <span className="font-bold">{selectedBooking.table}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t('bookings.guestCount', 'Số lượng khách:')}</span>
                    <span className="font-bold">{selectedBooking.guests} người</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t('bookings.bookedBy', 'Người đặt bàn:')}</span>
                    <span className="font-semibold">{selectedBooking.contactName || 'Nguyễn Thế'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">{t('bookings.phone', 'Số điện thoại:')}</span>
                    <span className="font-semibold">{selectedBooking.contactPhone || '0901234567'}</span>
                  </div>
                </div>

                {selectedBooking.bookingNote && (
                  <div className="pt-2 border-t border-dashed border-slate-200 dark:border-[#2D231A]">
                    <span className="text-slate-400 text-[10px] block">{t('bookings.noteToShop', 'Ghi chú cho quán:')}</span>
                    <p className="text-xs italic text-slate-600 dark:text-stone-300">"{selectedBooking.bookingNote}"</p>
                  </div>
                )}
              </div>

              {/* Order Drinks & Food Itemized Breakdown */}
              {selectedBooking.order?.items && selectedBooking.order.items.length > 0 && (
                <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#14100D] border-[#2E241B]'
                }`}>
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-500">
                      <Coffee size={13} />
                      <span>Danh sách món gọi trước ({selectedBooking.order.items.length})</span>
                    </h5>
                    <span className="text-[10px] font-bold text-emerald-600">{t('bookings.sentToBar', 'Đã gửi bếp pha chế')}</span>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-[#2D231A]">
                    {selectedBooking.order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start text-xs">
                        <div className="flex items-start gap-2">
                          <span className="font-bold px-1.5 py-0.2 rounded bg-red-100 dark:bg-[#2A2018] text-[#800020] dark:text-[#D4AF37] text-[11px] shrink-0">
                            {item.quantity}x
                          </span>
                          <div>
                            <p className="font-bold text-xs">{item.name}</p>
                            {item.options && (
                              <p className="text-[10px] text-slate-500">{item.options}</p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-xs shrink-0 ml-2">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Summary Box */}
              <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#14100D] border-[#2E241B]'
              }`}>
                <h5 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-500">
                  <Receipt size={13} />
                  <span>{t('bookings.paymentDetails', 'Chi tiết thanh toán')}</span>
                </h5>

                <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-[#2D231A]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('bookings.paymentMethod', 'Hình thức thanh toán:')}</span>
                    <span className="font-semibold">
                      {selectedBooking.paymentMethod === 'vietqr' && 'VietQR (Napas 24/7)'}
                      {selectedBooking.paymentMethod === 'momo' && t('payment.momo', 'Ví điện tử MoMo')}
                      {selectedBooking.paymentMethod === 'zalopay' && 'ZaloPay'}
                      {selectedBooking.paymentMethod === 'card' && t('payment.card', 'Thẻ tín dụng / Ghi nợ')}
                      {selectedBooking.paymentMethod === 'at_store' && 'Thanh toán tại quán'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">{t('bookings.status', 'Trạng thái:')}</span>
                    <span className={`font-bold ${
                      selectedBooking.paymentStatus === 'paid_online' ? 'text-emerald-600' : 'text-purple-600'
                    }`}>
                      {['paid_online', 'paid'].includes(selectedBooking.paymentStatus || '') ? t('booking.paidOnline', 'Đã thanh toán online') : selectedBooking.paymentStatus === 'paid_at_store' ? 'Đã thanh toán tại quán' : selectedBooking.paymentStatus === 'pending_online' ? 'Chờ quán xác nhận thanh toán' : t('booking.payAtCounterOnArrival', 'Thanh toán tại quầy khi đến')}
                    </span>
                  </div>

                  {selectedBooking.order?.subtotal && (
                    <div className="flex justify-between text-slate-500">
                      <span>{t('bookings.menuTotal', 'Tiền thực đơn:')}</span>
                      <span>{formatPrice(selectedBooking.order.subtotal)}</span>
                    </div>
                  )}

                  {selectedBooking.depositFee && (
                    <div className="flex justify-between text-slate-500">
                      <span>{t('bookings.depositFee', 'Phí cọc giữ chỗ:')}</span>
                      <span>{formatPrice(selectedBooking.depositFee)}</span>
                    </div>
                  )}

                  {selectedBooking.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>{t('bookings.voucherDiscount', 'Ưu đãi voucher:')}</span>
                      <span>-{formatPrice(selectedBooking.discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-[#2D231A] text-sm">
                    <span className="font-bold">{t('bookings.grandTotal', 'Tổng thanh toán:')}</span>
                    <span className={`font-black text-base ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>
                      {formatPrice(selectedBooking.grandTotal || selectedBooking.order?.total)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedBooking.shopNote && (
                <div className="rounded-xl border px-3 py-2 text-xs bg-slate-50 border-slate-200 text-slate-700 dark:bg-[#201A16] dark:border-[#3E3023] dark:text-stone-300">
                  <strong>{t('bookings.shopMessage', 'Lời nhắn từ quán:')}</strong> {selectedBooking.shopNote}
                </div>
              )}

              {(selectedBooking.liveStatus === 'pending' || selectedBooking.liveStatus === 'confirmed') && (
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => handleCancel(selectedBooking.id)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-60"
                >
                  {cancelling ? t('bookings.cancelling', 'Đang hủy…') : t('bookings.cancelBooking', 'Hủy lịch đặt bàn')}
                </button>
              )}

              {/* Action Buttons in Modal */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <a 
                  href={`tel:${selectedBooking.store?.phone || '19006868'}`}
                  className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    isLight ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200' : 'bg-[#251E18] border-[#3E3023] text-stone-200 hover:bg-[#322820]'
                  }`}
                >
                  <Phone size={14} />
                  <span>{t('bookings.callShop', 'Gọi cho quán')}</span>
                </a>

                <button 
                  type="button"
                  onClick={closeModal}
                  className={`py-3 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                    isLight ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B]' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E]'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>{t('bookings.doneSaved', 'Xong (Đã lưu vé)')}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
      {toast && (
        <div role="status" className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] px-4 py-2.5 rounded-xl shadow-xl bg-slate-900 text-white text-xs font-semibold max-w-[90vw]">
          {toast}
        </div>
      )}
    </div>
  );
}
