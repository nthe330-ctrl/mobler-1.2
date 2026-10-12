/**
 * The shop's own inbox, reading the same durable notifications as the customer app.
 *
 * The live bookings board already chimes for anything that happens while someone is
 * watching it. This is for the rest of the time: the shift that just started, the
 * tablet that was asleep, the owner checking from a phone at home.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { connectRealtime } from '@shared/api/realtime';
import { http } from '../../services/shopApi';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function ShopNotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await http.get<{ notifications: NotificationItem[]; unread: number }>('/me/notifications?limit=50');
      setItems(res.notifications || []);
      setUnread(res.unread || 0);
    } catch {
      // An unreachable inbox must never interrupt someone running a shift.
    }
  }, []);

  useEffect(() => {
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
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const markRead = async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread(u => Math.max(0, u - 1));
    try {
      const res = await http.post<{ unread: number }>(`/me/notifications/${id}/read`, {});
      setUnread(res.unread);
    } catch {
      refresh();
    }
  };

  const markAll = async () => {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    try {
      await http.post('/me/notifications/read-all', {});
    } catch {
      refresh();
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-label="Thông báo"
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(90vw,22rem)] max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl z-50">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <strong className="text-sm text-gray-900">Thông báo</strong>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button type="button" onClick={markAll} className="text-[11px] font-semibold text-sky-600 hover:underline">
                  Đánh dấu đã đọc hết
                </button>
              )}
              <button type="button" aria-label="Đóng" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-gray-400">Chưa có thông báo nào</p>
          ) : (
            <ul>
              {items.map(n => (
                <li key={n.id} className={`px-4 py-3 border-b border-gray-100 last:border-b-0 ${n.is_read ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">{n.title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{n.message}</p>
                      <p className="mt-1 text-[10px] text-gray-400">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <button type="button" aria-label="Đánh dấu đã đọc" onClick={() => markRead(n.id)} className="shrink-0 mt-0.5 text-gray-300 hover:text-gray-700">
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
