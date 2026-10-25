import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, BellRing, CalendarDays, ChevronLeft, ChevronRight, Clock, Coffee, Lock, LockOpen,
  Phone, RefreshCw, StickyNote, Users, X, CheckCheck, Armchair, ScanLine
} from 'lucide-react';
import { CoffeeShop } from '@shared/types';
import {
  AvailabilityResponse, BookingDTO, BookingStatus, TableOperationalStatus,
  isActiveBooking, slotsOverlap, timeToMinutes, toIsoDate
} from '@shared/booking';
import { connectRealtime, RealtimeStatus } from '@shared/api/realtime';
import { http, shopApi } from '../services/shopApi';
import { useShopAuth } from '../context/ShopAuthContext';
import IncomingOrderModal from '../components/dashboard/IncomingOrderModal';
import QrScannerModal from '../components/dashboard/QrScannerModal';
import { useMoney } from '../hooks/useMoney';
import { useShopI18n } from '../i18n/useShopI18n';

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  arrived: 'bg-sky-100 text-sky-800 border-sky-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  no_show: 'bg-orange-50 text-orange-800 border-orange-300'
};

const TABLE_STYLE: Record<string, string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  reserved: 'border-amber-300 bg-amber-50 text-amber-900',
  occupied: 'border-sky-300 bg-sky-50 text-sky-900',
  locked: 'border-gray-300 bg-gray-100 text-gray-500'
};
/** Dictionary keys, not labels: the words themselves depend on who is reading. */
const TABLE_LABEL_KEY: Record<string, string> = {
  available: 'shop.table.available',
  reserved: 'shop.table.reserved',
  occupied: 'shop.table.occupied',
  locked: 'shop.table.locked'
};

function shiftDate(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function playChime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.32);
    });
  } catch {
    // audio not allowed yet
  }
}

interface Props {
  shop: CoffeeShop;
  onPendingCountChange?: (count: number) => void;
}

export default function LiveBookingsView({ shop, onPendingCountChange }: Props) {
  const { money } = useMoney();
  const { t, tf, fmtDate, num, statusLabel } = useShopI18n();
  const { replaceShop } = useShopAuth();
  const [date, setDate] = useState<string>(toIsoDate(new Date()));
  const [clock, setClock] = useState<{ today: string; now: string } | null>(null);
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [tables, setTables] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<RealtimeStatus>('connecting');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: 'new' | 'info' | 'error' } | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [showClosed, setShowClosed] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const today = clock?.today || toIsoDate(new Date());
  const dateRef = useRef(date);
  dateRef.current = date;

  const showToast = (text: string, tone: 'new' | 'info' | 'error' = 'info') => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(prev => (prev?.text === text ? null : prev)), 6000);
  };

  const loadTables = useCallback(async () => {
    try {
      setTables(await shopApi.getTables(shop.id, dateRef.current));
    } catch {
      // keep previous board
    }
  }, [shop.id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, board] = await Promise.all([shopApi.getBookings(shop.id, date), shopApi.getTables(shop.id, date)]);
      setBookings(b.bookings);
      setClock(b.clock);
      setTables(board);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('shop.live.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [shop.id, date, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Pending requests across all days (for the sidebar badge).
  const [pendingAll, setPendingAll] = useState<BookingDTO[]>([]);
  const loadPendingAll = useCallback(async () => {
    try {
      const res = await shopApi.getBookings(shop.id);
      setPendingAll(res.bookings.filter(b => b.status === 'pending'));
    } catch {
      // ignore
    }
  }, [shop.id]);
  useEffect(() => {
    loadPendingAll();
  }, [loadPendingAll]);
  useEffect(() => {
    onPendingCountChange?.(pendingAll.length);
  }, [pendingAll.length]);

  // ----- Real-time subscription -----
  // The subscription is keyed on shop.id alone: re-running this effect tears down the SSE
  // connection and would drop events. So the language-dependent formatters used inside it
  // are read through refs — a staff member switching language keeps their live feed, and
  // the next toast is already in the new language.
  const handlers = useRef({ loadTables, loadPendingAll });
  handlers.current = { loadTables, loadPendingAll };
  const tfRef = useRef(tf);
  tfRef.current = tf;
  const fmtDateRef = useRef(fmtDate);
  fmtDateRef.current = fmtDate;
  useEffect(() => {
    return connectRealtime({
      http,
      shops: [shop.id],
      onStatus: setLive,
      onEvent: (event, data) => {
        if (event === 'ready') {
          handlers.current.loadTables();
          handlers.current.loadPendingAll();
        }
        if (event === 'booking' && data?.booking?.shop_id === shop.id) {
          const b: BookingDTO = data.booking;
          if (b.date === dateRef.current) {
            setBookings(prev => {
              const exists = prev.some(x => x.id === b.id);
              const next = exists ? prev.map(x => (x.id === b.id ? b : x)) : [...prev, b];
              return next.sort((x, y) => x.time.localeCompare(y.time));
            });
          }
          setPendingAll(prev => {
            const rest = prev.filter(x => x.id !== b.id);
            return b.status === 'pending' ? [...rest, b] : rest;
          });
          if (data.action === 'created') {
            setFlashIds(prev => new Set(prev).add(b.id));
            window.setTimeout(() => setFlashIds(prev => { const n = new Set(prev); n.delete(b.id); return n; }), 8000);
            playChime();
            const when = { name: b.user_name, guests: b.guests, time: b.time, date: fmtDateRef.current(b.date) };
            showToast(tfRef.current('shop.live.newBookingToast', when), 'new');
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification(tfRef.current('shop.live.notifyTitle'), {
                  body: tfRef.current('shop.live.notifyBody', when)
                });
              } catch {
                // ignore
              }
            }
          } else if (b.status === 'cancelled' && b.status_history?.at(-1)?.by === 'customer') {
            showToast(
              tfRef.current('shop.live.customerCancelled', {
                name: b.user_name,
                time: b.time,
                date: fmtDateRef.current(b.date)
              }),
              'info'
            );
          }
          handlers.current.loadTables();
        }
        if (event === 'table' || event === 'availability') handlers.current.loadTables();
      }
    });
  }, [shop.id]);

  // Keep "now" fresh so the floor board reflects the current hour.
  useEffect(() => {
    const id = window.setInterval(loadTables, 60_000);
    return () => window.clearInterval(id);
  }, [loadTables]);

  const changeStatus = async (b: BookingDTO, status: BookingStatus) => {
    let note: string | undefined;
    // The incoming-order modal has an explicit Reject action. Do not put a
    // browser prompt between that click and the API request: embedded browsers
    // can suppress prompts, leaving the pending order stuck in the modal.
    if (status === 'cancelled') {
      const input = window.prompt(t('shop.live.cancelReasonPrompt'), t('shop.live.cancelReasonDefault'));
      if (input === null) return;
      note = input.trim() || t('shop.live.cancelReasonFallback');
    } else if (status === 'rejected') {
      note = t('shop.live.rejectNote');
    }
    setBusyId(b.id);
    try {
      const res = await shopApi.setBookingStatus(b.id, status, note);
      setBookings(prev => prev.map(x => (x.id === b.id ? res.booking : x)));
      setPendingAll(prev => prev.filter(x => x.id !== b.id || res.booking.status === 'pending'));
      if (status === 'rejected') showToast(t('shop.live.rejectedToast'), 'info');
    } catch (err: any) {
      showToast(err?.message || t('shop.live.updateFailed'), 'error');
      load();
    } finally {
      setBusyId(null);
    }
  };

  const setTableStatus = async (code: string, status: TableOperationalStatus) => {
    try {
      await shopApi.setTableStatus(shop.id, code, status);
      loadTables();
    } catch (err: any) {
      showToast(err?.message || t('shop.live.tableUpdateFailed'), 'error');
    }
  };

  // ----- Camera QR check-in: scanning is the ONLY way a confirmed booking becomes "arrived".
  // expectedId narrows the scan to one specific card; omitted for the header's walk-up scanner. -----
  const [scanner, setScanner] = useState<{ expectedId?: string } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);

  const parseScannedCode = (raw: string) => {
    const trimmed = raw.trim();
    const m = /^MOBLER-BOOKING:(.+)$/i.exec(trimmed);
    return (m ? m[1] : trimmed).toUpperCase();
  };

  const handleScanDecode = async (raw: string) => {
    if (scanBusy) return;
    const code = parseScannedCode(raw);
    setScanBusy(true);
    setScanError(null);
    try {
      let found = [...bookings, ...pendingAll].find(x => x.id.toUpperCase() === code);
      if (!found) {
        const all = await shopApi.getBookings(shop.id);
        found = all.bookings.find(x => x.id.toUpperCase() === code);
      }
      if (!found) {
        setScanError(t('shop.live.scanInvalid'));
        return;
      }
      if (scanner?.expectedId && found.id !== scanner.expectedId) {
        setScanError(tf('shop.live.scanMismatch', { id: scanner.expectedId }));
        return;
      }
      if (found.status === 'pending') {
        setScanError(t('shop.live.scanNotConfirmed'));
        return;
      }
      if (found.status === 'arrived') {
        setScanError(tf('shop.live.scanAlreadyIn', { name: found.user_name }));
        return;
      }
      if (found.status !== 'confirmed') {
        setScanError(tf('shop.live.scanWrongStatus', { status: statusLabel(found.status) }));
        return;
      }
      // Quét mã thành công = mới tính là đã hoàn thành nhận bàn — không có đường tắt nào khác.
      const res = await shopApi.setBookingStatus(found.id, 'arrived');
      setBookings(prev => prev.map(x => (x.id === found!.id ? res.booking : x)));
      setPendingAll(prev => prev.filter(x => x.id !== found!.id));
      setScanner(null);
      showToast(tf('shop.live.scanOk', { name: found.user_name }), 'new');
    } catch (err: any) {
      setScanError(err?.message || t('shop.live.scanRetry'));
    } finally {
      setScanBusy(false);
    }
  };

  const toggleSetting = async (key: 'acceptingBookings' | 'autoConfirm') => {
    const current = shop.bookingSettings || { autoConfirm: false, acceptingBookings: true, slotDurationMin: 120 };
    try {
      const res = await shopApi.updateShop(shop.id, { bookingSettings: { ...current, [key]: !current[key] } });
      replaceShop(res.shop);
    } catch (err: any) {
      showToast(err?.message || t('shop.live.settingSaveFailed'), 'error');
    }
  };

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    setNotifyPermission(await Notification.requestPermission());
    playChime();
  };

  // ----- Derived data -----
  const dayBookings = useMemo(
    () => bookings.filter(b => b.status !== 'pending' && (showClosed || isActiveBooking(b.status))).sort((a, b) => a.time.localeCompare(b.time)),
    [bookings, showClosed]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, confirmed: 0, arrived: 0, total: 0, guests: 0 };
    bookings.forEach(b => {
      c[b.status] = (c[b.status] || 0) + 1;
      if (isActiveBooking(b.status) || b.status === 'completed') {
        c.total += 1;
        c.guests += b.guests;
      }
    });
    return c;
  }, [bookings]);

  const pendingSorted = [...pendingAll].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const boardTime = date === today ? clock?.now || '00:00' : '00:00';
  const tableBoard = useMemo(() => {
    if (!tables) return [];
    return tables.tables.map(t => {
      const upcoming = tables.reservations
        .filter(r => r.table_id === t.id && (date !== today || timeToMinutes(r.time) + tables.slot_duration_min > timeToMinutes(boardTime)))
        .sort((a, b) => a.time.localeCompare(b.time));
      let state: string = t.operational_status;
      if (state === 'available' && date === today && upcoming.some(r => slotsOverlap(r.time, boardTime, tables.slot_duration_min))) {
        state = 'reserved';
      }
      return { ...t, state, upcoming };
    });
  }, [tables, date, today, boardTime]);

  const renderCard = (b: BookingDTO) => {
            const isFlash = flashIds.has(b.id);
            const busy = busyId === b.id;
            return (
              <article
                key={b.id}
                className={`bg-white rounded-2xl border p-4 transition-all ${
                  isFlash ? 'border-amber-400 ring-4 ring-amber-200/70 shadow-lg' : b.status === 'pending' ? 'border-amber-300' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="sm:w-20 shrink-0 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0">
                    <p className="text-xl font-black text-gray-900 tabular-nums">{b.time}</p>
                    {b.date !== date && <p className="text-[11px] font-bold text-amber-700">{fmtDate(b.date)}</p>}
                    <p className="text-[11px] font-semibold text-gray-500">{b.table_id?.toUpperCase()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-gray-900">{b.user_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[b.status]}`}>{statusLabel(b.status)}</span>
                      {isFlash && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">{t('shop.live.newBadge')}</span>}
                      <span className="text-[11px] font-mono text-gray-400">{b.id}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1"><Users size={13} /> {tf('shop.live.guestsCount', { count: b.guests })}</span>
                      <span className="flex items-center gap-1"><Armchair size={13} /> {b.table_name}</span>
                      <a href={`tel:${b.user_phone}`} className="flex items-center gap-1 text-red-700 font-semibold"><Phone size={13} /> {b.user_phone}</a>
                    </div>
                    {b.note && <p className="mt-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-2.5 py-1.5 flex gap-1.5"><StickyNote size={13} className="shrink-0 mt-0.5 text-gray-400" /> {b.note}</p>}
                    {b.order?.items?.length ? (
                      <details className="mt-2 text-xs text-gray-700">
                        <summary className="cursor-pointer font-semibold flex items-center gap-1.5">
                          <Coffee size={13} className="text-amber-600" />
                          {tf('shop.live.preorder', {
                            count: b.order.items.reduce((s, i) => s + i.quantity, 0),
                            // The booking's own currency, not today's setting: see BookingDTO.currency_code.
                            total: money(b.grand_total || b.order.total, b.currency_code)
                          })}
                        </summary>
                        <ul className="mt-1.5 pl-5 list-disc space-y-0.5">
                          {b.order.items.map((i, idx) => <li key={idx}>{i.quantity}× {i.name} <span className="text-gray-400">{i.options}</span></li>)}
                        </ul>
                      </details>
                    ) : null}
                    {b.shop_note && <p className="mt-2 text-[11px] text-gray-500">{tf('shop.live.shopNote', { note: b.shop_note })}</p>}
                  </div>
                  <div className="flex sm:flex-col gap-2 sm:w-36 shrink-0">
                    {b.status === 'pending' && (
                      // The call-style IncomingOrderModal below is the ONLY way to accept/reject —
                      // this just reflects that a decision is pending, it isn't a second path.
                      <span className="flex-1 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold flex items-center justify-center gap-1.5">
                        <Phone size={13} className="animate-pulse" /> {t('shop.live.waitingConfirm')}
                      </span>
                    )}
                    {b.status === 'confirmed' && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => { setScanner({ expectedId: b.id }); setScanError(null); }}
                          className="flex-1 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <ScanLine size={14} /> {t('shop.live.scanToCheckIn')}
                        </button>
                        <button disabled={busy} onClick={() => changeStatus(b, 'cancelled')} className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold disabled:opacity-50">{t('shop.live.cancelBooking')}</button>
                      </>
                    )}
                    {b.status === 'arrived' && (
                      <button disabled={busy} onClick={() => changeStatus(b, 'completed')} className="flex-1 px-3 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"><CheckCheck size={14} /> {t('shop.live.complete')}</button>
                    )}
                  </div>
                </div>
              </article>
            );
  };

  const accepting = shop.bookingSettings?.acceptingBookings !== false;
  const autoConfirm = !!shop.bookingSettings?.autoConfirm;

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-900">{t('shop.live.title')}</h2>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              live === 'live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${live === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {live === 'live' ? 'LIVE' : t('shop.live.connecting')}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('shop.live.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-gray-200 bg-white">
            <button className="p-2 text-gray-600 hover:text-red-700" onClick={() => setDate(d => shiftDate(d, -1))} aria-label={t('shop.live.prevDay')}><ChevronLeft size={18} /></button>
            <label className="flex items-center gap-1.5 px-2 text-sm font-bold text-gray-800">
              <CalendarDays size={15} className="text-red-600" />
              <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="bg-transparent focus:outline-none" />
            </label>
            <button className="p-2 text-gray-600 hover:text-red-700" onClick={() => setDate(d => shiftDate(d, 1))} aria-label={t('shop.live.nextDay')}><ChevronRight size={18} /></button>
          </div>
          {date !== today && (
            <button onClick={() => setDate(today)} className="px-3 py-2 rounded-xl text-sm font-bold bg-red-600 text-white">{t('shop.live.today')}</button>
          )}
          <button onClick={() => { load(); loadPendingAll(); }} className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-red-700" aria-label={t('shop.live.reload')}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {notifyPermission === 'default' && (
            <button onClick={enableNotifications} className="px-3 py-2 rounded-xl text-sm font-bold border border-gray-200 bg-white text-gray-700 flex items-center gap-1.5">
              <Bell size={15} /> {t('shop.live.enableSound')}
            </button>
          )}
          <button
            onClick={() => { setScanner({}); setScanError(null); }}
            className="px-3 py-2 rounded-xl text-sm font-bold bg-gray-900 hover:bg-black text-white flex items-center gap-1.5"
          >
            <ScanLine size={15} /> {t('shop.live.scanQrHeader')}
          </button>
        </div>
      </div>

      {/* Settings strip */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => toggleSetting('acceptingBookings')} className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${
          accepting ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-100 border-gray-300 text-gray-600'
        }`}>
          <span className={`w-8 h-4 rounded-full relative transition ${accepting ? 'bg-emerald-500' : 'bg-gray-400'}`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${accepting ? 'left-4' : 'left-0.5'}`} />
          </span>
          {accepting ? t('shop.live.acceptingOn') : t('shop.live.acceptingOff')}
        </button>
        <button onClick={() => toggleSetting('autoConfirm')} className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${
          autoConfirm ? 'bg-sky-50 border-sky-200 text-sky-800' : 'bg-white border-gray-200 text-gray-700'
        }`}>
          <span className={`w-8 h-4 rounded-full relative transition ${autoConfirm ? 'bg-sky-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${autoConfirm ? 'left-4' : 'left-0.5'}`} />
          </span>
          {t('shop.live.autoConfirm')}
        </button>
        <span className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-600 flex items-center gap-1.5">
          <Clock size={13} /> {tf('shop.live.holdMinutes', { minutes: shop.bookingSettings?.slotDurationMin || 120 })}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('shop.live.statPending'), value: counts.pending, tone: 'text-amber-600' },
          { label: t('shop.live.statConfirmed'), value: counts.confirmed, tone: 'text-emerald-600' },
          { label: t('shop.live.statServing'), value: counts.arrived, tone: 'text-sky-600' },
          {
            label: date === today ? t('shop.live.statGuestsToday') : tf('shop.live.statGuestsOn', { date: fmtDate(date) }),
            value: counts.guests,
            tone: 'text-gray-900'
          }
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500">{s.label}</p>
            {/* num(), not money(): a head count is not an amount and must never pick up a currency symbol. */}
            <p className={`text-2xl font-black mt-1 tabular-nums ${s.tone}`}>{num(s.value)}</p>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="font-bold underline">{t('shop.live.retry')}</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Booking list */}
        <section className="xl:col-span-2 space-y-3">
          {pendingSorted.length > 0 && (
            <div className="space-y-3 pb-3">
              <h3 className="font-black text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {tf('shop.live.pendingHeading', { count: pendingSorted.length })}
              </h3>
              {pendingSorted.map(renderCard)}
            </div>
          )}
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900">
              {date === today ? t('shop.live.scheduleToday') : tf('shop.live.scheduleOn', { date: fmtDate(date) })}
            </h3>
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} className="accent-red-600" />
              {t('shop.live.showClosed')}
            </label>
          </div>

          {!loading && dayBookings.length === 0 && pendingSorted.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
              <CalendarDays size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-700">{t('shop.live.emptyTitle')}</p>
              <p className="text-sm mt-1">{t('shop.live.emptyBody')}</p>
            </div>
          )}

          {dayBookings.map(renderCard)}
        </section>

        {/* Table board */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900">
              {date === today
                ? tf('shop.live.boardAt', { time: boardTime })
                : tf('shop.live.boardOn', { date: fmtDate(date) })}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {tableBoard.map(tbl => (
              <div key={tbl.id} className={`rounded-2xl border p-3 ${TABLE_STYLE[tbl.state] || TABLE_STYLE.available}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black text-sm">{tbl.id.toUpperCase()}</p>
                    <p className="text-[11px] opacity-80">
                      {tf('shop.live.seatsFloor', {
                        seats: tbl.seats,
                        floor: t(tbl.id <= 't4' ? 'shop.live.floor1' : 'shop.live.floor2')
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => setTableStatus(tbl.id, tbl.operational_status === 'locked' ? 'available' : 'locked')}
                    className="p-1.5 rounded-lg hover:bg-black/5"
                    title={t(tbl.operational_status === 'locked' ? 'shop.live.unlockTable' : 'shop.live.lockTableTitle')}
                    aria-label={t(tbl.operational_status === 'locked' ? 'shop.live.unlockTable' : 'shop.live.lockTable')}
                  >
                    {tbl.operational_status === 'locked' ? <LockOpen size={14} /> : <Lock size={14} />}
                  </button>
                </div>
                <p className="text-[11px] font-bold mt-2">{t(TABLE_LABEL_KEY[tbl.state] || TABLE_LABEL_KEY.available)}</p>
                {tbl.upcoming.length > 0 && (
                  <p className="text-[11px] mt-0.5 opacity-80">
                    {tf('shop.live.tableUpcoming', { times: tbl.upcoming.map(r => r.time).join(', ') })}
                  </p>
                )}
                {date === today && tbl.operational_status !== 'locked' && (
                  <button
                    onClick={() => setTableStatus(tbl.id, tbl.operational_status === 'occupied' ? 'available' : 'occupied')}
                    className="mt-2 w-full text-[11px] font-bold py-1.5 rounded-lg bg-white/70 hover:bg-white border border-black/5"
                  >
                    {t(tbl.operational_status === 'occupied' ? 'shop.live.tableFreeNow' : 'shop.live.tableWalkIn')}
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">{t('shop.live.boardHint')}</p>
        </section>
      </div>

      {toast && (
        <div role="status" className={`fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-sm z-[70] rounded-2xl shadow-2xl px-4 py-3 text-sm font-semibold flex items-start gap-2.5 ${
          toast.tone === 'new' ? 'bg-amber-500 text-white' : toast.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.tone === 'new' ? <BellRing size={18} className="shrink-0" /> : <Bell size={18} className="shrink-0" />}
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} aria-label={t('shop.live.close')}><X size={16} /></button>
        </div>
      )}

      {/* Blocking, ringing "incoming call" gate — the ONLY way a PENDING request leaves this
          screen is the shop explicitly choosing Xác nhận or Từ chối here. Processes the oldest
          unresolved request first; the next one (if any) takes over as soon as this resolves. */}
      {pendingSorted.length > 0 && (
        <IncomingOrderModal
          key={pendingSorted[0].id}
          booking={pendingSorted[0]}
          queueCount={pendingSorted.length}
          busy={busyId === pendingSorted[0].id}
          onAccept={() => changeStatus(pendingSorted[0], 'confirmed')}
          onReject={() => changeStatus(pendingSorted[0], 'rejected')}
        />
      )}

      {/* Camera check-in: scanning the customer's real booking QR is the only way a confirmed
          booking becomes "arrived" — see handleScanDecode. */}
      <QrScannerModal
        open={!!scanner}
        title={scanner?.expectedId ? t('shop.live.scanQrHeader') : t('shop.live.scanTitleAny')}
        subtitle={
          scanner?.expectedId
            ? tf('shop.live.scanSubOne', { id: scanner.expectedId })
            : t('shop.live.scanSubAny')
        }
        errorMessage={scanError}
        busy={scanBusy}
        onDecode={handleScanDecode}
        onClose={() => { setScanner(null); setScanError(null); }}
      />
    </div>
  );
}
