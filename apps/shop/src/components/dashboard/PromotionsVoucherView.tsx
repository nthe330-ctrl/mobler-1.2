import React, { useState, useRef } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Calendar, 
  Clock, 
  Users, 
  Percent, 
  DollarSign, 
  Gift, 
  Sparkles, 
  Flame, 
  X, 
  Edit2, 
  Trash2, 
  Power, 
  CopyCheck, 
  QrCode, 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  ArrowRight, 
  Shuffle, 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Calculator,
  Ticket,
  Coffee,
  CheckCheck,
  Crown,
  UserPlus,
  Award,
  HelpCircle,
  ChevronRight,
  Info,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';
import { useShopCollection, uploadShopImage } from '../../hooks/useShopCollection';
import { Voucher, DiscountType, VoucherStatus, TargetAudience, CustomerSegmentKey } from '../../types/dashboard';
import { useMoney } from '../../hooks/useMoney';
import { useShopI18n } from '../../i18n/useShopI18n';
import { SEEDED_DEFAULTS, menuOptionLabel } from '@shared/menuOptions';
import { CURRENCIES } from '@shared/currency';

/**
 * Banner photos offered in the voucher editor. The subject is a dictionary key because it
 * is the image's alt text, read by whoever is picking the banner.
 */
const PRESET_VOUCHER_IMAGES: { labelKey: string; url: string }[] = [
  { labelKey: 'shop.promo.bannerCoffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80' },
  { labelKey: 'shop.promo.bannerOolong', url: 'https://images.unsplash.com/photo-1558857563-b37cf5c911b3?w=600&q=80' },
  { labelKey: 'shop.promo.bannerPeachTea', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80' },
  { labelKey: 'shop.promo.bannerCroissant', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80' },
  { labelKey: 'shop.promo.bannerJuice', url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&q=80' },
  { labelKey: 'shop.promo.bannerInterior', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80' },
];

const RANDOM_PREFIXES = ['CHILL', 'COFFEE', 'SUMMER', 'VIP', 'WELCOME', 'HAPPY', 'SPECIAL', 'WEEKEND'];

export const ALL_CUSTOMER_SEGMENTS: CustomerSegmentKey[] = [
  'new_customers',
  'regular',
  'vip_members',
  'top_spenders'
];

/**
 * What a customer segment LOOKS like. What it is CALLED lives in the dictionary under
 * `shop.segment.<key>.{name,short,milestone,criteria,description,recommendation}`, read
 * through the `segmentText` helper below.
 *
 * The two were mixed together before, which meant the name, the joining criteria and the
 * promotion advice were Vietnamese for every reader — and the advice named amounts in dong
 * ("giảm 30k - 50k"), which is not advice a shop in Taipei or Bangkok can act on. The
 * rewritten text talks in percentages and in kind, so it holds in any currency.
 */
export interface CustomerCategoryConfig {
  key: CustomerSegmentKey;
  id: number;
  milestoneIcon: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  activeRing: string;
  bgTint: string;
  iconBg: string;
  customerCount: number;
}

/**
 * The words for a segment, in the reader's language.
 *
 * Takes `t` rather than calling a hook, so it works from the module-level helpers and from
 * inside render alike. The field name is short on purpose — `shop.segment.<key>.<field>` is
 * the whole convention, so adding a field means adding four dictionary rows and nothing else.
 */
export function segmentText(
  key: CustomerSegmentKey,
  field: 'name' | 'short' | 'milestone' | 'criteria' | 'description' | 'recommendation',
  t: (k: string) => string
): string {
  return t(`shop.segment.${key}.${field}`);
}

export const CUSTOMER_CATEGORIES_CONFIG: Record<CustomerSegmentKey, CustomerCategoryConfig> = {
  new_customers: {
    key: 'new_customers',
    id: 1,
    milestoneIcon: '🌱',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    textColor: 'text-blue-700',
    activeRing: 'ring-blue-400 border-blue-600 bg-blue-50/60',
    bgTint: 'bg-blue-50/40',
    iconBg: 'bg-blue-100 text-blue-600',
    customerCount: 8,
  },
  regular: {
    key: 'regular',
    id: 2,
    milestoneIcon: '🧭',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    textColor: 'text-emerald-700',
    activeRing: 'ring-emerald-400 border-emerald-600 bg-emerald-50/60',
    bgTint: 'bg-emerald-50/40',
    iconBg: 'bg-emerald-100 text-emerald-600',
    customerCount: 10,
  },
  vip_members: {
    key: 'vip_members',
    id: 3,
    milestoneIcon: '👑',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-300',
    textColor: 'text-amber-800',
    activeRing: 'ring-amber-400 border-amber-600 bg-amber-50/70',
    bgTint: 'bg-amber-50/40',
    iconBg: 'bg-amber-100 text-amber-700',
    customerCount: 6,
  },
  top_spenders: {
    key: 'top_spenders',
    id: 4,
    milestoneIcon: '🏆',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    textColor: 'text-purple-700',
    activeRing: 'ring-purple-400 border-purple-600 bg-purple-50/60',
    bgTint: 'bg-purple-50/40',
    iconBg: 'bg-purple-100 text-purple-600',
    customerCount: 5,
  }
};

export const getVoucherAudiences = (voucher: Voucher): CustomerSegmentKey[] => {
  if (voucher.targetAudiences && voucher.targetAudiences.length > 0) {
    return voucher.targetAudiences;
  }
  if (voucher.targetAudience === 'all') {
    return [...ALL_CUSTOMER_SEGMENTS];
  }
  if (ALL_CUSTOMER_SEGMENTS.includes(voucher.targetAudience as CustomerSegmentKey)) {
    return [voucher.targetAudience as CustomerSegmentKey];
  }
  return [...ALL_CUSTOMER_SEGMENTS];
};

export default function PromotionsVoucherView() {
  const { money, currency } = useMoney();
  const { t, tf, language, num } = useShopI18n();
  const priceStep = CURRENCIES[currency].priceStep;
  // Vouchers are created by this shop and stored on the server; a new shop has none.
  const { items: rawVouchers, setItems: setVouchers, loading: vouchersLoading, error: vouchersError, shopId } = useShopCollection<Voucher>('vouchers');
  const vouchers = rawVouchers.map(v => ({
    ...v,
    applyToAllCustomers: v.applyToAllCustomers ?? (v.targetAudience === 'all'),
    targetAudiences: getVoucherAudiences(v)
  }));

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAudienceFilter, setSelectedAudienceFilter] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [selectedVoucherForQR, setSelectedVoucherForQR] = useState<Voucher | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'percent' as DiscountType,
    discountValue: 20,
    maxDiscountAmount: 40000,
    minOrderValue: 50000,
    applyToAllCustomers: true,
    targetAudiences: [...ALL_CUSTOMER_SEGMENTS] as CustomerSegmentKey[],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usageLimit: 200,
    perCustomerLimit: 1,
    status: 'active' as VoucherStatus,
    bannerImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
    applicableCategory: 'all',
    tags: [SEEDED_DEFAULTS.tag] as string[],
    newTagInput: ''
  });

  const [imageTab, setImageTab] = useState<'presets' | 'url' | 'file'>('presets');
  const [uploadFileName, setUploadFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [testOrderAmount, setTestOrderAmount] = useState<number>(120000);
  const [testCustomerType, setTestCustomerType] = useState<string>('guest_never_visited');
  const [selectedTestVoucherId, setSelectedTestVoucherId] = useState<string>(vouchers[0]?.id || '');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyCode = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    triggerToast(tf('shop.promo.codeCopied', { code }));
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGenerateRandomCode = () => {
    const prefix = RANDOM_PREFIXES[Math.floor(Math.random() * RANDOM_PREFIXES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setFormData(prev => ({ ...prev, code: `${prefix}${num}` }));
  };

  const handleToggleAllCustomers = () => {
    setFormData(prev => {
      const nextState = !prev.applyToAllCustomers;
      if (nextState) {
        triggerToast(t('shop.promo.pickedAll'));
        return {
          ...prev,
          applyToAllCustomers: true,
          targetAudiences: [...ALL_CUSTOMER_SEGMENTS]
        };
      } else {
        triggerToast(t('shop.promo.unpickedAll'));
        return {
          ...prev,
          applyToAllCustomers: false
        };
      }
    });
  };

  const handleToggleAudience = (key: CustomerSegmentKey) => {
    setFormData(prev => {
      const exists = prev.targetAudiences.includes(key);
      let updated: CustomerSegmentKey[];
      if (exists) {
        if (prev.targetAudiences.length === 1 && !prev.applyToAllCustomers) {
          triggerToast(t('shop.promo.needOneSegment'));
          return prev;
        }
        updated = prev.targetAudiences.filter(item => item !== key);
      } else {
        updated = [...prev.targetAudiences, key];
      }
      return {
        ...prev,
        applyToAllCustomers: false,
        targetAudiences: updated
      };
    });
  };

  const handleSelectAllFourSpecific = () => {
    setFormData(prev => ({
      ...prev,
      applyToAllCustomers: false,
      targetAudiences: [...ALL_CUSTOMER_SEGMENTS]
    }));
    triggerToast(t('shop.promo.pickedFour'));
  };

  const handleSelectOnlyAudience = (key: CustomerSegmentKey, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormData(prev => ({
      ...prev,
      applyToAllCustomers: false,
      targetAudiences: [key]
    }));
    triggerToast(tf('shop.promo.onlyPicked', { name: segmentText(key, 'name', t) }));
  };

  const handleOpenCreateModal = () => {
    setEditingVoucher(null);
    const prefix = RANDOM_PREFIXES[Math.floor(Math.random() * RANDOM_PREFIXES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setFormData({
      code: `${prefix}${num}`,
      title: '',
      description: '',
      discountType: 'percent',
      discountValue: 20,
      maxDiscountAmount: 40000,
      minOrderValue: 50000,
      applyToAllCustomers: true,
      targetAudiences: [...ALL_CUSTOMER_SEGMENTS],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      usageLimit: 200,
      perCustomerLimit: 1,
      status: 'active',
      bannerImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
      applicableCategory: 'all',
      tags: [t('shop.promo.tagNewOffer')],
      newTagInput: ''
    });
    setUploadFileName('');
    setImageTab('presets');
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (vc: Voucher, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingVoucher(vc);
    const audiences = getVoucherAudiences(vc);
    const isAll = vc.applyToAllCustomers ?? (vc.targetAudience === 'all' && (!vc.targetAudiences || vc.targetAudiences.length === 4));

    setFormData({
      code: vc.code,
      title: vc.title,
      description: vc.description || '',
      discountType: vc.discountType,
      discountValue: vc.discountValue,
      maxDiscountAmount: vc.maxDiscountAmount || 0,
      minOrderValue: vc.minOrderValue,
      applyToAllCustomers: isAll,
      targetAudiences: audiences.length > 0 ? audiences : [...ALL_CUSTOMER_SEGMENTS],
      startDate: vc.startDate,
      endDate: vc.endDate,
      usageLimit: vc.usageLimit,
      perCustomerLimit: vc.perCustomerLimit,
      status: vc.status,
      bannerImage: vc.bannerImage || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
      applicableCategory: vc.applicableCategory || 'all',
      tags: vc.tags ? [...vc.tags] : [],
      newTagInput: ''
    });
    setUploadFileName('');
    setImageTab('url');
    setIsCreateModalOpen(true);
  };

  const handleDuplicateVoucher = (vc: Voucher, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const duplicated: Voucher = {
      ...vc,
      id: `vc-${Date.now()}`,
      code: `${vc.code}_COPY`,
      title: tf('shop.promo.copySuffix', { title: vc.title }),
      usedCount: 0,
      status: 'active',
      targetAudiences: getVoucherAudiences(vc)
    };
    setVouchers(prev => [duplicated, ...prev]);
    triggerToast(tf('shop.promo.duplicated', { code: duplicated.code }));
  };

  const handleDeleteVoucher = (id: string, code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm(tf('shop.promo.confirmDelete', { code }))) {
      setVouchers(prev => prev.filter(v => v.id !== id));
      triggerToast(tf('shop.promo.deleted', { code }));
    }
  };

  const handleToggleStatus = (id: string, currentStatus: VoucherStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus: VoucherStatus = currentStatus === 'active' ? 'paused' : 'active';
    setVouchers(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    triggerToast(tf('shop.promo.statusChanged', { status: t(newStatus === 'active' ? 'shop.promo.statusActiveShort' : 'shop.promo.statusPaused') }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;
    if (file.size > 3 * 1024 * 1024) {
      alert(t('shop.menu.imgTooBig'));
      return;
    }
    setUploadFileName(file.name);
    try {
      const url = await uploadShopImage(shopId, file);
      setFormData(prev => ({ ...prev, bannerImage: url }));
    } catch (err: any) {
      alert(err?.message || t('shop.menu.uploadFailed'));
    }
  };

  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      alert(t('shop.promo.needCode'));
      return;
    }
    if (!formData.title.trim()) {
      alert(t('shop.promo.needTitle'));
      return;
    }
    if (!formData.applyToAllCustomers && formData.targetAudiences.length === 0) {
      alert(t('shop.promo.needAudience'));
      return;
    }

    const cleanCode = formData.code.trim().toUpperCase().replace(/\s+/g, '');

    if (!editingVoucher && vouchers.some(v => v.code.toUpperCase() === cleanCode)) {
      alert(tf('shop.promo.codeExists', { code: cleanCode }));
      return;
    }

    const isAll = formData.applyToAllCustomers;
    const targetAudienceValue: TargetAudience = isAll 
      ? 'all' 
      : formData.targetAudiences.length === 1 
      ? formData.targetAudiences[0] 
      : 'all';

    if (editingVoucher) {
      setVouchers(prev => prev.map(v => {
        if (v.id === editingVoucher.id) {
          return {
            ...v,
            code: cleanCode,
            title: formData.title.trim(),
            description: formData.description.trim(),
            discountType: formData.discountType,
            discountValue: Number(formData.discountValue),
            maxDiscountAmount: formData.discountType === 'percent' ? Number(formData.maxDiscountAmount) : undefined,
            minOrderValue: Number(formData.minOrderValue),
            targetAudience: targetAudienceValue,
            applyToAllCustomers: formData.applyToAllCustomers,
            targetAudiences: formData.targetAudiences,
            startDate: formData.startDate,
            endDate: formData.endDate,
            usageLimit: Number(formData.usageLimit),
            perCustomerLimit: Number(formData.perCustomerLimit),
            status: formData.status,
            bannerImage: formData.bannerImage,
            applicableCategory: formData.applicableCategory,
            tags: formData.tags
          };
        }
        return v;
      }));
      triggerToast(tf('shop.promo.updated', { code: cleanCode }));
    } else {
      const newVoucher: Voucher = {
        id: `vc-${Date.now()}`,
        code: cleanCode,
        title: formData.title.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscountAmount: formData.discountType === 'percent' ? Number(formData.maxDiscountAmount) : undefined,
        minOrderValue: Number(formData.minOrderValue),
        targetAudience: targetAudienceValue,
        applyToAllCustomers: formData.applyToAllCustomers,
        targetAudiences: formData.targetAudiences,
        startDate: formData.startDate,
        endDate: formData.endDate,
        usageLimit: Number(formData.usageLimit),
        usedCount: 0,
        perCustomerLimit: Number(formData.perCustomerLimit),
        status: formData.status,
        bannerImage: formData.bannerImage,
        applicableCategory: formData.applicableCategory,
        tags: formData.tags
      };
      setVouchers(prev => [newVoucher, ...prev]);
      triggerToast(tf('shop.promo.created', { code: cleanCode }));
    }

    setIsCreateModalOpen(false);
  };

  const getStatusBadge = (st: VoucherStatus) => {
    switch (st) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>{t('shop.promo.statusActive')}</span>;
      case 'scheduled':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200"><Clock size={12} className="mr-1" />{t('shop.promo.statusScheduled')}</span>;
      case 'paused':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><AlertCircle size={12} className="mr-1" />{t('shop.promo.statusPaused')}</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">{t('shop.promo.statusExpired')}</span>;
    }
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchSearch = v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = selectedStatus === 'all' || v.status === selectedStatus;
    const matchType = selectedType === 'all' || v.discountType === selectedType;

    const voucherAudiences = getVoucherAudiences(v);
    const matchAudience = (() => {
      if (selectedAudienceFilter === 'all') return true;
      if (selectedAudienceFilter === 'all_inclusive') return v.applyToAllCustomers === true;
      if (selectedAudienceFilter === 'specific_only') return v.applyToAllCustomers !== true;
      return voucherAudiences.includes(selectedAudienceFilter as CustomerSegmentKey);
    })();

    return matchSearch && matchStatus && matchType && matchAudience;
  });

  const activeCount = vouchers.filter(v => v.status === 'active').length;
  const totalUsedCount = vouchers.reduce((acc, v) => acc + v.usedCount, 0);
  const totalSavingsEst = vouchers.reduce((acc, v) => {
    // A stand-in for the average percent discount. Expressed in the currency's own step so
    // the estimate stays the same order of magnitude in dollars, baht and new dollars.
    const val = v.discountType === 'percent' ? 25 * priceStep : v.discountValue;
    return acc + (v.usedCount * val);
  }, 0);

  // Replaces a hard-coded "+28.4%": how many campaigns have actually been redeemed at least
  // once. Attributing extra orders to a voucher would need order-level attribution, which
  // this system does not record, so the card reports what the data supports.
  const redeemedCount = vouchers.filter(v => v.usedCount > 0).length;

  const currentSimVoucher = vouchers.find(v => v.id === selectedTestVoucherId) || vouchers[0];
  const calculateSimulation = () => {
    if (!currentSimVoucher) return { isValid: false, discount: 0, finalTotal: testOrderAmount, reason: t('shop.promo.simNoVoucher') };

    if (testOrderAmount < currentSimVoucher.minOrderValue) {
      return {
        isValid: false,
        discount: 0,
        finalTotal: testOrderAmount,
        reason: tf('shop.promo.simBelowMin', {
          min: money(currentSimVoucher.minOrderValue),
          gap: money(currentSimVoucher.minOrderValue - testOrderAmount)
        })
      };
    }

    const audiences = getVoucherAudiences(currentSimVoucher);
    let isEligible = false;
    let ineligibleReason = '';

    if (testCustomerType === 'guest_never_visited') {
      if (currentSimVoucher.applyToAllCustomers) {
        isEligible = true;
      } else {
        isEligible = false;
        const allowedNames = audiences.map(k => segmentText(k, 'name', t)).join(', ');
        ineligibleReason = tf('shop.promo.simGuestBlocked', { allowed: allowedNames });
      }
    } else {
      if (currentSimVoucher.applyToAllCustomers) {
        isEligible = true;
      } else {
        isEligible = audiences.includes(testCustomerType as CustomerSegmentKey);
        if (!isEligible) {
          const allowedNames = audiences.map(k => segmentText(k, 'name', t)).join(', ');
          const testCustomerName = segmentText(testCustomerType as CustomerSegmentKey, 'name', t);
          ineligibleReason = tf('shop.promo.simWrongSegment', { allowed: allowedNames, actual: testCustomerName });
        }
      }
    }

    if (!isEligible) {
      return {
        isValid: false,
        discount: 0,
        finalTotal: testOrderAmount,
        reason: ineligibleReason
      };
    }

    let discount = 0;
    if (currentSimVoucher.discountType === 'percent') {
      discount = (testOrderAmount * currentSimVoucher.discountValue) / 100;
      if (currentSimVoucher.maxDiscountAmount && discount > currentSimVoucher.maxDiscountAmount) {
        discount = currentSimVoucher.maxDiscountAmount;
      }
    } else if (currentSimVoucher.discountType === 'fixed' || currentSimVoucher.discountType === 'free_item') {
      discount = currentSimVoucher.discountValue;
    } else if (currentSimVoucher.discountType === 'same_price') {
      discount = Math.max(0, testOrderAmount - currentSimVoucher.discountValue);
    }

    discount = Math.min(discount, testOrderAmount);
    return {
      isValid: true,
      discount,
      finalTotal: testOrderAmount - discount,
      reason: currentSimVoucher.applyToAllCustomers
        ? t('shop.promo.simOkAll')
        : tf('shop.promo.simOkSegment', {
            name: segmentText(testCustomerType as CustomerSegmentKey, 'name', t) || t('shop.segment.anyGuest')
          })
    };
  };

  const simResult = calculateSimulation();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[110] bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-extrabold text-gray-900">{t('shop.promo.title')}</h2>
            <span className="bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5">
              <Ticket size={14} />
              <span>{tf('shop.promo.campaignCount', { count: vouchers.length })}</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">{t('shop.promo.subtitle')}</p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button 
            onClick={() => setIsSimulatorOpen(true)}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-200 transition-all font-bold text-sm border border-gray-200 cursor-pointer"
          >
            <Calculator size={18} className="text-gray-600" />
            <span>{t('shop.promo.testVoucher')}</span>
          </button>

          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-2.5 rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-bold shadow-md shadow-red-600/25 hover:shadow-lg text-sm cursor-pointer"
          >
            <Plus size={19} />
            <span>{t('shop.promo.createVoucher')}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Performance Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <Flame size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('shop.promo.statRunning')}</p>
            <p className="text-xl font-black text-gray-900">{activeCount} voucher</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <CheckCheck size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('shop.promo.statUses')}</p>
            <p className="text-xl font-black text-gray-900">{tf('shop.promo.usesCount', { count: num(totalUsedCount) })}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Gift size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('shop.promo.statSavings')}</p>
            <p className="text-xl font-black text-gray-900">~{money(totalSavingsEst)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{t('shop.promo.statRedeemed')}</p>
            <p className="text-xl font-black text-emerald-600">
              {tf('shop.promo.redeemedRatio', { used: num(redeemedCount), total: num(vouchers.length) })}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={t('shop.promo.searchPh')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">{t('shop.promo.audienceFilter')}</span>
              <select
                value={selectedAudienceFilter}
                onChange={(e) => setSelectedAudienceFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{`👥 ${t('shop.promo.filterAllVouchers')}`}</option>
                <option value="all_inclusive">{`🌟 ${t('shop.promo.filterAllInclusive')}`}</option>
                <option value="specific_only">{`🏷️ ${t('shop.promo.filterSpecific')}`}</option>
                <option value="new_customers">{`🌱 ${segmentText('new_customers', 'name', t)}`}</option>
                <option value="regular">{`🧭 ${segmentText('regular', 'name', t)}`}</option>
                <option value="vip_members">{`👑 ${segmentText('vip_members', 'name', t)}`}</option>
                <option value="top_spenders">{`🏆 ${segmentText('top_spenders', 'name', t)}`}</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">{t('shop.promo.typeFilter')}</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t('shop.promo.typeAll')}</option>
                <option value="percent">{t('shop.promo.typePercent')}</option>
                <option value="fixed">{tf('shop.promo.typeFixed', { currency })}</option>
                <option value="same_price">{t('shop.promo.typeSamePrice')}</option>
                <option value="free_item">{t('shop.promo.typeFreeItem')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <span className="text-gray-400 font-semibold shrink-0 mr-1">{t('shop.promo.statusFilter')}</span>
          {[
            { key: 'all', label: t('shop.promo.statusAll'), count: vouchers.length },
            { key: 'active', label: t('shop.promo.statusActive'), count: vouchers.filter(v => v.status === 'active').length },
            { key: 'scheduled', label: t('shop.promo.statusScheduled'), count: vouchers.filter(v => v.status === 'scheduled').length },
            { key: 'paused', label: t('shop.promo.statusPaused'), count: vouchers.filter(v => v.status === 'paused').length },
            { key: 'expired', label: t('shop.promo.statusExpired'), count: vouchers.filter(v => v.status === 'expired').length },
          ].map(st => {
            const isActive = selectedStatus === st.key;
            return (
              <button
                key={st.key}
                onClick={() => setSelectedStatus(st.key)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <span>{st.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {st.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {vouchersError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{vouchersError}</div>
      )}
      {vouchersLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-sm text-gray-500">{t('shop.promo.loading')}</div>
      ) : vouchers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
          <h3 className="font-bold text-gray-900">{t('shop.promo.emptyTitle')}</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">{t('shop.promo.emptyBody')}</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Ticket size={28} />
          </div>
          <h3 className="font-bold text-gray-800 text-base">{t('shop.promo.noMatchTitle')}</h3>
          <p className="text-gray-500 text-xs max-w-sm mx-auto">{t('shop.promo.noMatchBody')}</p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedStatus('all'); setSelectedType('all'); setSelectedAudienceFilter('all'); }}
            className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
          >
            {t('shop.menu.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredVouchers.map((vc) => {
            const audiences = getVoucherAudiences(vc);
            const isAllInclusive = vc.applyToAllCustomers === true;
            const isAll4Segments = audiences.length === ALL_CUSTOMER_SEGMENTS.length;
            const usagePercent = vc.usageLimit > 0 ? Math.min(100, Math.round((vc.usedCount / vc.usageLimit) * 100)) : 0;
            const isInactive = vc.status === 'paused' || vc.status === 'expired';

            return (
              <div
                key={vc.id}
                className={`bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group relative ${
                  isInactive ? 'opacity-75 bg-gray-50/50' : ''
                }`}
              >
                <div>
                  <div className="relative h-32 w-full overflow-hidden bg-slate-900">
                    <img 
                      src={vc.bannerImage || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80'} 
                      alt={vc.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {getStatusBadge(vc.status)}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1 max-w-[70%] justify-end flex-wrap">
                      {isAllInclusive ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-black px-3 py-1 rounded-full shadow-sm border backdrop-blur-md bg-emerald-950/80 text-emerald-300 border-emerald-400/40">
                          <span>🌟</span>
                          <span>{t('shop.promo.badgeAllGuests')}</span>
                        </span>
                      ) : isAll4Segments ? (
                        <span className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1 rounded-full shadow-sm border backdrop-blur-md bg-slate-900/80 text-amber-300 border-amber-300/40">
                          <span>👥</span>
                          <span>{t('shop.promo.badgeFourSegments')}</span>
                        </span>
                      ) : (
                        audiences.map((audKey) => {
                          const config = CUSTOMER_CATEGORIES_CONFIG[audKey];
                          return (
                            <span 
                              key={audKey}
                              className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm border backdrop-blur-md ${config.badgeBg} ${config.textColor} ${config.badgeBorder}`}
                            >
                              <span>{config.milestoneIcon}</span>
                              <span>{segmentText(config.key, 'short', t)}</span>
                            </span>
                          );
                        })
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 text-white">
                      <div className="text-2xl font-black tracking-tight drop-shadow-md">
                        {vc.discountType === 'percent' && tf('shop.promo.offPercent', { value: vc.discountValue })}
                        {vc.discountType === 'fixed' && tf('shop.promo.offFixed', { amount: money(vc.discountValue) })}
                        {vc.discountType === 'same_price' && tf('shop.promo.offSamePrice', { amount: money(vc.discountValue) })}
                        {vc.discountType === 'free_item' && t('shop.promo.offFreeItem')}
                      </div>
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <button
                        onClick={(e) => handleCopyCode(vc.code, e)}
                        className="bg-white/95 hover:bg-white text-gray-900 px-3 py-1 rounded-xl text-xs font-black tracking-wider flex items-center space-x-1.5 shadow-md border border-white/40 transition-all font-mono cursor-pointer"
                        title={t('shop.promo.tapToCopy')}
                      >
                        <span>{vc.code}</span>
                        {copiedCode === vc.code ? (
                          <Check size={13} className="text-emerald-600" />
                        ) : (
                          <Copy size={13} className="text-gray-400 hover:text-gray-700" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-red-600 transition-colors">
                        {vc.title}
                      </h3>
                      {vc.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {vc.description}
                        </p>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl border bg-gray-50/90 border-gray-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 flex items-center space-x-1.5">
                          <Users size={14} className="text-red-600" />
                          <span>{t('shop.promo.audienceLabel')}</span>
                        </span>
                        {isAllInclusive ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                            {`🌟 ${t('shop.promo.allGuestsLong')}`}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                            {tf('shop.promo.segmentsOf', { count: audiences.length })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {isAllInclusive && (
                          <span className="inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-xl border bg-emerald-50 text-emerald-800 border-emerald-200">
                            <span>🆕</span>
                            <span>{t('shop.promo.neverVisited')}</span>
                          </span>
                        )}
                        {audiences.map((audKey) => {
                          const config = CUSTOMER_CATEGORIES_CONFIG[audKey];
                          return (
                            <span
                              key={audKey}
                              className={`inline-flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-xl border ${config.badgeBg} ${config.textColor} ${config.badgeBorder}`}
                            >
                              <span>{config.milestoneIcon}</span>
                              <span>{segmentText(config.key, 'name', t)}</span>
                              <span className="text-[10px] opacity-75 font-normal">({segmentText(config.key, 'milestone', t)})</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[11px]">{t('shop.promo.minOrder')}</span>
                        <span className="font-bold text-gray-800">
                          {vc.minOrderValue > 0 ? money(vc.minOrderValue) : t('shop.promo.noMinimum')}
                        </span>
                      </div>

                      <div>
                        <span className="text-gray-400 block text-[11px]">{t('shop.promo.validity')}</span>
                        <span className="font-bold text-gray-800 flex items-center space-x-1">
                          <Calendar size={12} className="text-gray-400" />
                          <span>{vc.endDate}</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-gray-500">{t('shop.promo.usageProgress')}</span>
                        <span className="text-gray-900 font-bold">
                          {vc.usedCount} / {vc.usageLimit > 0 ? vc.usageLimit : '∞'} ({usagePercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${vc.usageLimit > 0 ? usagePercent : 10}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVoucherForQR(vc);
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors font-semibold flex items-center space-x-1 cursor-pointer"
                      title={t('shop.promo.showQr')}
                    >
                      <QrCode size={15} />
                      <span className="hidden sm:inline">{t('shop.promo.qrShort')}</span>
                    </button>

                    <button
                      onClick={(e) => handleDuplicateVoucher(vc, e)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors font-semibold flex items-center space-x-1 cursor-pointer"
                      title={t('shop.promo.duplicateTitle')}
                    >
                      <CopyCheck size={15} />
                      <span className="hidden sm:inline">{t('shop.promo.duplicateShort')}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => handleToggleStatus(vc.id, vc.status, e)}
                      className={`p-2 rounded-xl transition-colors flex items-center space-x-1 font-bold cursor-pointer ${
                        vc.status === 'active' 
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200' 
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                      title={t(vc.status === 'active' ? 'shop.promo.pauseTitle' : 'shop.promo.resumeTitle')}
                    >
                      <Power size={14} />
                      <span>{t(vc.status === 'active' ? 'shop.promo.statusPaused' : 'shop.promo.resumeShort')}</span>
                    </button>

                    <button
                      onClick={(e) => handleOpenEditModal(vc, e)}
                      className="p-2 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                      title={t('shop.promo.editTitle')}
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={(e) => handleDeleteVoucher(vc.id, vc.code, e)}
                      className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                      title={t('shop.promo.deleteTitle')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE / EDIT VOUCHER */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-gray-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full my-8 shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">
                    {editingVoucher ? tf('shop.promo.modalEditTitle', { code: editingVoucher.code }) : t('shop.promo.modalNewTitle')}
                  </h3>
                  <p className="text-xs text-gray-500">{t('shop.promo.modalSubtitle')}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex justify-between items-center">
                      <span>{t('shop.promo.codeLabel')} <span className="text-red-500" aria-label={t('shop.menu.required')}>*</span></span>
                      <span className="text-[11px] text-gray-400">{t('shop.promo.codeHint')}</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                        <input 
                          type="text"
                          required
                          placeholder={t('shop.promo.codePh')}
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-black tracking-wider uppercase text-red-600 font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors shrink-0 border border-gray-200 cursor-pointer"
                        title={t('shop.promo.randomTitle')}
                      >
                        <Shuffle size={14} />
                        <span>{t('shop.promo.randomShort')}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {t('shop.promo.titleLabel')} <span className="text-red-500" aria-label={t('shop.menu.required')}>*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder={t('shop.promo.titlePh')}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      {t('shop.promo.typeLabel')} <span className="text-red-500" aria-label={t('shop.menu.required')}>*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { type: 'percent', label: t('shop.promo.typePercent'), icon: <Percent size={15} /> },
                        { type: 'fixed', label: tf('shop.promo.typeFixed', { currency }), icon: <DollarSign size={15} /> },
                        { type: 'same_price', label: t('shop.promo.typeSamePrice'), icon: <Tag size={15} /> },
                        { type: 'free_item', label: t('shop.promo.typeFreeItem'), icon: <Gift size={15} /> },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setFormData({ ...formData, discountType: item.type as DiscountType })}
                          className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-2 text-xs font-bold cursor-pointer ${
                            formData.discountType === item.type
                              ? 'bg-red-600 text-white border-red-600 shadow-sm'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 flex justify-between">
                        <span>
                          {formData.discountType === 'percent' ? t('shop.promo.valuePercent') : tf('shop.promo.valueAmount', { currency })} <span className="text-red-500">*</span>
                        </span>
                        <span className="text-[11px] text-red-600 font-extrabold">
                          {formData.discountType === 'percent' ? `${formData.discountValue}%` : `${money(Number(formData.discountValue))}`}
                        </span>
                      </label>
                      <input 
                        type="number"
                        required
                        min={1}
                        max={formData.discountType === 'percent' ? 100 : 10000000}
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-black"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 flex justify-between">
                        <span>{tf('shop.promo.maxDiscount', { currency })}</span>
                        {formData.discountType === 'percent' && (
                          <span className="text-[11px] text-gray-500">{money(Number(formData.maxDiscountAmount))}</span>
                        )}
                      </label>
                      <input 
                        type="number"
                        min={0}
                        step={1000}
                        disabled={formData.discountType !== 'percent'}
                        placeholder={t(formData.discountType !== 'percent' ? 'shop.promo.notApplicable' : 'shop.promo.zeroUnlimited')}
                        value={formData.discountType === 'percent' ? formData.maxDiscountAmount : ''}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: parseInt(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-bold disabled:opacity-50 disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 flex justify-between">
                      <span>{tf('shop.promo.minOrderLabel', { currency })}</span>
                      <span className="text-[11px] text-gray-500">{money(Number(formData.minOrderValue))}</span>
                    </label>
                    <input 
                      type="number"
                      min={0}
                      step={5000}
                      value={formData.minOrderValue}
                      onChange={(e) => setFormData({ ...formData, minOrderValue: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-bold"
                    />
                  </div>

                  {/* CUSTOMER CATEGORIES SELECTION */}
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-black text-gray-900 flex items-center space-x-1.5">
                          <Users size={16} className="text-red-600" />
                          <span>{t('shop.promo.audSection')}</span>
                          <span className="text-red-500" aria-label={t('shop.menu.required')}>*</span>
                        </label>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('shop.promo.audSectionHelp')}</p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleSelectAllFourSpecific}
                          className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all flex items-center space-x-1 cursor-pointer ${
                            !formData.applyToAllCustomers && formData.targetAudiences.length === ALL_CUSTOMER_SEGMENTS.length
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                          }`}
                          title={t('shop.promo.pickFourTitle')}
                        >
                          <Layers size={12} />
                          <span>{t('shop.promo.pickFour')}</span>
                        </button>
                      </div>
                    </div>

                    <div
                      onClick={handleToggleAllCustomers}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 relative group select-none ${
                        formData.applyToAllCustomers
                          ? 'border-emerald-600 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/80 ring-2 ring-emerald-200 shadow-sm'
                          : 'border-dashed border-gray-300 bg-gray-50/60 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold transition-all ${
                            formData.applyToAllCustomers ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600'
                          }`}>
                            🌟
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-black text-gray-900">
                                {t('shop.promo.applyAllTitle')}
                              </h4>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                formData.applyToAllCustomers 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                  : 'bg-gray-200 text-gray-600 border-gray-300'
                              }`}>
                                {t('shop.promo.applyAllBadge')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">{t('shop.promo.applyAllHelp')}</p>
                          </div>
                        </div>

                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 ml-3 ${
                          formData.applyToAllCustomers
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                            : 'border-2 border-gray-300 bg-white group-hover:border-emerald-400'
                        }`}>
                          {formData.applyToAllCustomers ? (
                            <Check size={16} className="stroke-[3]" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-xs bg-transparent"></span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{`✨ ${t('shop.promo.applyAllNote')}`}</span>
                        <span className="font-bold text-emerald-700">
                          {t(formData.applyToAllCustomers ? 'shop.promo.applyAllOn' : 'shop.promo.applyAllOff')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                          <Layers size={14} className="text-gray-500" />
                          <span>{t('shop.promo.orPickSpecific')}</span>
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                          formData.applyToAllCustomers
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : formData.targetAudiences.length === ALL_CUSTOMER_SEGMENTS.length
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {formData.applyToAllCustomers
                            ? t('shop.promo.autoFour')
                            : formData.targetAudiences.length === ALL_CUSTOMER_SEGMENTS.length
                            ? t('shop.promo.allFourPicked')
                            : tf('shop.promo.pickedCount', { count: formData.targetAudiences.length })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {ALL_CUSTOMER_SEGMENTS.map((key) => {
                          const cat = CUSTOMER_CATEGORIES_CONFIG[key];
                          const isSelected = formData.targetAudiences.includes(key);

                          return (
                            <div
                              key={key}
                              onClick={() => handleToggleAudience(key)}
                              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 relative group select-none ${
                                isSelected
                                  ? `border-red-600 ring-2 ring-red-100 ${cat.bgTint} shadow-xs`
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80 opacity-75'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base font-bold ${cat.iconBg}`}>
                                    {cat.milestoneIcon}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-gray-900 flex items-center space-x-1">
                                      <span>{segmentText(cat.key, 'name', t)}</span>
                                    </p>
                                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded border mt-0.5 ${cat.badgeBg} ${cat.badgeBorder} ${cat.textColor}`}>
                                      {segmentText(cat.key, 'milestone', t)}
                                    </span>
                                  </div>
                                </div>

                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                  isSelected 
                                    ? 'bg-red-600 text-white shadow-xs' 
                                    : 'border-2 border-gray-300 bg-white group-hover:border-red-400'
                                }`}>
                                  {isSelected ? (
                                    <Check size={14} className="stroke-[3]" />
                                  ) : (
                                    <span className="w-2 rounded-xs bg-transparent"></span>
                                  )}
                                </div>
                              </div>

                              <div className="text-[11px] text-gray-500 leading-tight pt-1 border-t border-gray-100 flex items-center justify-between">
                                <span><strong className="text-gray-700">{t('shop.promo.criteriaLabel')}</strong> {segmentText(cat.key, 'criteria', t)}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleSelectOnlyAudience(key, e)}
                                  className="text-[10px] text-red-600 hover:underline font-bold shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title={t('shop.promo.onlyThisTitle')}
                                >
                                  {t('shop.promo.onlyThis')}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                      formData.applyToAllCustomers 
                        ? 'bg-emerald-50/70 border-emerald-200' 
                        : 'bg-amber-50/60 border-amber-200'
                    }`}>
                      <div className="flex items-center space-x-2 font-bold text-gray-900">
                        <Info size={15} className={formData.applyToAllCustomers ? 'text-emerald-700' : 'text-amber-700'} />
                        <span>{t('shop.promo.summaryLabel')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {formData.applyToAllCustomers ? (
                          <>
                            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg border bg-emerald-100 text-emerald-900 border-emerald-300 flex items-center space-x-1">
                              <span>🌟</span>
                              <span>{t('shop.promo.summaryAll')}</span>
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-emerald-50 text-emerald-800 border-emerald-200">
                              {t('shop.promo.summaryAutoFour')}
                            </span>
                          </>
                        ) : (
                          formData.targetAudiences.map(k => {
                            const conf = CUSTOMER_CATEGORIES_CONFIG[k];
                            return (
                              <span key={k} className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${conf.badgeBg} ${conf.badgeBorder} ${conf.textColor}`}>
                                {conf.milestoneIcon} {segmentText(conf.key, 'name', t)}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {t('shop.promo.startDate')} <span className="text-red-500" aria-label={t('shop.menu.required')}>*</span>
                      </label>
                      <input 
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-xs font-bold text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {t('shop.promo.endDate')} <span className="text-red-500" aria-label={t('shop.menu.required')}>*</span>
                      </label>
                      <input 
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-xs font-bold text-gray-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {t('shop.promo.usageLimit')}
                      </label>
                      <input 
                        type="number"
                        min={0}
                        value={formData.usageLimit}
                        onChange={(e) => setFormData({ ...formData, usageLimit: parseInt(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {t('shop.promo.perCustomer')}
                      </label>
                      <input 
                        type="number"
                        min={1}
                        value={formData.perCustomerLimit}
                        onChange={(e) => setFormData({ ...formData, perCustomerLimit: parseInt(e.target.value) || 1 })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      {t('shop.promo.descLabel')}
                    </label>
                    <textarea 
                      rows={2}
                      placeholder={t('shop.promo.descPh')}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-xs leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between border-b pb-1.5 border-gray-100">
                      <label className="block text-xs font-bold text-gray-700">
                        {t('shop.promo.bannerLabel')}
                      </label>
                      <div className="flex bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setImageTab('presets')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${imageTab === 'presets' ? 'bg-white text-red-600 shadow-xs' : 'text-gray-600'}`}
                        >
                          {t('shop.promo.pickSample')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageTab('file')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${imageTab === 'file' ? 'bg-white text-red-600 shadow-xs' : 'text-gray-600'}`}
                        >
                          {t('shop.promo.uploadImg')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageTab('url')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${imageTab === 'url' ? 'bg-white text-red-600 shadow-xs' : 'text-gray-600'}`}
                        >
                          URL
                        </button>
                      </div>
                    </div>

                    {imageTab === 'presets' && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {PRESET_VOUCHER_IMAGES.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setFormData({ ...formData, bannerImage: img.url })}
                            className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                              formData.bannerImage === img.url ? 'border-red-600 ring-2 ring-red-200 scale-105' : 'border-gray-200 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={img.url} alt={t(img.labelKey)} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {imageTab === 'file' && (
                      <div>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-red-300 hover:border-red-500 bg-red-50/40 p-4 rounded-xl text-center cursor-pointer transition-all"
                        >
                          <Upload size={18} className="mx-auto text-red-600 mb-1" />
                          <p className="text-xs font-bold text-gray-800">
                            {uploadFileName ? `Đã chọn: ${uploadFileName}` : 'Nhấn để chọn ảnh từ máy'}
                          </p>
                        </div>
                      </div>
                    )}

                    {imageTab === 'url' && (
                      <input 
                        type="url" 
                        placeholder="https://images.unsplash.com/..."
                        value={formData.bannerImage}
                        onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                        className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-xs font-mono"
                      />
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center space-x-2 text-gray-900 font-bold text-xs">
                    <Sparkles size={15} className="text-amber-500" />
                    <span>Xem trước thẻ Voucher (Live Preview)</span>
                  </div>

                  {(() => {
                    const isAll = formData.targetAudiences.length === ALL_CUSTOMER_SEGMENTS.length;

                    return (
                      <div className="bg-gradient-to-br from-red-600 via-rose-600 to-amber-700 text-white p-5 rounded-3xl shadow-xl relative overflow-hidden space-y-4">
                        <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                              <Coffee size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-white/80 uppercase tracking-wider">The Workshop Coffee</p>
                              <p className="text-xs font-black text-amber-200">Phiếu Ưu Đãi Đặc Biệt</p>
                            </div>
                          </div>

                          <span className="bg-white/25 backdrop-blur-md text-[10px] font-black px-2.5 py-1 rounded-full uppercase flex items-center space-x-1 border border-white/30">
                            {isAll ? (
                              <>
                                <span>👥</span>
                                <span>Tất cả khách (4 nhóm)</span>
                              </>
                            ) : (
                              <>
                                <span>🎯</span>
                                <span>{formData.targetAudiences.length}/4 Nhóm khách</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {formData.targetAudiences.map(k => {
                            const conf = CUSTOMER_CATEGORIES_CONFIG[k];
                            return (
                              <span key={k} className="text-[10px] font-extrabold bg-black/25 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/20 text-white">
                                {conf.milestoneIcon} {segmentText(conf.key, 'short', t)}
                              </span>
                            );
                          })}
                        </div>

                        <div className="py-2">
                          <div className="text-3xl font-black text-white tracking-tight">
                            {formData.discountType === 'percent' 
                              ? `GIẢM ${formData.discountValue}%`
                              : formData.discountType === 'same_price'
                              ? `ĐỒNG GIÁ ${(formData.discountValue / 1000)}K`
                              : `GIẢM ${(formData.discountValue / 1000)}K`}
                          </div>
                          <p className="text-xs font-medium text-white/90 line-clamp-1 mt-0.5">
                            {formData.title || 'Tiêu đề khuyến mãi'}
                          </p>
                        </div>

                        <div className="relative flex items-center justify-between my-2 -mx-5 px-3">
                          <div className="w-5 h-5 bg-white rounded-full -ml-3"></div>
                          <div className="flex-1 border-t-2 border-dashed border-white/30 mx-2"></div>
                          <div className="w-5 h-5 bg-white rounded-full -mr-3"></div>
                        </div>

                        <div className="space-y-3">
                          <div className="bg-white text-gray-900 p-3 rounded-2xl flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MÃ ÁP DỤNG</p>
                              <p className="text-base font-black tracking-widest text-red-600 font-mono">
                                {formData.code || 'CHILL2026'}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xl">
                              {formData.minOrderValue > 0 ? `Đơn từ ${(formData.minOrderValue / 1000)}K` : 'Mọi đơn'}
                            </span>
                          </div>

                          <div className="flex justify-between text-[11px] text-white/80 font-medium px-1">
                            <span>HSD: {formData.endDate}</span>
                            <span>Giới hạn: {formData.usageLimit > 0 ? `${formData.usageLimit} lượt` : 'Không giới hạn'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center space-x-1.5 font-bold text-gray-900">
                      <Award size={15} className="text-amber-500" />
                      <span>Hệ thống phân cấp Quản lý Khách hàng:</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-gray-600">
                      <li className="flex items-center justify-between">
                        <span>🌱 <strong>Khách mới (Lính mới):</strong> Ghé 1 - 3 lần</span>
                        <span className="text-blue-600 font-bold">8 khách</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>🧭 <strong>Khách quen (Thám Hiểm Gia):</strong> Ghé 4 - 9 lần</span>
                        <span className="text-emerald-600 font-bold">10 khách</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>👑 <strong>Khách ruột (VIP):</strong> Ghé 10+ lần</span>
                        <span className="text-amber-600 font-bold">6 khách</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>🏆 <strong>Khách Top Chi Tiêu:</strong> Bảng xếp hạng</span>
                        <span className="text-purple-600 font-bold">5 khách</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  <span>{editingVoucher ? 'Lưu thay đổi' : 'Tạo & Phát hành Voucher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE */}
      {selectedVoucherForQR && (
        <div className="fixed inset-0 bg-gray-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">{t('shop.promo.qrHeading')}</span>
              <button 
                onClick={() => setSelectedVoucherForQR(null)}
                className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-3xl border-2 border-red-100 flex flex-col items-center justify-center">
              <div className="w-44 h-44 bg-white p-3 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedVoucherForQR.code)}`} 
                  alt={selectedVoucherForQR.code}
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="mt-3 text-lg font-black text-gray-900 font-mono tracking-widest">{selectedVoucherForQR.code}</p>
              <p className="text-xs font-bold text-red-600 mt-0.5">{selectedVoucherForQR.title}</p>
            </div>

            <div className="text-xs text-gray-500 leading-relaxed">
              {t('shop.promo.qrHelp')}
            </div>

            <button
              onClick={() => handleCopyCode(selectedVoucherForQR.code)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-sm cursor-pointer"
            >
              <Copy size={14} />
              <span>{tf('shop.promo.copyCode', { code: selectedVoucherForQR.code })}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: SIMULATOR */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 bg-gray-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                  <Calculator size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">{t('shop.promo.simTitle')}</h3>
                  <p className="text-[11px] text-gray-500">{t('shop.promo.simSubtitle')}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSimulatorOpen(false)}
                className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{t('shop.promo.simPickVoucher')}</label>
                <select
                  value={selectedTestVoucherId}
                  onChange={(e) => setSelectedTestVoucherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  {vouchers.map(v => {
                    const auds = getVoucherAudiences(v);
                    const audText = auds.length === ALL_CUSTOMER_SEGMENTS.length ? t('shop.promo.simAllGuests') : tf('shop.promo.simSegmentCount', { count: auds.length });
                    return (
                      <option key={v.id} value={v.id}>
                        [{v.code}] {v.title} ({audText})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex justify-between items-center">
                  <span>{t('shop.promo.simPickSegment')}</span>
                  <span className="text-[11px] text-gray-500 font-normal">{t('shop.promo.simPickHint')}</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => setTestCustomerType('guest_never_visited')}
                  className={`w-full p-2.5 mb-2 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    testCustomerType === 'guest_never_visited'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200 shadow-xs'
                      : 'border-dashed border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-base">🆕</span>
                    <div>
                      <p className="font-black text-gray-900">{t('shop.promo.simGuestTitle')}</p>
                      <p className="text-[10px] text-gray-500 font-normal">{t('shop.promo.simGuestHelp')}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    testCustomerType === 'guest_never_visited' 
                      ? 'bg-emerald-200 text-emerald-800 border-emerald-300' 
                      : 'bg-gray-200 text-gray-600 border-gray-300'
                  }`}>
                    {t('shop.promo.simZeroVisits')}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {ALL_CUSTOMER_SEGMENTS.map(key => {
                    const conf = CUSTOMER_CATEGORIES_CONFIG[key];
                    const isSelected = testCustomerType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTestCustomerType(key)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                          isSelected 
                            ? `border-red-600 ${conf.bgTint} ring-2 ring-red-200 shadow-xs` 
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-base shrink-0">{conf.milestoneIcon}</span>
                        <div className="min-w-0">
                          <p className="truncate text-gray-900 font-bold">{segmentText(conf.key, 'name', t)}</p>
                          <p className="text-[10px] text-gray-500 font-normal truncate">{segmentText(conf.key, 'milestone', t)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex justify-between">
                  <span>{tf('shop.promo.simOrderAmount', { currency })}</span>
                  <span className="text-red-600 font-extrabold">{money(testOrderAmount)}</span>
                </label>
                <div className="flex gap-2">
                  {[50000, 100000, 150000, 250000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTestOrderAmount(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        testOrderAmount === val ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {(val / 1000)}K
                    </button>
                  ))}
                </div>
                <input 
                  type="number"
                  step={5000}
                  min={10000}
                  value={testOrderAmount}
                  onChange={(e) => setTestOrderAmount(parseInt(e.target.value) || 0)}
                  className="w-full mt-2 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black"
                />
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${simResult.isValid ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'} space-y-2.5`}>
              <div className="flex items-center space-x-2">
                {simResult.isValid ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 shrink-0" />
                )}
                <span className={`text-xs font-black ${simResult.isValid ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {t(simResult.isValid ? 'shop.promo.simValid' : 'shop.promo.simInvalid')}
                </span>
              </div>

              <p className="text-[11px] text-gray-600 leading-relaxed">
                {simResult.reason}
              </p>

              {simResult.isValid && (
                <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px]">{t('shop.promo.simDiscount')}</span>
                    <span className="font-black text-emerald-600 text-sm">-{money(simResult.discount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">{t('shop.promo.simFinal')}</span>
                    <span className="font-black text-gray-900 text-sm">{money(simResult.finalTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSimulatorOpen(false)}
              className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-xl text-xs hover:bg-black transition-colors cursor-pointer"
            >
              {t('shop.promo.simClose')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
