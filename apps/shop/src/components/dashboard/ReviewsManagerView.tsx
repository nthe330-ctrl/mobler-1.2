import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Search, 
  Filter, 
  ThumbsUp, 
  X, 
  CornerDownRight, 
  Sparkles,
  Calendar
} from 'lucide-react';
import { http } from '../../services/shopApi';
import { useShopAuth } from '../../context/ShopAuthContext';
import { useShopI18n } from '../../i18n/useShopI18n';
import { useApiError } from '../../i18n/apiError';
import { Review } from '../../types/dashboard';

export default function ReviewsManagerView() {
  // Real reviews customers left for this shop — none for a new shop.
  const { activeShop } = useShopAuth();
  const { t, tf, num } = useShopI18n();
  const apiError = useApiError();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  useEffect(() => {
    if (!activeShop) return;
    setLoadingReviews(true);
    http
      .get<{ reviews: Review[] }>(`/merchant/shops/${activeShop.id}/reviews`)
      .then(r => setReviews(r.reviews))
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  }, [activeShop?.id]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');
  const [replyText, setReplyText] = useState<{ [reviewId: string]: string }>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendReply = async (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text || !text.trim()) {
      alert(t('shop.rev.needText'));
      return;
    }
    try {
      await http.post(`/merchant/reviews/${reviewId}/reply`, { reply: text.trim() });
    } catch (err: any) {
      alert(apiError(err) || t('shop.rev.sendFailed'));
      return;
    }

    setReviews(prev => prev.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          shopReply: {
            content: text.trim(),
            date: t('shop.rev.justNow')
          }
        };
      }
      return r;
    }));

    setReplyText(prev => ({ ...prev, [reviewId]: '' }));
    triggerToast(t('shop.rev.sent'));
  };

  const filteredReviews = reviews.filter(r => {
    const matchSearch = r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRating = selectedRating === 'all' || r.rating === selectedRating;
    return matchSearch && matchRating;
  });

  const avgRating = reviews.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '—';
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const repliedCount = reviews.filter(r => r.shopReply).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[110] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-extrabold text-gray-900">{t('shop.rev.title')}</h2>
            <span className="bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
              <Star size={14} className="fill-amber-500 text-amber-500" />
              <span>{avgRating} / 5.0 sao</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {t('shop.rev.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Star size={24} className="fill-amber-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('shop.rev.statAvg')}</p>
            <p className="text-2xl font-black text-gray-900">{avgRating} / 5.0 ⭐</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('shop.rev.statFiveStar')}</p>
            <p className="text-2xl font-black text-emerald-600">{tf('shop.rev.fiveStarOf', { count: num(fiveStarCount), total: num(reviews.length) })}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('shop.rev.statReplied')}</p>
            <p className="text-2xl font-black text-blue-600">{reviews.length ? Math.round((repliedCount / reviews.length) * 100) : 0}% ({repliedCount}/{reviews.length})</p>
          </div>
        </div>
      </div>

      {/* Search & Rating Filter */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={t('shop.rev.searchPh')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
            <span className="text-gray-400 font-semibold mr-1">{t('shop.rev.filterStars')}</span>
            {(['all', 5, 4, 3, 2, 1] as const).map(rating => (
              <button
                key={rating}
                onClick={() => setSelectedRating(rating)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedRating === rating 
                    ? 'bg-amber-500 text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating === 'all' ? t('shop.rev.all') : `${rating} ⭐`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center text-sm text-gray-500">
            {loadingReviews ? t('shop.common.loading') : reviews.length === 0 ? t('shop.rev.empty') : t('shop.rev.noMatch')}
          </div>
        )}
        {filteredReviews.map(review => (
          <div key={review.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <img 
                  src={review.customerAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(review.customerName)}`} 
                  alt={review.customerName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{review.customerName}</h4>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={13} className={i < review.rating ? 'fill-amber-400' : 'text-gray-200'} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{review.date}</span>
                  </div>
                </div>
              </div>

              {review.shopReply ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                  {t('shop.rev.replied')}
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200">
                  {t('shop.rev.notReplied')}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-700 leading-relaxed pl-13">
              "{review.comment}"
            </p>

            {/* Shop reply display if existing */}
            {review.shopReply && (
              <div className="ml-10 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-gray-900">
                  <span className="flex items-center gap-1.5 text-red-600">
                    <CornerDownRight size={14} />
                    <span>{tf('shop.rev.replyByline', { shop: activeShop?.name || '' })}</span>
                  </span>
                  <span className="text-gray-400 text-[10px]">{review.shopReply.date}</span>
                </div>
                <p className="text-gray-600 pl-4">{review.shopReply.content}</p>
              </div>
            )}

            {/* Reply Input Box */}
            {!review.shopReply && (
              <div className="ml-10 pt-2 flex gap-2">
                <input 
                  type="text"
                  placeholder={t('shop.rev.replyPh')}
                  value={replyText[review.id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendReply(review.id);
                  }}
                  className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                />
                <button
                  onClick={() => handleSendReply(review.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Send size={14} />
                  <span>{t('shop.rev.send')}</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
