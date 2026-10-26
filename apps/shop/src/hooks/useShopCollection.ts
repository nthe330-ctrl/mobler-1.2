import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '../services/shopApi';
import { ApiError } from '@shared/api/http';
import { useShopAuth } from '../context/ShopAuthContext';
import { useApiError } from '../i18n/apiError';
import { useShopI18n } from '../i18n/useShopI18n';

type Updater<T> = T[] | ((prev: T[]) => T[]);

/**
 * A list owned by the active shop (menu, vouchers) that lives on the server.
 * Works like useState: every change is saved right away. A brand-new shop gets an
 * empty list — no sample data.
 */
export function useShopCollection<T>(kind: 'menu' | 'vouchers') {
  const { activeShop } = useShopAuth();
  const shopId = activeShop?.id;
  const [items, setItemsState] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  // Kept as {what failed, the thrown object} rather than a finished sentence, so the
  // message is written at render time and follows a language change — see useInsights.
  const [failure, setFailure] = useState<{ kind: 'load' | 'save'; err: unknown } | null>(null);
  const apiError = useApiError();
  const { tf } = useShopI18n();
  const [saving, setSaving] = useState(false);
  const latest = useRef<T[]>([]);
  const saveSeq = useRef(0);

  useEffect(() => {
    if (!shopId) return;
    let alive = true;
    setLoading(true);
    http
      .get<{ items: T[] }>(`/merchant/shops/${shopId}/${kind}`)
      .then(r => {
        if (!alive) return;
        latest.current = r.items;
        setItemsState(r.items);
        setFailure(null);
      })
      .catch(e => alive && setFailure({ kind: 'load', err: e }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [shopId, kind]);

  const setItems = useCallback(
    (update: Updater<T>) => {
      const next = typeof update === 'function' ? (update as (p: T[]) => T[])(latest.current) : update;
      const previous = latest.current;
      latest.current = next;
      setItemsState(next);
      if (!shopId) return;
      const seq = ++saveSeq.current;
      setSaving(true);
      http
        .put<{ items: T[] }>(`/merchant/shops/${shopId}/${kind}`, { items: next })
        .then(r => {
          if (seq !== saveSeq.current) return;
          latest.current = r.items;
          setItemsState(r.items);
          setFailure(null);
        })
        .catch(e => {
          if (seq !== saveSeq.current) return;
          // Roll back so the screen never shows something that was not saved.
          latest.current = previous;
          setItemsState(previous);
          setFailure({ kind: 'save', err: e });
        })
        .finally(() => seq === saveSeq.current && setSaving(false));
    },
    [shopId, kind]
  );

  const error = failure
    ? tf(failure.kind === 'save' ? 'shop.error.saveFailed' : 'shop.error.loadFailed', {
        reason: apiError(failure.err)
      })
    : null;

  return { items, setItems, loading, error, saving, shopId };
}

/** Upload an image picked from the device; returns a URL served by the backend. */
export async function uploadShopImage(shopId: string, file: File): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    // Thrown as an ApiError even though no request happened, so the screens that show it
    // translate it the same way as a server failure instead of special-casing this one.
    reader.onerror = () =>
      reject(new ApiError('Không đọc được tệp ảnh', 0, { code: 'FILE_UNREADABLE' }));
    reader.readAsDataURL(file);
  });
  const res = await http.post<{ url: string }>(`/merchant/shops/${shopId}/uploads`, { dataUrl });
  return res.url;
}
