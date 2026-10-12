/**
 * The inbox that outlives the tab.
 *
 * The realtime stream only reaches a screen that is open right now, but the things
 * it carries — the shop answered, your table was released — matter most to someone
 * who had already closed the app. Those are written down on the server, and this is
 * where they are read back.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { api, http } from '../services/api';
import { connectRealtime } from '@shared/api/realtime';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useTheme } from '@shared/context/ThemeContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string, t: (k: string, f?: string) => string): string {
  const mins = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return t('notif.justNow', 'vừa xong');
  if (mins < 60) return `${mins} ${t('notif.minutesAgo', 'phút trước')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t('notif.hoursAgo', 'giờ trước')}`;
  return `${Math.floor(hours / 24)} ${t('notif.daysAgo', 'ngày trước')}`;
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.getNotifications(50);
      setItems(res.notifications || []);
      setUnread(res.unread || 0);
    } catch {
      // An unreachable inbox is not worth interrupting anyone over.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnread(0);
      return;
    }
    refresh();
    const stop = connectRealtime({
      http,
      onEvent: (event) => {
        if (event === 'notification' || event === 'booking') refresh();
      }
    });
    const onFocus = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      stop();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [isAuthenticated, refresh]);

  // Clicking anywhere else closes the panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!isAuthenticated) return null;

  const handleRead = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread(u => Math.max(0, u - 1));
    try {
      const res = await api.markNotificationRead(id);
      setUnread(res.unread);
    } catch {
      refresh();
    }
  };

  const handleReadAll = async () => {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    try {
      await api.markAllNotificationsRead();
    } catch {
      refresh();
    }
  };

  return (
    <div ref={panelRef} className="fixed top-3 right-3 z-[60]">
      <button
        type="button"
        aria-label={t('notif.title', 'Thông báo')}
        onClick={() => setOpen(o => !o)}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-xl transition ${
          isLight
            ? 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white'
            : 'bg-[#1A1512]/90 border-[#3E3023] text-stone-200 hover:bg-[#241C17]'
        }`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 mt-2 w-[min(88vw,22rem)] max-h-[70vh] overflow-y-auto rounded-2xl border shadow-2xl ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
          }`}
        >
          <div className={`sticky top-0 flex items-center justify-between px-4 py-3 border-b ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#15110E] border-[#3E3023]'
          }`}>
            <strong className="text-sm">{t('notif.title', 'Thông báo')}</strong>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleReadAll}
                  className="text-[11px] font-semibold text-sky-600 hover:underline"
                >
                  {t('notif.markAll', 'Đánh dấu đã đọc hết')}
                </button>
              )}
              <button type="button" aria-label={t('common.close', 'Đóng')} onClick={() => setOpen(false)} className="opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs opacity-60">
              {t('notif.empty', 'Chưa có thông báo nào')}
            </p>
          ) : (
            <ul>
              {items.map(n => (
                <li
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-b-0 ${
                    isLight ? 'border-slate-100' : 'border-[#2A211B]'
                  } ${n.is_read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">{n.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed opacity-80">{n.message}</p>
                      <p className="mt-1 text-[10px] opacity-50">{timeAgo(n.created_at, t)}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        type="button"
                        aria-label={t('notif.markOne', 'Đánh dấu đã đọc')}
                        onClick={() => handleRead(n.id)}
                        className="shrink-0 mt-0.5 opacity-50 hover:opacity-100"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
