import { useEffect, useState, FormEvent } from 'react';
import { Check, Loader2, Store } from 'lucide-react';
import { Amenity, CoffeeShop } from '@shared/types';
import { AMENITIES_CONFIG } from '@shared/data';
import { NO_SHOW_GRACE_MAX_BOUND, NO_SHOW_GRACE_MIN_BOUND, NO_SHOW_GRACE_DEFAULT_MIN } from '@shared/booking';
import { shopApi } from '../services/shopApi';
import { useShopAuth } from '../context/ShopAuthContext';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15';

/** Real shop profile, saved to the shared backend and shown in the customer app. */
export default function ShopProfileView({ shop }: { shop: CoffeeShop }) {
  const { replaceShop, user } = useShopAuth();
  const [form, setForm] = useState(() => toForm(shop));
  const [amenities, setAmenities] = useState<Amenity[]>(shop.amenities || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(toForm(shop));
    setAmenities(shop.amenities || []);
  }, [shop.id]);

  const toggleAmenity = (id: Amenity) => {
    setSaved(false);
    setAmenities(prev => (prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]));
  };

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
        amenities,
        bookingSettings: {
          ...(shop.bookingSettings || { autoConfirm: false, acceptingBookings: true, slotDurationMin: 120 }),
          slotDurationMin: Number(form.slotDurationMin) || 120,
          noShowGraceMin: Number(form.noShowGraceMin) || NO_SHOW_GRACE_DEFAULT_MIN
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
          <label>
            <span className="block text-xs font-bold text-gray-700 mb-1.5">Giữ bàn thêm bao lâu khi khách tới trễ</span>
            <select className={inputCls} value={form.noShowGraceMin} onChange={set('noShowGraceMin')}>
              {[10, 15, 20, 25, 30, 45]
                .filter(m => m >= NO_SHOW_GRACE_MIN_BOUND && m <= NO_SHOW_GRACE_MAX_BOUND)
                .map(m => <option key={m} value={m}>{m} phút</option>)}
            </select>
            <span className="block mt-1 text-[11px] text-gray-500">
              Quá chừng này mà chưa ai bấm nhận bàn, hệ thống tự mở lại bàn cho khách khác. Giờ cao điểm tự rút ngắn còn 15 phút.
            </span>
          </label>
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">Ảnh bìa (đường dẫn https)</span><input className={inputCls} value={form.coverImage} onChange={set('coverImage')} /></label>
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">Giới thiệu</span><textarea className={`${inputCls} min-h-[96px]`} value={form.description} onChange={set('description')} /></label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="font-bold text-gray-900">Tiện ích của quán</p>
        <p className="text-sm text-gray-500 mt-1">
          Khách lọc quán bằng đúng những ô này. Quán không khai thì sẽ không hiện ra khi khách bật bộ lọc,
          nên hãy tick đủ những gì quán thật sự có.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {AMENITIES_CONFIG.map(a => {
            const on = amenities.includes(a.id);
            return (
              <button
                type="button"
                key={a.id}
                onClick={() => toggleAmenity(a.id)}
                aria-pressed={on}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm transition ${
                  on
                    ? 'border-red-500 bg-red-50 text-red-900 font-semibold'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-1.5">{a.icon}</span>{a.name}
                <span className="block text-[11px] font-normal text-gray-500 mt-0.5">{a.description}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-gray-400">Đã chọn {amenities.length}/{AMENITIES_CONFIG.length} tiện ích.</p>
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
    slotDurationMin: String(shop.bookingSettings?.slotDurationMin || 120),
    noShowGraceMin: String(shop.bookingSettings?.noShowGraceMin || NO_SHOW_GRACE_DEFAULT_MIN)
  };
}
