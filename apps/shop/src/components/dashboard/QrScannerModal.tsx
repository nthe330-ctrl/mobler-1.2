import { useEffect, useRef, useState } from 'react';
import { Camera, Keyboard, Loader2, ScanLine, X } from 'lucide-react';

interface Props {
  open: boolean;
  /** Set once a decode succeeds. The caller validates the code and may call reset() to try again. */
  onDecode: (rawText: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Message surfaced inline (e.g. "mã không khớp") — set by the caller after a failed match. */
  errorMessage?: string | null;
  busy?: boolean;
}

type CamState = 'starting' | 'live' | 'denied' | 'unavailable' | 'no-decoder';

/**
 * Camera-based QR scanner. Uses only the browser's native BarcodeDetector API — no extra
 * npm dependency to keep in sync with the lockfile. Browsers without it (e.g. Safari) fall
 * back to manual code entry, which the caller still validates with an exact match — scanning
 * is a convenience, never a shortcut past the real check.
 */
export default function QrScannerModal({ open, onDecode, onClose, title, subtitle, errorMessage, busy }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [camState, setCamState] = useState<CamState>('starting');
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const lastDecodedRef = useRef<{ text: string; at: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let detector: any = null;
    let cancelled = false;

    const tryBarcodeDetector = () => {
      const BD = (window as any).BarcodeDetector;
      if (!BD) return null;
      try {
        return new BD({ formats: ['qr_code'] });
      } catch {
        return null;
      }
    };

    const scanLoop = async () => {
      if (cancelled || !videoRef.current || !canvasRef.current || !detector) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          let text: string | null = null;
          try {
            const codes = await detector.detect(canvas);
            text = codes?.[0]?.rawValue || null;
          } catch {
            // transient decode failure — just try again on the next frame
          }
          if (text) {
            const now = Date.now();
            const last = lastDecodedRef.current;
            // Debounce: the same code can decode on many consecutive frames.
            if (!last || last.text !== text || now - last.at > 1500) {
              lastDecodedRef.current = { text, at: now };
              onDecode(text);
            }
          }
        }
      }
      if (!cancelled) rafRef.current = requestAnimationFrame(scanLoop);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamState('unavailable');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        detector = tryBarcodeDetector();
        if (!detector) {
          // Camera works but this browser can't decode QR natively (e.g. Safari) — show the
          // feed anyway and default straight to manual entry so check-in isn't blocked.
          setCamState('no-decoder');
          setShowManual(true);
          return;
        }
        setCamState('live');
        rafRef.current = requestAnimationFrame(scanLoop);
      } catch {
        setCamState('denied');
      }
    };

    setCamState('starting');
    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210] bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-black text-gray-900 text-sm">{title || 'Quét mã QR nhận bàn'}</p>
            {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="relative bg-black aspect-square flex items-center justify-center">
          {(camState === 'live' || camState === 'no-decoder') && (
            <>
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              {camState === 'live' && (
                <>
                  <div className="absolute inset-8 border-2 border-emerald-400 rounded-2xl pointer-events-none" />
                  <ScanLine size={28} className="absolute text-emerald-400/80 animate-pulse" />
                </>
              )}
              {camState === 'no-decoder' && (
                <p className="absolute bottom-2 inset-x-2 text-[11px] text-white/80 text-center bg-black/50 rounded-lg py-1 px-2">
                  Trình duyệt này không tự quét được — nhập mã bên dưới.
                </p>
              )}
            </>
          )}
          {camState === 'starting' && (
            <div className="text-white/80 flex flex-col items-center gap-2 text-xs">
              <Loader2 size={24} className="animate-spin" /> Đang mở camera…
            </div>
          )}
          {(camState === 'denied' || camState === 'unavailable') && (
            <div className="text-white/80 flex flex-col items-center gap-2 text-xs text-center px-6">
              <Camera size={24} />
              {camState === 'denied'
                ? 'Không có quyền dùng camera. Hãy cho phép truy cập camera hoặc nhập mã bằng tay.'
                : 'Thiết bị này không hỗ trợ camera. Hãy nhập mã bằng tay.'}
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
          {busy && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2">
              <Loader2 size={18} className="animate-spin" /> Đang xác nhận…
            </div>
          )}
        </div>

        {errorMessage && (
          <p className="px-4 pt-3 text-xs font-bold text-rose-600 text-center">{errorMessage}</p>
        )}

        <div className="p-4 space-y-2">
          {!showManual ? (
            <button
              onClick={() => setShowManual(true)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-gray-50"
            >
              <Keyboard size={14} /> Nhập mã đặt bàn bằng tay
            </button>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); if (manualCode.trim()) onDecode(manualCode.trim()); }}
              className="flex gap-2"
            >
              <input
                autoFocus
                value={manualCode}
                onChange={e => setManualCode(e.target.value.toUpperCase())}
                placeholder="VD: BK-AB12CD"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <button type="submit" disabled={!manualCode.trim() || busy} className="px-4 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-50">
                Xác nhận
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
