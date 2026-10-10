import { useEffect, useState, FormEvent } from 'react';
import { Check, Loader2, Store } from 'lucide-react';
import { CoffeeShop } from '@shared/types';
import { shopApi } from '../services/shopApi';
import { useShopAuth } from '../context/ShopAuthContext';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15';

/** Real shop profile, saved to the shared backend and shown in the customer app. */
export default function ShopProfileView({ shop }: { shop: CoffeeShop }) {
  const { replaceShop, user } = useShopAuth();
  const [form, setForm] = useState(() => toForm(shop));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(toForm(shop)), [shop.id]);

  const set = (k: keyof ReturnType<typeof toForm>) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm(f => ({ ...f, [k]: e.target.value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return setError('Tên và địa chỉ quán là bắt buộc');
    if (form.coverImage && !/^https:\/\//.test(form.coverImage)) return setError('Ảnh bìa cần là đường dẫn https://');
    setSaving(true);
    setError(null);
    try {
      const res = await shopApi.updateShop(shop.id, {
        name: form.name.trim(),
        address: form.address.trim(),
        phoneNumber: form.phone.trim(),
        website: form.website.trim(),
        description: form.description.trim(),
        coverImage: form.coverImage.trim() || shop.coverImage,
        images: form.coverImage.trim() ? [form.coverImage.trim(), ...(shop.images || []).filter(i => i !== form.coverImage.trim())] : shop.images,
        openingHours: [{ day: 'Hằng ngày', time: form.openingHours.trim() || '07:00 - 22:00' }],
        bookingSettings: {
          ...(shop.bookingSettings || { autoConfirm: false, acceptingBookings: true, slotDurationMin: 120 }),
          slotDurationMin: Number(form.slotDurationMin) || 120
        }
      });
      replaceShop(res.shop);
      setSaved(true);
    } catch (err: any) {
      setError(err?.message || 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5 pb-10">
      <div>
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Store className="text-red-600" /> Hồ sơ quán</h2>
        <p className="text-sm text-gray-500 mt-1">Thông tin này hiển thị cho khách trên ứng dụng Mobler.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {form.coverImage && <img src={form.coverImage} alt="" className="w-full h-40 object-cover" referrerPolicy="no-referrer" />}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">Tên quán *</span><input className={inputCls} value={form.name} onChange={set('name')} /></label>
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">Địa chỉ *</span><input className={inputCls} value={form.address} onChange={set('address')} /></label>
          <label><span className="block text-xs font-bold text-gray-700 mb-1.5">Số điện thoại quán</span><input className={inputCls} value={form.phone} onChange={set('phone')} /></label>
          <label><span className="block text-xs font-bold text-gray-700 mb-1.5">Giờ mở cửa</span><input className={inputCls} value={form.openingHours} onChange={set('openingHours')} /></label>
          <label><span className="block text-xs font-bold text-gray-700 mb-1.5">Website</span><input className={inputCls} value={form.website} onChange={set('website')} /></label>
          <label>
            <span className="block text-xs font-bold text-gray-700 mb-1.5">Thời gian giữ bàn mỗi lượt</span>
            <select className={inputCls} value={form.slotDurationMin} onChange={set('slotDurationMin')}>
              {[60, 90, 120, 150, 180].map(m => <option key={m} value={m}>{m} phút</option>)}
            </select>
          </label>
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">Ảnh bìa (đường dẫn https)</span><input className={inputCls} value={form.coverImage} onChange={set('coverImage')} /></label>
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">Giới thiệu</span><textarea className={`${inputCls} min-h-[96px]`} value={form.description} onChange={set('description')} /></label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button disabled={saving} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Lưu thay đổi
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-700">Đã lưu</span>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-sm text-gray-600">
        <p className="font-bold text-gray-900 mb-1">Tài khoản đăng nhập</p>
        <p>{user?.name} • {user?.phone} • {user?.email}</p>
      </div>
    </form>
  );
}

function toForm(shop: CoffeeShop) {
  return {
    name: shop.name || '',
    address: shop.address || '',
    phone: shop.phoneNumber || '',
    website: shop.website || '',
    description: shop.description || shop.aiIntel?.summary || '',
    coverImage: shop.coverImage || '',
    openingHours: shop.openingHours?.[0]?.time || '07:00 - 22:00',
    slotDurationMin: String(shop.bookingSettings?.slotDurationMin || 120)
  };
}
