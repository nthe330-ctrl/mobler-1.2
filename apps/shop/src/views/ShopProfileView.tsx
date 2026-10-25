import { useEffect, useRef, useState, FormEvent } from 'react';
import { Check, ImagePlus, Loader2, Star, Store, Trash2 } from 'lucide-react';
import { Amenity, CoffeeShop } from '@shared/types';
import { AMENITIES_CONFIG } from '@shared/data';
import {
  NO_SHOW_GRACE_MAX_BOUND, NO_SHOW_GRACE_MIN_BOUND, NO_SHOW_GRACE_DEFAULT_MIN, NO_SHOW_GRACE_PEAK_MIN
} from '@shared/booking';
import { shopApi } from '../services/shopApi';
import { useShopAuth } from '../context/ShopAuthContext';
import { CURRENCIES, CURRENCY_CODES, currencyLabel, formatMoney, toCurrencyCode, type CurrencyCode } from '@shared/currency';
import { useShopI18n } from '../i18n/useShopI18n';
import ShopLanguagePicker from '../components/dashboard/ShopLanguagePicker';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15';

/** Matches the server's own limit, so the grid cannot offer more than will be saved. */
const MAX_SHOP_IMAGES = 5;
/** The upload endpoint refuses anything larger. Re-encoding below keeps us under it. */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
/** Longest edge kept. A cover is shown at most a couple of thousand pixels wide. */
const MAX_EDGE = 1920;
/**
 * `image/*` rather than a list, so an iPhone offers the camera roll instead of greying it
 * out. iOS hands a JPEG to the page even when the photo is stored as HEIC, and whatever
 * does arrive is re-encoded below — so the shop never has to care what their phone shoots.
 */
const ACCEPTED = 'image/*';

/**
 * Turns a picked file into a modest JPEG data URL.
 *
 * Re-encoding rather than uploading the bytes as they are does three jobs at once: a 12MP
 * phone photo stops being an 8MB upload that the endpoint would refuse; a format the
 * server does not store (HEIC, AVIF, BMP) becomes one it does; and every photo ends up as
 * something any browser can draw, which matters because these go on a public page.
 *
 * The browser has to be able to decode the file to re-encode it. If it cannot — a true
 * HEIC opened on a desktop browser, say — this throws and the caller tells the shop
 * plainly, rather than sending bytes that would come back as a broken image.
 */
async function toUploadableDataUrl(file: File, t: (k: string, f?: string) => string): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(t('shop.photos.browserCannotOpen'));
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(t('shop.photos.cannotProcess'));
  // White underneath: a transparent PNG would otherwise flatten onto black in JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  // Step the quality down only as far as the size limit actually requires.
  for (const quality of [0.86, 0.75, 0.62, 0.5]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    // base64 carries ~4 bytes for every 3, and the "data:...;base64," prefix is not payload.
    const bytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    if (bytes <= MAX_UPLOAD_BYTES) return dataUrl;
  }
  throw new Error(t('shop.photos.tooBig'));
}

/** Real shop profile, saved to the shared backend and shown in the customer app. */
export default function ShopProfileView({ shop }: { shop: CoffeeShop }) {
  const { replaceShop, user } = useShopAuth();
  const { t, tf, language } = useShopI18n();
  const [form, setForm] = useState(() => toForm(shop));
  const [amenities, setAmenities] = useState<Amenity[]>(shop.amenities || []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The shop's photos, cover first. One list rather than a cover field plus a gallery:
   * the customer's carousel shows exactly this order starting with the cover, so editing
   * it as one ordered list is the same thing the guest will see.
   */
  const [gallery, setGallery] = useState<string[]>(() => toGallery(shop));
  const [uploading, setUploading] = useState(0);
  /** The shop's saved currency, and what the picker is currently showing. */
  const savedCurrency = toCurrencyCode(shop.currency_code);
  const [currency, setCurrency] = useState<CurrencyCode>(savedCurrency);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(toForm(shop));
    setAmenities(shop.amenities || []);
    setGallery(toGallery(shop));
    setCurrency(toCurrencyCode(shop.currency_code));
  }, [shop.id]);

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setSaved(false);
    setError(null);
    const room = MAX_SHOP_IMAGES - gallery.length;
    if (room <= 0) return setError(tf('shop.photos.maxReached', { max: MAX_SHOP_IMAGES }));

    const picked = Array.from(files).slice(0, room);
    if (picked.length < files.length) setError(tf('shop.photos.roomLeftCount', { count: room }));

    for (const file of picked) {
      setUploading(n => n + 1);
      try {
        // Shrunk and re-encoded on this machine first, so what travels is a web-safe
        // JPEG inside the size limit however large the original photo was.
        const { url } = await shopApi.uploadImage(shop.id, await toUploadableDataUrl(file, t));
        // Appended as they arrive, so the first upload of an empty shop becomes the cover.
        setGallery(prev => (prev.includes(url) || prev.length >= MAX_SHOP_IMAGES ? prev : [...prev, url]));
      } catch (err: any) {
        setError(err?.message || tf('shop.photos.uploadFailedName', { name: file.name }));
      } finally {
        setUploading(n => n - 1);
      }
    }
    // Let the same file be picked again after a removal.
    if (fileRef.current) fileRef.current.value = '';
  };

  const makeCover = (url: string) => {
    setSaved(false);
    setGallery(prev => [url, ...prev.filter(i => i !== url)]);
  };

  const removeImage = (url: string) => {
    setSaved(false);
    setGallery(prev => prev.filter(i => i !== url));
  };

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
    if (!form.name.trim() || !form.address.trim()) return setError(t('shop.profile.nameAddressRequired'));
    if (uploading > 0) return setError(t('shop.photos.stillUploading'));
    setSaving(true);
    setError(null);
    try {
      const res = await shopApi.updateShop(shop.id, {
        name: form.name.trim(),
        address: form.address.trim(),
        phoneNumber: form.phone.trim(),
        website: form.website.trim(),
        description: form.description.trim(),
        // The first photo IS the cover; sending both keeps the customer app's two reads
        // (coverImage for the card, images for the carousel) telling the same story.
        currency_code: currency,
        coverImage: gallery[0] || '',
        images: gallery,
        openingHours: [{ day: t('shop.profile.everyday'), time: form.openingHours.trim() || '07:00 - 22:00' }],
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
      setError(err?.message || t('shop.profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-5 pb-10">
      <div>
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Store className="text-red-600" /> {t('shop.profile.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('shop.profile.subtitle')}</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {gallery[0] && <img src={gallery[0]} alt="" className="w-full h-40 object-cover" referrerPolicy="no-referrer" />}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.profile.name')}</span><input className={inputCls} value={form.name} onChange={set('name')} /></label>
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.profile.address')}</span><input className={inputCls} value={form.address} onChange={set('address')} /></label>
          <label><span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.profile.phone')}</span><input className={inputCls} value={form.phone} onChange={set('phone')} /></label>
          <label><span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.profile.hours')}</span><input className={inputCls} value={form.openingHours} onChange={set('openingHours')} /></label>
          <label><span className="block text-xs font-bold text-gray-700 mb-1.5">Website</span><input className={inputCls} value={form.website} onChange={set('website')} /></label>
          <label>
            <span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.profile.slotDuration')}</span>
            <select className={inputCls} value={form.slotDurationMin} onChange={set('slotDurationMin')}>
              {[60, 90, 120, 150, 180].map(m => <option key={m} value={m}>{tf('shop.profile.minutesOption', { minutes: m })}</option>)}
            </select>
          </label>
          <label>
            <span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.profile.graceTitle')}</span>
            <select className={inputCls} value={form.noShowGraceMin} onChange={set('noShowGraceMin')}>
              {[10, 15, 20, 25, 30, 45]
                .filter(m => m >= NO_SHOW_GRACE_MIN_BOUND && m <= NO_SHOW_GRACE_MAX_BOUND)
                .map(m => <option key={m} value={m}>{tf('shop.profile.minutesOption', { minutes: m })}</option>)}
            </select>
            <span className="block mt-1 text-[11px] text-gray-500">
              {tf('shop.profile.graceHelp', { peak: NO_SHOW_GRACE_PEAK_MIN })}
            </span>
          </label>
          <label className="md:col-span-2"><span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.profile.description')}</span><textarea className={`${inputCls} min-h-[96px]`} value={form.description} onChange={set('description')} /></label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-gray-900">{t('shop.photos.title')}</p>
            <p className="text-sm text-gray-500 mt-1">{tf('shop.photos.help', { max: MAX_SHOP_IMAGES })}</p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading > 0 || gallery.length >= MAX_SHOP_IMAGES}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50"
          >
            {uploading > 0
              ? <><Loader2 size={16} className="animate-spin" /> {tf('shop.photos.uploadingCount', { count: uploading })}</>
              : <><ImagePlus size={16} /> {t('shop.photos.addPhoto')}</>}
          </button>
          {/* The real control is the button above; this input stays off-screen but focusable
              by label, so keyboard and screen-reader users reach the same picker. */}
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="sr-only"
            aria-label={t('shop.photos.pickerLabel')}
            onChange={e => pickFiles(e.target.files)}
          />
        </div>

        {gallery.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            {t('shop.photos.empty')}
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {gallery.map((url, idx) => (
              <li key={url} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={url} alt="" className="w-full h-28 object-cover" referrerPolicy="no-referrer" />
                {idx === 0 && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
                    <Star size={11} className="fill-current" /> {t('shop.photos.coverBadge')}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => makeCover(url)}
                      className="flex-1 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-bold text-gray-800 hover:bg-white"
                    >
                      {t('shop.photos.makeCover')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    aria-label={t('shop.photos.remove')}
                    className="rounded-lg bg-white/90 px-2 py-1 text-rose-700 hover:bg-white"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-gray-500">
          {t('shop.photos.saveReminder')}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="font-bold text-gray-900">{t('shop.profile.amenities')}</p>
        <p className="text-sm text-gray-500 mt-1">
          {t('shop.profile.amenitiesHelp')}
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
        <p className="mt-3 text-[11px] text-gray-400">{tf('shop.profile.amenitiesCount', { count: amenities.length, total: AMENITIES_CONFIG.length })}</p>
      </div>

      {/*
        Regional preferences. Language is personal to whoever is signed in on this
        browser; currency belongs to the shop and is saved with the rest of the profile.
        They sit together because both answer "where is this shop, and who reads this".
      */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="font-bold text-gray-900">{t('shop.regional.title')}</p>
        <p className="text-sm text-gray-500 mt-1">{t('shop.regional.subtitle')}</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.regional.language')}</span>
            <ShopLanguagePicker />
            <span className="block mt-1 text-[11px] text-gray-500">{t('shop.regional.languageHint')}</span>
          </div>

          <label>
            <span className="block text-xs font-bold text-gray-700 mb-1.5">{t('shop.regional.currency')}</span>
            <select
              className={inputCls}
              value={currency}
              onChange={e => { setSaved(false); setCurrency(e.target.value as CurrencyCode); }}
            >
              {CURRENCY_CODES.map(code => (
                <option key={code} value={code}>{currencyLabel(code, language)}</option>
              ))}
            </select>
            <span className="block mt-1 text-[11px] text-gray-500">{t('shop.regional.currencyHint')}</span>
            <span className="block mt-1.5 text-[11px] text-gray-600">
              {t('shop.regional.currentCurrency')}: <strong>{savedCurrency}</strong> · {CURRENCIES[savedCurrency].symbol} · {formatMoney(45000, savedCurrency, language)}
            </span>
          </label>
        </div>

        {/*
          Shown only when the picker differs from what is saved. The warning is literally
          true: the server stores the code and converts nothing, so a 45,000 that means
          dong today reads as 45,000 of the new currency tomorrow. Saying anything softer
          would be telling the shop its prices were handled when they were not.
        */}
        {currency !== savedCurrency && (
          <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-amber-900">{t('shop.regional.changeWarningTitle')}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-900/90">
              {t('shop.regional.changeWarning')}
            </p>
            <p className="mt-2 text-[13px] font-semibold text-amber-900">
              {formatMoney(45000, savedCurrency, language)} → {formatMoney(45000, currency, language)}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button disabled={saving} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t('shop.common.save')}
        </button>
        {saved && <span className="text-sm font-semibold text-emerald-700">{t('shop.common.saved')}</span>}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-sm text-gray-600">
        <p className="font-bold text-gray-900 mb-1">{t('shop.profile.loginAccount')}</p>
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
    openingHours: shop.openingHours?.[0]?.time || '07:00 - 22:00',
    slotDurationMin: String(shop.bookingSettings?.slotDurationMin || 120),
    noShowGraceMin: String(shop.bookingSettings?.noShowGraceMin || NO_SHOW_GRACE_DEFAULT_MIN)
  };
}

/**
 * The shop's photos as one ordered list, cover first.
 *
 * The stored shape allows the cover to be absent from `images`, or to sit anywhere in it,
 * so this normalises both into the order the customer's carousel will actually show —
 * which is also the order the editor needs to present.
 */
function toGallery(shop: CoffeeShop): string[] {
  const list = [shop.coverImage, ...(shop.images || [])]
    .map(i => String(i ?? '').trim())
    .filter(Boolean);
  return list.filter((url, i) => list.indexOf(url) === i).slice(0, MAX_SHOP_IMAGES);
}
