import { useState } from 'react';
import { Heart, MessageCircle, Send, Loader2 } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import type { Review } from '@shared/types';
import { api } from '../services/api';

/**
 * One review, with its photos and the two things other guests can do with it: like it
 * and reply to it.
 *
 * The like state is never guessed locally. Tapping sends the toggle and takes the count
 * the server returns, because the server owns the set of people who liked — a local
 * ++/-- drifts the moment two devices disagree or a request fails.
 *
 * Shared by the shop page and the check-in diary so a review looks and behaves the same
 * in both places.
 */
export default function ReviewCard({
  review,
  isLight,
  canInteract,
  onRequireAuth,
  compact
}: {
  review: Review;
  isLight: boolean;
  /** False for a signed-out visitor: they can read, not act. */
  canInteract: boolean;
  onRequireAuth?: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [likes, setLikes] = useState(review.likes || 0);
  const [liked, setLiked] = useState(!!review.likedByMe);
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState(review.comment_list || []);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLike = async () => {
    if (!canInteract) return onRequireAuth?.();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.toggleReviewLike(review.id);
      setLikes(r.likes);
      setLiked(r.likedByMe);
    } catch (e: any) {
      setError(e?.message || t('review.likeFailed', 'Không gửi được, thử lại nhé.'));
    } finally {
      setBusy(false);
    }
  };

  const submitComment = async () => {
    const content = draft.trim();
    if (!content) return;
    if (!canInteract) return onRequireAuth?.();
    setSending(true);
    setError(null);
    try {
      const r = await api.addReviewComment(review.id, content);
      setComments(prev => [...prev, r.comment]);
      setDraft('');
    } catch (e: any) {
      setError(e?.message || t('review.commentFailed', 'Không gửi được bình luận, thử lại nhé.'));
    } finally {
      setSending(false);
    }
  };

  const muted = isLight ? 'text-slate-500' : 'text-[#A48F7A]';

  return (
    <div className={`rounded-xl border p-4 ${isLight ? 'bg-white border-black/5 shadow-xs' : 'bg-[#221A14] border-white/5'}`}>
      <div className="mb-2 flex items-center gap-3">
        {review.userAvatar
          ? <img src={review.userAvatar} alt="" className="h-8 w-8 rounded-full border border-black/10 object-cover" />
          : <div className="h-8 w-8 rounded-full bg-black/10" />}
        <div className="min-w-0">
          <p className="truncate text-xs font-bold">{review.userName}</p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-[#800020] dark:text-[#D4AF37]">
            {review.userSystemBadge || t('store.verifiedReviewer', 'Khách đã check-in')}
          </p>
        </div>
      </div>

      <p className="text-xs italic leading-relaxed opacity-80">"{review.content}"</p>

      {review.images?.length > 0 && (
        <div className={`mt-2.5 grid gap-1.5 ${review.images.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {review.images.map(src => (
            <a key={src} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
              <img
                src={src}
                alt={t('review.photoAlt', 'Ảnh khách chụp tại quán')}
                loading="lazy"
                className={`w-full object-cover ${review.images.length === 1 ? 'max-h-56' : 'h-24'}`}
              />
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy}
          aria-pressed={liked}
          aria-label={liked ? t('review.unlike', 'Bỏ thích') : t('review.like', 'Thích')}
          className={`flex items-center gap-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
            liked ? 'text-[#800020] dark:text-[#D4AF37]' : muted
          }`}
        >
          <Heart size={14} className={liked ? 'fill-current' : ''} />
          {likes > 0 && <span className="tabular-nums">{likes}</span>}
        </button>

        <button
          type="button"
          onClick={() => setShowComments(v => !v)}
          aria-expanded={showComments}
          className={`flex items-center gap-1.5 text-[11px] font-bold ${muted}`}
        >
          <MessageCircle size={14} />
          {comments.length > 0
            ? <span className="tabular-nums">{comments.length}</span>
            : <span>{t('review.comment', 'Bình luận')}</span>}
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-[11px] text-rose-600">{error}</p>}

      {showComments && (
        <div className={`mt-3 space-y-2 border-t pt-3 ${isLight ? 'border-black/5' : 'border-white/5'}`}>
          {comments.length === 0 && (
            <p className={`text-[11px] ${muted}`}>{t('review.noComments', 'Chưa có bình luận. Hãy là người đầu tiên.')}</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              {c.userAvatar
                ? <img src={c.userAvatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                : <div className="h-6 w-6 shrink-0 rounded-full bg-black/10" />}
              <div className="min-w-0">
                <p className="text-[11px] font-bold">{c.userName}</p>
                <p className="text-[11px] leading-relaxed opacity-80">{c.content}</p>
              </div>
            </div>
          ))}

          {!compact && (
            <div className="flex items-center gap-2 pt-1">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                maxLength={500}
                placeholder={t('review.commentPlaceholder', 'Viết bình luận…')}
                className={`min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-[#800020]/20 ${
                  isLight ? 'border-slate-200 bg-white' : 'border-[#2E241B] bg-[#14100D] text-stone-200'
                }`}
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={sending || !draft.trim()}
                aria-label={t('review.send', 'Gửi bình luận')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#800020] text-white disabled:opacity-40 dark:bg-[#D4AF37] dark:text-black"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
