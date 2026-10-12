/**
 * The switch that lets notifications reach a closed app.
 *
 * It never nags: nothing is asked until the person presses it, and every way this
 * can be unavailable is explained in plain words instead of failing silently.
 */
import { useEffect, useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { currentPushState, enablePush, disablePush, PushState } from '../services/push';

export default function PushToggle() {
  const { t } = useLanguage();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    currentPushState().then(s => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);

  if (state === null) return null;

  const explain: Partial<Record<PushState, string>> = {
    'ios-needs-install': t(
      'push.iosHint',
      'Trên iPhone, thông báo chỉ chạy sau khi bạn thêm MOBLER vào màn hình chính: bấm nút Chia sẻ trong Safari rồi chọn "Thêm vào MH chính".'
    ),
    unsupported: t('push.unsupported', 'Trình duyệt này không hỗ trợ thông báo đẩy.'),
    'server-off': t('push.serverOff', 'Máy chủ chưa bật thông báo đẩy.'),
    denied: t('push.denied', 'Bạn đã chặn thông báo cho trang này. Hãy mở lại trong phần cài đặt của trình duyệt.')
  };

  const toggle = async () => {
    setBusy(true);
    try {
      setState(state === 'on' ? await disablePush() : await enablePush());
    } catch {
      setState(await currentPushState());
    } finally {
      setBusy(false);
    }
  };

  const switchable = state === 'on' || state === 'off';

  return (
    <div className="py-1">
      <label className="flex items-center justify-between py-1" style={{ cursor: switchable ? 'pointer' : 'default' }}>
        <span className="font-medium text-slate-700 dark:text-[#A48F7A] flex items-center gap-1.5">
          <BellRing size={13} />
          {t('push.label', 'Báo về điện thoại khi đã đóng ứng dụng')}
        </span>
        {busy ? (
          <Loader2 size={14} className="animate-spin opacity-60" />
        ) : (
          <input
            type="checkbox"
            disabled={!switchable}
            checked={state === 'on'}
            onChange={toggle}
            className="w-4 h-4 accent-red-700 disabled:opacity-40"
            style={{ cursor: switchable ? 'pointer' : 'not-allowed' }}
          />
        )}
      </label>
      {explain[state] && (
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-[#8A7563]">{explain[state]}</p>
      )}
      {state === 'on' && (
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-[#8A7563]">
          {t('push.onHint', 'Chỉ ba việc được báo: quán trả lời đơn, sắp đến giờ hẹn, và bàn sắp bị nhả. Khuyến mãi chỉ nằm im trong hộp thông báo.')}
        </p>
      )}
    </div>
  );
}
