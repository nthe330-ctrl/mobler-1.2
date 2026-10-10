import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '../services/shopApi';
import { useShopAuth } from '../context/ShopAuthContext';

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
  const [error, setError] = useState<string | null>(null);
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
        setError(null);
      })
      .catch(e => alive && setError(e.message))
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
          setError(null);
        })
        .catch(e => {
          if (seq !== saveSeq.current) return;
          // Roll back so the screen never shows something that was not saved.
          latest.current = previous;
          setItemsState(previous);
          setError(`Không lưu được: ${e.message}`);
        })
        .finally(() => seq === saveSeq.current && setSaving(false));
    },
    [shopId, kind]
  );

  return { items, setItems, loading, error, saving, shopId };
}

/** Upload an image picked from the device; returns a URL served by the backend. */
export async function uploadShopImage(shopId: string, file: File): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh'));
    reader.readAsDataURL(file);
  });
  const res = await http.post<{ url: string }>(`/merchant/shops/${shopId}/uploads`, { dataUrl });
  return res.url;
}
