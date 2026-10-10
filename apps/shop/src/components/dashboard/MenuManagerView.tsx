import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Power, 
  Edit2, 
  Trash2, 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  X, 
  Coffee, 
  Sliders, 
  DollarSign, 
  Package, 
  FileText, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  LayoutGrid, 
  List, 
  PlusCircle, 
  Scale, 
  CupSoda, 
  Info 
} from 'lucide-react';
import { useShopCollection, uploadShopImage } from '../../hooks/useShopCollection';
import { MenuItem, MenuItemSizeOption } from '../../types/dashboard';

const PRESET_SAMPLE_IMAGES = [
  { label: 'Cà phê Sữa Đá', category: 'Cà phê', url: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&q=80' },
  { label: 'Bạc Xỉu Nghệ Thuật', category: 'Cà phê', url: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&q=80' },
  { label: 'Cold Brew Đậm Vị', category: 'Cà phê', url: 'https://images.unsplash.com/photo-1461023058943-07cb1ce8db15?w=600&q=80' },
  { label: 'Espresso / Americano', category: 'Cà phê', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80' },
  { label: 'Trà Đào Cam Sả', category: 'Trà & Trà sữa', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80' },
  { label: 'Trà Sữa Trân Châu', category: 'Trà & Trà sữa', url: 'https://images.unsplash.com/photo-1558857563-b37cf5c911b3?w=600&q=80' },
  { label: 'Matcha Latte Đá', category: 'Trà & Trà sữa', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=80' },
  { label: 'Nước Ép Dưa Hấu', category: 'Nước ép & Sinh tố', url: 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&q=80' },
  { label: 'Nước Cam Tươi', category: 'Nước ép & Sinh tố', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=80' },
  { label: 'Sinh Tố Bơ Béo', category: 'Nước ép & Sinh tố', url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&q=80' },
  { label: 'Bánh Croissant Bơ Pháp', category: 'Bánh ngọt & Ăn kèm', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80' },
  { label: 'Bánh Tiramisu', category: 'Bánh ngọt & Ăn kèm', url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80' },
];

const STANDARD_SUGAR_LEVELS = [
  '0% (Không đường)',
  '30% (Ít ngọt)',
  '50% (Ngọt vừa)',
  '70% (Chuẩn)',
  '100% (Đậm vị)'
];

const STANDARD_ICE_LEVELS = [
  'Nóng / Không đá (0%)',
  'Ít đá (30%)',
  'Vừa đá (50%)',
  'Đá chuẩn (70%)',
  'Đầy đá (100%)'
];

const AVAILABLE_TAGS = ['Best Seller', 'Signature', 'Mới', 'Hot', 'Healthy', 'Truyền thống', 'Ít ngọt'];

const DEFAULT_CATEGORIES = [
  'Cà phê',
  'Trà & Trà sữa',
  'Nước ép & Sinh tố',
  'Đá xay & Frappe',
  'Bánh ngọt & Ăn kèm',
  'Đồ ăn vặt'
];

interface SizePreset {
  id: string;
  name: string;
  badge: string;
  desc: string;
  generate: (basePrice: number) => MenuItemSizeOption[];
  defaultCode: string;
}

const SIZE_PRESETS: SizePreset[] = [
  {
    id: 'sml',
    name: '3 Size Chuẩn (S • M • L)',
    badge: '3 Size',
    desc: 'Phù hợp Cà phê, Trà & Trà sữa',
    generate: (base) => [
      { id: 'sz-s', sizeCode: 'S', name: 'Size S (Nhỏ - 350ml)', price: Math.max(10000, base) },
      { id: 'sz-m', sizeCode: 'M', name: 'Size M (Vừa - 500ml)', price: Math.max(10000, base + 7000), isDefault: true },
      { id: 'sz-l', sizeCode: 'L', name: 'Size L (Lớn - 700ml)', price: Math.max(10000, base + 14000) },
    ],
    defaultCode: 'M'
  },
  {
    id: 'ml',
    name: '2 Size Phổ Biến (M • L)',
    badge: '2 Size',
    desc: 'Phù hợp Trà trái cây, Nước ép & Sinh tố',
    generate: (base) => [
      { id: 'sz-m', sizeCode: 'M', name: 'Size M (Vừa - 500ml)', price: Math.max(10000, base), isDefault: true },
      { id: 'sz-l', sizeCode: 'L', name: 'Size L (Lớn - 700ml)', price: Math.max(10000, base + 8000) },
    ],
    defaultCode: 'M'
  },
  {
    id: 'bottle',
    name: 'Ly & Chai Mang Về',
    badge: 'Ly / Chai',
    desc: 'Cold Brew & Cà phê chai ủ lạnh',
    generate: (base) => [
      { id: 'sz-cup', sizeCode: 'Ly', name: 'Ly Uống Tại Chỗ (350ml)', price: Math.max(10000, base), isDefault: true },
      { id: 'sz-bot', sizeCode: 'Chai', name: 'Chai Thủy Tinh (500ml)', price: Math.max(10000, base + 20000) },
    ],
    defaultCode: 'Ly'
  },
  {
    id: 'bakery',
    name: 'Cái Lẻ & Set Tiết Kiệm',
    badge: 'Set bánh',
    desc: 'Bánh ngọt, Croissant & Đồ ăn kèm',
    generate: (base) => [
      { id: 'sz-1', sizeCode: '1 cái', name: 'Cái lẻ (1 phần)', price: Math.max(10000, base), isDefault: true },
      { id: 'sz-set2', sizeCode: 'Set 2', name: 'Set đôi (2 cái - Tiết kiệm)', price: Math.max(10000, base * 2 - 6000) },
    ],
    defaultCode: '1 cái'
  }
];

export default function MenuManagerView() {
  // Menu lives on the server and belongs to this shop; a new shop starts with no items.
  const { items: menu, setItems: setMenu, loading: menuLoading, error: menuError, saving: menuSaving, shopId } = useShopCollection<MenuItem>('menu');
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [viewDetailItem, setViewDetailItem] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    price: 35000,
    stock: 50,
    category: 'Cà phê',
    customCategory: '',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&q=80',
    description: '',
    allowSizeCustomization: true,
    sizeOptions: [
      { id: 'sz-1', sizeCode: 'S', name: 'Size S (Nhỏ - 350ml)', price: 35000 },
      { id: 'sz-2', sizeCode: 'M', name: 'Size M (Vừa - 500ml)', price: 42000, isDefault: true },
      { id: 'sz-3', sizeCode: 'L', name: 'Size L (Lớn - 700ml)', price: 49000 }
    ] as MenuItemSizeOption[],
    defaultSize: 'M',
    allowSugarCustomization: true,
    sugarOptions: [...STANDARD_SUGAR_LEVELS],
    defaultSugar: '70% (Chuẩn)',
    allowIceCustomization: true,
    iceOptions: [...STANDARD_ICE_LEVELS],
    defaultIce: 'Đá chuẩn (70%)',
    tags: ['Mới'] as string[],
    newTagInput: ''
  });

  const [imageTab, setImageTab] = useState<'file' | 'url' | 'presets'>('presets');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewSelectedSize, setPreviewSelectedSize] = useState<string>('M');
  const [previewSelectedSugar, setPreviewSelectedSugar] = useState<string>('70% (Chuẩn)');
  const [previewSelectedIce, setPreviewSelectedIce] = useState<string>('Đá chuẩn (70%)');
  const [detailSelectedSize, setDetailSelectedSize] = useState<string>('');

  useEffect(() => {
    if (formData.allowSizeCustomization && formData.sizeOptions.length > 0) {
      const match = formData.sizeOptions.find(s => s.sizeCode === previewSelectedSize);
      if (!match) {
        setPreviewSelectedSize(formData.defaultSize || formData.sizeOptions[0].sizeCode);
      }
    }
  }, [formData.sizeOptions, formData.allowSizeCustomization, formData.defaultSize]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getItemPriceDisplay = (item: MenuItem) => {
    if (item.allowSizeCustomization && item.sizeOptions && item.sizeOptions.length > 0) {
      const prices = item.sizeOptions.map(s => s.price);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      if (minP === maxP) {
        return `${minP.toLocaleString()}đ`;
      }
      return `${minP.toLocaleString()}đ - ${maxP.toLocaleString()}đ`;
    }
    return `${item.price.toLocaleString()}đ`;
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const initialPrice = 35000;
    const initialSizes = [
      { id: 'sz-1', sizeCode: 'S', name: 'Size S (Nhỏ - 350ml)', price: 35000 },
      { id: 'sz-2', sizeCode: 'M', name: 'Size M (Vừa - 500ml)', price: 42000, isDefault: true },
      { id: 'sz-3', sizeCode: 'L', name: 'Size L (Lớn - 700ml)', price: 49000 }
    ];

    setFormData({
      name: '',
      price: initialPrice,
      stock: 50,
      category: 'Cà phê',
      customCategory: '',
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1558857563-b37cf5c911b3?w=600&q=80',
      description: '',
      allowSizeCustomization: true,
      sizeOptions: initialSizes,
      defaultSize: 'M',
      allowSugarCustomization: true,
      sugarOptions: [...STANDARD_SUGAR_LEVELS],
      defaultSugar: '70% (Chuẩn)',
      allowIceCustomization: true,
      iceOptions: [...STANDARD_ICE_LEVELS],
      defaultIce: 'Đá chuẩn (70%)',
      tags: ['Mới'],
      newTagInput: ''
    });
    setUploadFileName('');
    setImageTab('presets');
    setPreviewSelectedSize('M');
    setPreviewSelectedSugar('70% (Chuẩn)');
    setPreviewSelectedIce('Đá chuẩn (70%)');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    const isCustomCat = !DEFAULT_CATEGORIES.includes(item.category);
    
    let itemSizes: MenuItemSizeOption[] = [];
    if (item.sizeOptions && item.sizeOptions.length > 0) {
      itemSizes = item.sizeOptions.map(s => ({ ...s }));
    } else {
      itemSizes = [
        { id: 'sz-1', sizeCode: 'S', name: 'Size S (Nhỏ)', price: item.price },
        { id: 'sz-2', sizeCode: 'M', name: 'Size M (Vừa)', price: item.price + 7000, isDefault: true },
        { id: 'sz-3', sizeCode: 'L', name: 'Size L (Lớn)', price: item.price + 14000 }
      ];
    }

    const defSize = item.defaultSize || itemSizes.find(s => s.isDefault)?.sizeCode || itemSizes[0]?.sizeCode || 'M';

    setFormData({
      name: item.name,
      price: item.price,
      stock: item.stock,
      category: isCustomCat ? 'other' : item.category,
      customCategory: isCustomCat ? item.category : '',
      isAvailable: item.isAvailable,
      image: item.image,
      description: item.description || '',
      allowSizeCustomization: item.allowSizeCustomization ?? (itemSizes.length > 1),
      sizeOptions: itemSizes,
      defaultSize: defSize,
      allowSugarCustomization: item.allowSugarCustomization ?? true,
      sugarOptions: item.sugarOptions && item.sugarOptions.length > 0 ? [...item.sugarOptions] : [...STANDARD_SUGAR_LEVELS],
      defaultSugar: item.defaultSugar || '70% (Chuẩn)',
      allowIceCustomization: item.allowIceCustomization ?? true,
      iceOptions: item.iceOptions && item.iceOptions.length > 0 ? [...item.iceOptions] : [...STANDARD_ICE_LEVELS],
      defaultIce: item.defaultIce || 'Đá chuẩn (70%)',
      tags: item.tags ? [...item.tags] : [],
      newTagInput: ''
    });
    setUploadFileName('');
    setImageTab('url');
    setPreviewSelectedSize(defSize);
    setPreviewSelectedSugar(item.defaultSugar || '70% (Chuẩn)');
    setPreviewSelectedIce(item.defaultIce || 'Đá chuẩn (70%)');
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (item: MenuItem) => {
    setViewDetailItem(item);
    const def = item.defaultSize || (item.sizeOptions && item.sizeOptions[0]?.sizeCode) || '';
    setDetailSelectedSize(def);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shopId) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Dung lượng ảnh vượt quá 3MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }
    setUploadFileName(file.name);
    setUploading(true);
    try {
      const url = await uploadShopImage(shopId, file);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (err: any) {
      alert(err?.message || 'Tải ảnh lên thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleApplySizePreset = (preset: SizePreset) => {
    const generated = preset.generate(formData.price);
    setFormData(prev => ({
      ...prev,
      allowSizeCustomization: true,
      sizeOptions: generated,
      defaultSize: preset.defaultCode
    }));
    setPreviewSelectedSize(preset.defaultCode);
    triggerToast(`Đã áp dụng mẫu: ${preset.name}`);
  };

  const handleAddCustomSizeRow = () => {
    const nextNum = formData.sizeOptions.length + 1;
    const base = formData.price || 35000;
    const newCode = `XL${nextNum > 4 ? nextNum : ''}`;
    const newOption: MenuItemSizeOption = {
      id: `sz-${Date.now()}`,
      sizeCode: newCode,
      name: `Size ${newCode} (Tùy chỉnh)`,
      price: base + (formData.sizeOptions.length * 5000)
    };

    setFormData(prev => ({
      ...prev,
      sizeOptions: [...prev.sizeOptions, newOption]
    }));
  };

  const handleRemoveSizeRow = (idx: number) => {
    if (formData.sizeOptions.length <= 1) {
      alert('Phải giữ lại ít nhất 1 kích cỡ. Nếu không muốn chia size, bạn có thể tắt tùy chọn kích thước.');
      return;
    }
    const removedCode = formData.sizeOptions[idx].sizeCode;
    const newSizes = formData.sizeOptions.filter((_, i) => i !== idx);
    let newDef = formData.defaultSize;
    if (newDef === removedCode) {
      newDef = newSizes[0].sizeCode;
    }
    setFormData(prev => ({
      ...prev,
      sizeOptions: newSizes,
      defaultSize: newDef
    }));
  };

  const handleUpdateSizeRow = (idx: number, field: keyof MenuItemSizeOption, value: any) => {
    setFormData(prev => {
      const updated = [...prev.sizeOptions];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, sizeOptions: updated };
    });
  };

  const handleSetDefaultSize = (sizeCode: string) => {
    setFormData(prev => ({
      ...prev,
      defaultSize: sizeCode,
      sizeOptions: prev.sizeOptions.map(s => ({
        ...s,
        isDefault: s.sizeCode === sizeCode
      }))
    }));
    setPreviewSelectedSize(sizeCode);
  };

  const handleQuickAdjustSizePrice = (idx: number, delta: number) => {
    setFormData(prev => {
      const updated = [...prev.sizeOptions];
      const cur = updated[idx].price || 0;
      updated[idx] = { ...updated[idx], price: Math.max(0, cur + delta) };
      return { ...prev, sizeOptions: updated };
    });
  };

  const toggleSugarOption = (opt: string) => {
    setFormData(prev => {
      const exists = prev.sugarOptions.includes(opt);
      const newOpts = exists ? prev.sugarOptions.filter(o => o !== opt) : [...prev.sugarOptions, opt];
      let def = prev.defaultSugar;
      if (exists && def === opt) {
        def = newOpts[0] || '';
      }
      return { ...prev, sugarOptions: newOpts, defaultSugar: def };
    });
  };

  const toggleIceOption = (opt: string) => {
    setFormData(prev => {
      const exists = prev.iceOptions.includes(opt);
      const newOpts = exists ? prev.iceOptions.filter(o => o !== opt) : [...prev.iceOptions, opt];
      let def = prev.defaultIce;
      if (exists && def === opt) {
        def = newOpts[0] || '';
      }
      return { ...prev, iceOptions: newOpts, defaultIce: def };
    });
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => {
      const exists = prev.tags.includes(tag);
      return {
        ...prev,
        tags: exists ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên món!');
      return;
    }
    if (formData.price < 0) {
      alert('Giá món không thể nhỏ hơn 0!');
      return;
    }

    let finalSizes: MenuItemSizeOption[] = [];
    let calculatedBasePrice = Number(formData.price);

    if (formData.allowSizeCustomization) {
      if (formData.sizeOptions.length === 0) {
        alert('Vui lòng thêm ít nhất 1 tùy chọn Size hoặc tắt tùy chọn kích thước.');
        return;
      }
      for (const sz of formData.sizeOptions) {
        if (!sz.name.trim() || !sz.sizeCode.trim()) {
          alert('Vui lòng điền đầy đủ Mã Size và Tên hiển thị kích cỡ.');
          return;
        }
        if (sz.price < 0) {
          alert('Giá của kích cỡ không thể nhỏ hơn 0!');
          return;
        }
      }
      finalSizes = formData.sizeOptions.map(s => ({
        ...s,
        price: Number(s.price),
        isDefault: s.sizeCode === formData.defaultSize
      }));
      const defSizeObj = finalSizes.find(s => s.sizeCode === formData.defaultSize) || finalSizes[0];
      if (defSizeObj) {
        calculatedBasePrice = defSizeObj.price;
      }
    }

    const finalCategory = formData.category === 'other' ? (formData.customCategory.trim() || 'Khác') : formData.category;

    if (editingItem) {
      setMenu(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            name: formData.name.trim(),
            price: calculatedBasePrice,
            stock: Number(formData.stock),
            category: finalCategory,
            isAvailable: formData.isAvailable,
            image: formData.image,
            description: formData.description.trim(),
            allowSizeCustomization: formData.allowSizeCustomization,
            sizeOptions: formData.allowSizeCustomization ? finalSizes : [],
            defaultSize: formData.allowSizeCustomization ? formData.defaultSize : undefined,
            allowSugarCustomization: formData.allowSugarCustomization,
            sugarOptions: formData.allowSugarCustomization ? formData.sugarOptions : [],
            defaultSugar: formData.defaultSugar,
            allowIceCustomization: formData.allowIceCustomization,
            iceOptions: formData.allowIceCustomization ? formData.iceOptions : [],
            defaultIce: formData.defaultIce,
            tags: formData.tags
          };
        }
        return item;
      }));
      triggerToast(`Đã cập nhật món "${formData.name}" thành công!`);
    } else {
      const newItem: MenuItem = {
        id: `m-${Date.now()}`,
        name: formData.name.trim(),
        price: calculatedBasePrice,
        stock: Number(formData.stock),
        category: finalCategory,
        isAvailable: formData.isAvailable,
        image: formData.image,
        description: formData.description.trim(),
        allowSizeCustomization: formData.allowSizeCustomization,
        sizeOptions: formData.allowSizeCustomization ? finalSizes : [],
        defaultSize: formData.allowSizeCustomization ? formData.defaultSize : undefined,
        allowSugarCustomization: formData.allowSugarCustomization,
        sugarOptions: formData.allowSugarCustomization ? formData.sugarOptions : [],
        defaultSugar: formData.defaultSugar,
        allowIceCustomization: formData.allowIceCustomization,
        iceOptions: formData.allowIceCustomization ? formData.iceOptions : [],
        defaultIce: formData.defaultIce,
        tags: formData.tags
      };
      setMenu(prev => [newItem, ...prev]);
      triggerToast(`Đã thêm món mới "${formData.name}" vào Menu thành công!`);
    }

    setIsModalOpen(false);
  };

  const toggleAvailability = (id: string) => {
    setMenu(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.isAvailable;
        triggerToast(`Món "${item.name}" đã ${nextState ? 'mở bán lại' : 'tạm ngưng bán'}.`);
        return { ...item, isAvailable: nextState };
      }
      return item;
    }));
  };

  const updateStock = (id: string, newStock: number) => {
    setMenu(prev => prev.map(item => 
      item.id === id ? { ...item, stock: Math.max(0, newStock) } : item
    ));
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa món "${name}" khỏi thực đơn?`)) {
      setMenu(prev => prev.filter(item => item.id !== id));
      triggerToast(`Đã xóa món "${name}" khỏi thực đơn.`);
      if (viewDetailItem && viewDetailItem.id === id) {
        setViewDetailItem(null);
      }
    }
  };

  const categoriesList = ['all', ...Array.from(new Set(menu.map(m => m.category)))];

  const filteredMenu = menu.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const availableCount = menu.filter(m => m.isAvailable).length;
  const multiSizeCount = menu.filter(m => m.allowSizeCustomization && m.sizeOptions && m.sizeOptions.length > 1).length;
  const outOfStockCount = menu.filter(m => !m.isAvailable || m.stock === 0).length;

  const getLivePreviewPrice = () => {
    if (formData.allowSizeCustomization && formData.sizeOptions.length > 0) {
      const match = formData.sizeOptions.find(s => s.sizeCode === previewSelectedSize);
      if (match) return match.price;
    }
    return formData.price || 0;
  };

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
            <h2 className="text-2xl font-extrabold text-gray-900">Quản lý Thực đơn & Menu</h2>
            <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-200 flex items-center gap-1.5">
              <Coffee size={14} />
              <span>{menu.length} món</span>
            </span>
            {menuSaving && <span className="text-xs text-gray-500">Đang lưu…</span>}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Thêm món mới vào menu, thiết lập <strong>chọn size (S, M, L, XL, Chai)</strong> với giá từng kích cỡ, hình ảnh, mô tả và tùy chỉnh Đường & Đá chi tiết.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-2.5 rounded-xl hover:from-red-700 hover:to-rose-700 transition-all font-bold shadow-md shadow-red-600/25 hover:shadow-lg text-sm cursor-pointer"
          >
            <Plus size={19} />
            <span>Thêm Món Mới Vào Menu</span>
          </button>
        </div>
      </div>

      {/* Quick Stat Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đang phục vụ</p>
            <p className="text-lg font-bold text-gray-900">{availableCount} món</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Scale size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Món có chọn Size</p>
            <p className="text-lg font-bold text-gray-900">{multiSizeCount} món</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Sliders size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tùy biến Đường / Đá</p>
            <p className="text-lg font-bold text-gray-900">
              {menu.filter(m => m.allowSugarCustomization || m.allowIceCustomization).length} món
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center space-x-3 col-span-2 sm:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tạm ngưng / Hết tồn</p>
            <p className="text-lg font-bold text-gray-900">{outOfStockCount} món</p>
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
              placeholder="Tìm theo tên món, size, danh mục, mô tả..."
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

          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-gray-500 font-medium hidden sm:inline">Kiểu hiển thị:</span>
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Dạng lưới thẻ có ảnh"
              >
                <LayoutGrid size={16} />
                <span className="hidden md:inline">Lưới thẻ</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Dạng bảng chi tiết"
              >
                <List size={16} />
                <span className="hidden md:inline">Bảng dữ liệu</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <span className="text-gray-400 font-semibold shrink-0 mr-1">Danh mục:</span>
          {categoriesList.map(cat => {
            const isActive = selectedCategory === cat;
            const count = cat === 'all' ? menu.length : menu.filter(m => m.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <span>{cat === 'all' ? 'Tất cả món' : cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {menuError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{menuError}</div>
      )}

      {menuLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-sm text-gray-500">Đang tải thực đơn…</div>
      ) : menu.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Coffee size={28} />
          </div>
          <h3 className="font-bold text-gray-900 text-base">Thực đơn đang trống</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Thêm món đầu tiên của quán. Món bạn tạo sẽ hiện cho khách khi đặt bàn và gọi món trước.
          </p>
          <button onClick={handleOpenAddModal} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm">
            <Plus size={18} /> Thêm món đầu tiên
          </button>
        </div>
      ) : filteredMenu.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
            <Search size={28} />
          </div>
          <h3 className="font-bold text-gray-800 text-base">Không tìm thấy món ăn nào</h3>
          <p className="text-gray-500 text-xs max-w-sm mx-auto">
            Không có món nào khớp với từ khóa tìm kiếm "{searchTerm}" hoặc danh mục đã chọn.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
            className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
          >
            Xóa bộ lọc & Xem tất cả
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredMenu.map(item => {
            const hasSizes = item.allowSizeCustomization && item.sizeOptions && item.sizeOptions.length > 0;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg flex flex-col justify-between overflow-hidden group ${
                  !item.isAvailable ? 'border-gray-200 bg-gray-50/70 opacity-75' : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80';
                    }}
                  />
                  
                  <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                    {item.category}
                  </span>

                  <span className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm ${
                    item.isAvailable 
                      ? 'bg-emerald-500/90 text-white' 
                      : 'bg-gray-800/90 text-gray-200'
                  }`}>
                    {item.isAvailable ? 'Đang bán' : 'Tạm đóng'}
                  </span>

                  {item.tags && item.tags.length > 0 && (
                    <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1">
                      {item.tags.map((t, idx) => (
                        <span key={idx} className="bg-amber-400 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded shadow-sm">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {hasSizes && (
                    <div className="absolute bottom-2.5 right-2.5 bg-slate-900/85 backdrop-blur-md text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-400/30 flex items-center space-x-1">
                      <Scale size={11} />
                      <span>{item.sizeOptions!.length} Size</span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 
                        onClick={() => handleOpenDetailModal(item)}
                        className="font-bold text-gray-900 text-base group-hover:text-red-600 transition-colors cursor-pointer line-clamp-1"
                      >
                        {item.name}
                      </h3>
                    </div>

                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-extrabold text-red-600 text-base">
                        {getItemPriceDisplay(item)}
                      </span>
                      {hasSizes && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          Mặc định: {item.defaultSize || item.sizeOptions![0]?.sizeCode}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {item.description || 'Chưa có mô tả chi tiết cho món ăn này.'}
                    </p>
                  </div>

                  {hasSizes && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-purple-800 flex items-center space-x-1">
                          <CupSoda size={12} className="text-purple-600" />
                          <span>Tùy chọn Size:</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.sizeOptions!.map(sz => {
                          const isDef = sz.sizeCode === (item.defaultSize || item.sizeOptions![0]?.sizeCode);
                          return (
                            <span 
                              key={sz.sizeCode}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                                isDef 
                                  ? 'bg-purple-100 text-purple-900 border-purple-300 ring-1 ring-purple-400/50' 
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                              title={`${sz.name}: ${sz.price.toLocaleString()}đ`}
                            >
                              <span>{sz.sizeCode}</span>
                              <span className="opacity-70 font-normal">({(sz.price / 1000)}k)</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 pt-1.5 border-t border-gray-100 text-[11px]">
                    {item.allowSugarCustomization && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0 text-[10px]">
                          Đường
                        </span>
                        <span className="text-gray-500 truncate text-[10px]">
                          {item.sugarOptions?.map(s => s.split(' ')[0]).join(' / ') || 'Tùy chọn'}
                        </span>
                      </div>
                    )}

                    {item.allowIceCustomization && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0 text-[10px]">
                          Đá
                        </span>
                        <span className="text-gray-500 truncate text-[10px]">
                          {item.iceOptions?.map(i => i.split(' ')[0]).join(' / ') || 'Tùy chọn'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-gray-400 font-medium">Tồn:</span>
                      <input 
                        type="number"
                        value={item.stock}
                        onChange={(e) => updateStock(item.id, parseInt(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-center text-xs font-bold text-gray-800 focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenDetailModal(item)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết món & các size"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa món & size"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => toggleAvailability(item.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          item.isAvailable 
                            ? 'text-red-500 hover:bg-red-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={item.isAvailable ? 'Tạm ngưng bán' : 'Mở bán lại'}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold text-xs">
                  <th className="py-3.5 pl-4">Hình ảnh & Tên món</th>
                  <th className="py-3.5">Phân loại</th>
                  <th className="py-3.5">Giá bán</th>
                  <th className="py-3.5">Tùy chọn Size (Kích cỡ)</th>
                  <th className="py-3.5">Đường & Đá</th>
                  <th className="py-3.5">Số lượng tồn</th>
                  <th className="py-3.5 text-center">Trạng thái</th>
                  <th className="py-3.5 text-right pr-4">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredMenu.map(item => {
                  const hasSizes = item.allowSizeCustomization && item.sizeOptions && item.sizeOptions.length > 0;
                  return (
                    <tr key={item.id} className={`transition-colors hover:bg-gray-50/80 ${!item.isAvailable ? 'bg-gray-50/40 opacity-70' : ''}`}>
                      <td className="py-3.5 pl-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                          />
                          <div>
                            <p 
                              onClick={() => handleOpenDetailModal(item)}
                              className="font-bold text-gray-900 hover:text-red-600 cursor-pointer transition-colors"
                            >
                              {item.name}
                            </p>
                            {item.description && (
                              <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3.5 font-bold text-gray-900 whitespace-nowrap">
                        <span className="text-red-600 font-extrabold">{getItemPriceDisplay(item)}</span>
                      </td>

                      <td className="py-3.5 text-xs">
                        {hasSizes ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {item.sizeOptions!.map(s => (
                              <span 
                                key={s.sizeCode}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  s.sizeCode === (item.defaultSize || item.sizeOptions![0]?.sizeCode)
                                    ? 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                {s.sizeCode}: {(s.price / 1000)}k
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">1 Size duy nhất</span>
                        )}
                      </td>

                      <td className="py-3.5 text-xs text-gray-600 space-y-1">
                        {item.allowSugarCustomization ? (
                          <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-medium mr-1">
                            Đường ({item.sugarOptions?.length || 5})
                          </span>
                        ) : (
                          <span className="inline-block text-gray-400 italic text-[10px] mr-1">Đường cố định</span>
                        )}

                        {item.allowIceCustomization ? (
                          <span className="inline-block bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-medium">
                            Đá ({item.iceOptions?.length || 5})
                          </span>
                        ) : (
                          <span className="inline-block text-gray-400 italic text-[10px]">Đá cố định</span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <input 
                          type="number" 
                          value={item.stock}
                          onChange={(e) => updateStock(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-center font-bold text-gray-800 focus:outline-none focus:border-red-500 bg-white"
                        />
                      </td>

                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.isAvailable ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          {item.isAvailable ? 'Đang bán' : 'Tạm ngưng'}
                        </span>
                      </td>

                      <td className="py-3.5 text-right pr-4">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button 
                            onClick={() => handleOpenDetailModal(item)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye size={17} />
                          </button>
                          <button 
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={17} />
                          </button>
                          <button 
                            onClick={() => toggleAvailability(item.id)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              item.isAvailable ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={item.isAvailable ? "Tạm ngưng bán" : "Mở bán lại"}
                          >
                            <Power size={17} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa món"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MENU ITEM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/75 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-y-auto relative shadow-2xl border border-gray-100 flex flex-col">
            <div className="p-6 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-t-3xl relative shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-2 text-xs font-mono bg-white/20 text-white px-3 py-1 rounded-full w-fit mb-2">
                <Sparkles size={14} />
                <span>{editingItem ? 'Chỉnh sửa món & Chọn Size' : 'Thêm Món Mới Vào Menu'}</span>
              </div>

              <h3 className="text-2xl font-extrabold">
                {editingItem ? `Chỉnh sửa món: ${editingItem.name}` : 'Thêm Món Mới Vào Menu'}
              </h3>
              <p className="text-white/80 text-xs mt-1">
                Thiết lập đầy đủ tên món, danh mục, hình ảnh, <strong>chọn size (S, M, L, XL, Chai)</strong> với giá từng kích cỡ và tùy chọn lượng đường, đá.
              </p>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* SECTION 1: BASIC INFO */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-gray-900 font-bold text-sm border-b pb-2 border-gray-100">
                      <FileText size={17} className="text-red-600" />
                      <span>1. Thông tin cơ bản của món</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Tên món ăn / Đồ uống <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        required
                        placeholder="Ví dụ: Trà Sữa Oolong Nướng Kem Cheese, Cà Phê Muối..."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                          <span>Giá bán cơ sở (VNĐ) <span className="text-red-500">*</span></span>
                          <span className="text-[11px] text-red-600 font-extrabold">{Number(formData.price || 0).toLocaleString()}đ</span>
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            type="number"
                            required
                            min={0}
                            step={1000}
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Số lượng sẵn có (Tồn kho)
                        </label>
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            type="number"
                            min={0}
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                            className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-sm font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700">
                        Danh mục sản phẩm <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {DEFAULT_CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: cat })}
                            className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-left truncate cursor-pointer ${
                              formData.category === cat 
                                ? 'bg-red-600 text-white border-red-600 shadow-sm' 
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, category: 'other' })}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-left cursor-pointer ${
                            formData.category === 'other' 
                              ? 'bg-red-600 text-white border-red-600 shadow-sm' 
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          + Danh mục khác
                        </button>
                      </div>

                      {formData.category === 'other' && (
                        <input 
                          type="text"
                          placeholder="Nhập tên danh mục mới..."
                          value={formData.customCategory}
                          onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                          className="w-full mt-2 px-3.5 py-2 bg-white border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 text-sm font-semibold"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Mô tả chi tiết / Hương vị đặc trưng
                      </label>
                      <textarea 
                        rows={2}
                        placeholder="Mô tả hương vị đặc trưng, thành phần nguyên liệu..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-xs leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* SECTION 2: CHỌN SIZE & CẤU HÌNH KÍCH THƯỚC */}
                  <div className="p-4 bg-purple-50/70 border-2 border-purple-200 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 border-purple-200">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm">
                          <Scale size={18} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-purple-950 flex items-center gap-1.5">
                            <span>2. Tùy Chọn Kích Thước (Chọn Size)</span>
                            <span className="text-[10px] bg-purple-200 text-purple-900 font-black px-2 py-0.5 rounded-full">
                              Mới
                            </span>
                          </h4>
                          <p className="text-[11px] text-purple-700">
                            Cấu hình các kích cỡ (S, M, L, XL, Chai...) và giá tiền riêng cho từng size.
                          </p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.allowSizeCustomization}
                          onChange={(e) => setFormData({ ...formData, allowSizeCustomization: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {formData.allowSizeCustomization ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-purple-900 mb-1.5">
                            Áp dụng nhanh mẫu kích thước có sẵn:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {SIZE_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplySizePreset(preset)}
                                className="p-2 rounded-xl border border-purple-200 bg-white hover:border-purple-500 hover:bg-purple-50/80 text-left transition-all group cursor-pointer"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black text-purple-900 group-hover:text-purple-700">
                                    {preset.badge}
                                  </span>
                                  <Sparkles size={11} className="text-purple-400 group-hover:text-purple-600" />
                                </div>
                                <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{preset.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700">Danh sách các kích cỡ áp dụng:</span>
                            <span className="text-[11px] text-purple-700 font-semibold">
                              (Đang có {formData.sizeOptions.length} kích cỡ)
                            </span>
                          </div>

                          <div className="space-y-2 bg-white p-3 rounded-xl border border-purple-200 shadow-xs">
                            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-gray-500 pb-1 border-b border-gray-100 px-1">
                              <span className="col-span-2">Mã Size</span>
                              <span className="col-span-4">Tên hiển thị (Dung tích)</span>
                              <span className="col-span-4">Giá bán (VNĐ)</span>
                              <span className="col-span-2 text-center">Mặc định</span>
                            </div>

                            {formData.sizeOptions.map((sz, idx) => {
                              const isDef = sz.sizeCode === formData.defaultSize;
                              return (
                                <div 
                                  key={sz.id || idx} 
                                  className={`grid grid-cols-12 gap-2 items-center p-1.5 rounded-lg border transition-all ${
                                    isDef ? 'bg-purple-50/80 border-purple-300 ring-1 ring-purple-200' : 'bg-gray-50/50 border-gray-200'
                                  }`}
                                >
                                  <div className="col-span-2">
                                    <input 
                                      type="text"
                                      value={sz.sizeCode}
                                      onChange={(e) => handleUpdateSizeRow(idx, 'sizeCode', e.target.value.toUpperCase())}
                                      placeholder="S/M/L"
                                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-center font-extrabold text-xs text-purple-900 uppercase focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                  </div>

                                  <div className="col-span-4">
                                    <input 
                                      type="text"
                                      value={sz.name}
                                      onChange={(e) => handleUpdateSizeRow(idx, 'name', e.target.value)}
                                      placeholder="vd: Size M (Vừa - 500ml)"
                                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                  </div>

                                  <div className="col-span-4 flex items-center space-x-1">
                                    <input 
                                      type="number"
                                      step={1000}
                                      min={0}
                                      value={sz.price}
                                      onChange={(e) => handleUpdateSizeRow(idx, 'price', parseInt(e.target.value) || 0)}
                                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-red-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAdjustSizePrice(idx, 5000)}
                                        className="text-[9px] font-bold bg-gray-200 hover:bg-purple-200 text-gray-700 px-1 rounded transition-colors cursor-pointer"
                                        title="+5.000đ"
                                      >
                                        +5k
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAdjustSizePrice(idx, 7000)}
                                        className="text-[9px] font-bold bg-gray-200 hover:bg-purple-200 text-gray-700 px-1 rounded transition-colors cursor-pointer"
                                        title="+7.000đ"
                                      >
                                        +7k
                                      </button>
                                    </div>
                                  </div>

                                  <div className="col-span-2 flex items-center justify-center space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSetDefaultSize(sz.sizeCode)}
                                      className={`p-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                        isDef 
                                          ? 'bg-purple-600 text-white shadow-xs' 
                                          : 'bg-gray-100 text-gray-500 hover:bg-purple-100 hover:text-purple-700'
                                      }`}
                                      title={isDef ? 'Kích cỡ mặc định' : 'Chọn làm kích cỡ mặc định'}
                                    >
                                      {isDef ? '✓ Mặc định' : 'Chọn'}
                                    </button>

                                    {formData.sizeOptions.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSizeRow(idx)}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                        title="Xóa kích cỡ này"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={handleAddCustomSizeRow}
                              className="w-full py-2 border-2 border-dashed border-purple-300 hover:border-purple-500 bg-purple-50/50 hover:bg-purple-50 text-purple-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 mt-2 cursor-pointer"
                            >
                              <PlusCircle size={15} />
                              <span>Thêm kích cỡ mới (+ Size)</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-purple-100/60 border border-purple-200 text-[11px] text-purple-900 flex items-start space-x-2">
                          <Info size={14} className="text-purple-700 shrink-0 mt-0.5" />
                          <span>
                            💡 Khi khách đặt món qua menu hoặc gọi món tại bàn, hệ thống sẽ hiển thị các lựa chọn Size kèm đơn giá tương ứng để tính tiền chính xác.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic bg-white p-3 rounded-xl border border-gray-200">
                        Món này chỉ có 1 kích cỡ cố định với giá niêm yết: <strong>{Number(formData.price || 0).toLocaleString()}đ</strong>.
                      </p>
                    )}
                  </div>

                  {/* SECTION 3: IMAGE UPLOAD */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b pb-2 border-gray-100">
                      <div className="flex items-center space-x-2 text-gray-900 font-bold text-sm">
                        <ImageIcon size={17} className="text-red-600" />
                        <span>3. Hình ảnh món ăn / đồ uống</span>
                      </div>
                      <span className="text-[11px] text-gray-400">Hỗ trợ tải file / URL / Chọn mẫu</span>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setImageTab('file')}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          imageTab === 'file' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Upload size={14} />
                        <span>Tải ảnh từ máy</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('url')}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          imageTab === 'url' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <LinkIcon size={14} />
                        <span>Nhập Link ảnh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('presets')}
                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          imageTab === 'presets' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Sparkles size={14} />
                        <span>Chọn ảnh mẫu</span>
                      </button>
                    </div>

                    {imageTab === 'file' && (
                      <div className="space-y-2">
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-red-300 hover:border-red-500 bg-red-50/40 hover:bg-red-50/70 p-5 rounded-2xl text-center cursor-pointer transition-all space-y-2"
                        >
                          <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                            <Upload size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">
                              {uploading ? 'Đang tải ảnh lên…' : uploadFileName ? `Đã tải lên: ${uploadFileName}` : 'Nhấn để chọn ảnh (tối đa 3MB)'}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">Hỗ trợ định dạng PNG, JPG, WEBP (tối đa 5MB)</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {imageTab === 'url' && (
                      <div>
                        <input 
                          type="url"
                          placeholder="Dán đường dẫn ảnh trực tiếp (https://...)"
                          value={formData.image}
                          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white text-xs font-mono"
                        />
                      </div>
                    )}

                    {imageTab === 'presets' && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 bg-gray-50 rounded-xl border border-gray-200">
                        {PRESET_SAMPLE_IMAGES.map((preset, idx) => (
                          <div
                            key={idx}
                            onClick={() => setFormData({ ...formData, image: preset.url })}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                              formData.image === preset.url ? 'border-red-600 ring-2 ring-red-300 scale-95' : 'border-transparent hover:opacity-80'
                            }`}
                          >
                            <img src={preset.url} alt={preset.label} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            {formData.image === preset.url && (
                              <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center text-white">
                                <Check size={16} className="font-bold" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Tag size={15} className="text-amber-600" />
                      <span>Nhãn nổi bật (Tags / Badges)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_TAGS.map(t => {
                        const isSelected = formData.tags.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleTag(t)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {isSelected ? `✓ ${t}` : `+ ${t}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: SUGAR & ICE + LIVE PREVIEW */}
                <div className="lg:col-span-5 space-y-5 bg-gray-50/80 p-5 rounded-2xl border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-900 font-bold text-sm border-b pb-2 border-gray-200">
                    <Sliders size={17} className="text-red-600" />
                    <span>4. Tùy chọn Lượng Đường & Đá</span>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <h4 className="font-bold text-xs text-gray-900">Tùy chỉnh Lượng Đường</h4>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.allowSugarCustomization}
                          onChange={(e) => setFormData({ ...formData, allowSugarCustomization: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {formData.allowSugarCustomization ? (
                      <div className="space-y-2.5">
                        <p className="text-[11px] text-gray-500">Chọn các mức đường khả dụng cho khách hàng:</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {STANDARD_SUGAR_LEVELS.map(level => {
                            const isChecked = formData.sugarOptions.includes(level);
                            const isDefault = formData.defaultSugar === level;
                            return (
                              <div 
                                key={level}
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isChecked ? 'bg-amber-50/60 border-amber-300' : 'bg-gray-50 border-gray-200 opacity-60'
                                }`}
                                onClick={() => toggleSugarOption(level)}
                              >
                                <div className="flex items-center space-x-2">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="rounded text-amber-600 focus:ring-amber-500"
                                  />
                                  <span className="font-semibold text-gray-800">{level}</span>
                                </div>
                                {isChecked && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFormData({ ...formData, defaultSugar: level });
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                      isDefault ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-amber-200'
                                    }`}
                                  >
                                    {isDefault ? 'Mặc định' : 'Đặt mặc định'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">Món này có độ ngọt cố định, khách không thể tùy chọn lượng đường.</p>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <h4 className="font-bold text-xs text-gray-900">Tùy chỉnh Lượng Đá / Nhiệt độ</h4>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={formData.allowIceCustomization}
                          onChange={(e) => setFormData({ ...formData, allowIceCustomization: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>

                    {formData.allowIceCustomization ? (
                      <div className="space-y-2.5">
                        <p className="text-[11px] text-gray-500">Chọn các mức đá / nhiệt khả dụng cho khách hàng:</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {STANDARD_ICE_LEVELS.map(level => {
                            const isChecked = formData.iceOptions.includes(level);
                            const isDefault = formData.defaultIce === level;
                            return (
                              <div 
                                key={level}
                                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isChecked ? 'bg-blue-50/60 border-blue-300' : 'bg-gray-50 border-gray-200 opacity-60'
                                }`}
                                onClick={() => toggleIceOption(level)}
                              >
                                <div className="flex items-center space-x-2">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="font-semibold text-gray-800">{level}</span>
                                </div>
                                {isChecked && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFormData({ ...formData, defaultIce: level });
                                    }}
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                                      isDefault ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-200'
                                    }`}
                                  >
                                    {isDefault ? 'Mặc định' : 'Đặt mặc định'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">Món này có nhiệt độ / lượng đá cố định.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Xem trước hiển thị đặt món:</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Live Preview</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-red-200 shadow-sm space-y-3">
                      <div className="flex space-x-3">
                        <img 
                          src={formData.image || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80'} 
                          alt="preview" 
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-gray-900 text-sm truncate">{formData.name || 'Tên món ăn mới'}</h5>
                          <p className="text-[11px] text-gray-500 line-clamp-1">{formData.description || 'Hương vị thơm ngon tuyệt hảo...'}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-red-600 font-extrabold text-sm">
                              {getLivePreviewPrice().toLocaleString()}đ
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">Kho: {formData.stock}</span>
                          </div>
                        </div>
                      </div>

                      {formData.allowSizeCustomization && formData.sizeOptions.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-gray-100">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-purple-900">Chọn Size (Xem giá thay đổi):</span>
                            <span className="text-purple-600 font-semibold">Đang chọn: Size {previewSelectedSize}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {formData.sizeOptions.map(sz => (
                              <button
                                key={sz.sizeCode}
                                type="button"
                                onClick={() => setPreviewSelectedSize(sz.sizeCode)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center space-x-1 cursor-pointer ${
                                  previewSelectedSize === sz.sizeCode
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-purple-50'
                                }`}
                              >
                                <span>{sz.sizeCode}</span>
                                <span className="opacity-80">({(sz.price / 1000)}k)</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.allowSugarCustomization && formData.sugarOptions.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-gray-100">
                          <span className="text-[10px] font-bold text-gray-600 block">Chọn lượng đường:</span>
                          <div className="flex flex-wrap gap-1">
                            {formData.sugarOptions.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setPreviewSelectedSugar(opt)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  previewSelectedSugar === opt
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                }`}
                              >
                                {opt.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.allowIceCustomization && formData.iceOptions.length > 0 && (
                        <div className="space-y-1 pt-1.5 border-t border-gray-100">
                          <span className="text-[10px] font-bold text-gray-600 block">Chọn lượng đá:</span>
                          <div className="flex flex-wrap gap-1">
                            {formData.iceOptions.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setPreviewSelectedIce(opt)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  previewSelectedIce === opt
                                    ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                }`}
                              >
                                {opt.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    id="isAvailableCheck"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                  />
                  <label htmlFor="isAvailableCheck" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Mở bán ngay sau khi lưu
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-md shadow-red-600/25 transition-all text-sm flex items-center space-x-2 cursor-pointer"
                  >
                    <Check size={18} />
                    <span>{editingItem ? 'Lưu thay đổi món' : 'Thêm vào Menu'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAIL */}
      {viewDetailItem && (
        <div className="fixed inset-0 bg-gray-900/75 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative shadow-2xl border border-gray-100 overflow-hidden">
            <div className="relative aspect-[16/9] bg-gray-900">
              <img 
                src={viewDetailItem.image} 
                alt={viewDetailItem.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=80';
                }}
              />
              <button 
                onClick={() => setViewDetailItem(null)}
                className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 p-2 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                  {viewDetailItem.category}
                </span>
                {viewDetailItem.tags?.map((tag, i) => (
                  <span key={i} className="bg-amber-400 text-slate-950 font-extrabold text-xs px-2.5 py-1 rounded-lg shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900">{viewDetailItem.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Mã món: <span className="font-mono">{viewDetailItem.id}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-red-600 block">
                    {(() => {
                      if (viewDetailItem.allowSizeCustomization && viewDetailItem.sizeOptions && viewDetailItem.sizeOptions.length > 0) {
                        const sel = viewDetailItem.sizeOptions.find(s => s.sizeCode === detailSelectedSize);
                        if (sel) return `${sel.price.toLocaleString()}đ`;
                      }
                      return getItemPriceDisplay(viewDetailItem);
                    })()}
                  </span>
                  {viewDetailItem.allowSizeCustomization && (
                    <span className="text-[10px] text-gray-400">Giá theo size đã chọn</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-400 block font-medium">Trạng thái bán:</span>
                  <span className={`font-bold inline-block mt-0.5 ${viewDetailItem.isAvailable ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {viewDetailItem.isAvailable ? '● Đang phục vụ' : '○ Tạm ngưng bán'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block font-medium">Số lượng tồn kho:</span>
                  <span className="font-bold text-gray-900 inline-block mt-0.5">{viewDetailItem.stock} phần</span>
                </div>
              </div>

              {viewDetailItem.allowSizeCustomization && viewDetailItem.sizeOptions && viewDetailItem.sizeOptions.length > 0 && (
                <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale size={15} className="text-purple-600" />
                      <span>Kích Thước Khả Dụng ({viewDetailItem.sizeOptions.length} Sizes):</span>
                    </h4>
                    <span className="text-[11px] text-purple-700 font-bold">Nhấn để xem giá</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {viewDetailItem.sizeOptions.map(sz => {
                      const isSelected = detailSelectedSize === sz.sizeCode;
                      const isDefault = sz.sizeCode === (viewDetailItem.defaultSize || viewDetailItem.sizeOptions![0]?.sizeCode);
                      return (
                        <div
                          key={sz.sizeCode}
                          onClick={() => setDetailSelectedSize(sz.sizeCode)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : 'bg-white text-gray-800 border-purple-200 hover:bg-purple-100/60'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                              isSelected ? 'bg-white text-purple-700' : 'bg-purple-100 text-purple-900'
                            }`}>
                              {sz.sizeCode}
                            </span>
                            <span className="text-xs font-bold">{sz.name}</span>
                            {isDefault && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-purple-200 text-purple-800'
                              }`}>
                                Mặc định
                              </span>
                            )}
                          </div>
                          <span className={`font-extrabold text-xs ${isSelected ? 'text-white' : 'text-red-600'}`}>
                            {sz.price.toLocaleString()}đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-1.5">Mô tả sản phẩm:</h4>
                <p className="text-sm text-gray-600 leading-relaxed bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60">
                  {viewDetailItem.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Tùy chọn Lượng Đường:</span>
                </h4>
                {viewDetailItem.allowSugarCustomization && viewDetailItem.sugarOptions && viewDetailItem.sugarOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {viewDetailItem.sugarOptions.map(s => (
                      <span key={s} className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Độ ngọt chuẩn cố định (Không tùy chọn).</p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Tùy chọn Lượng Đá / Nhiệt độ:</span>
                </h4>
                {viewDetailItem.allowIceCustomization && viewDetailItem.iceOptions && viewDetailItem.iceOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {viewDetailItem.iceOptions.map(i => (
                      <span key={i} className="bg-blue-100 text-blue-900 border border-blue-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {i}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Nhiệt độ / Đá chuẩn cố định (Không tùy chọn).</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    const item = viewDetailItem;
                    setViewDetailItem(null);
                    handleOpenEditModal(item);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center space-x-2 shadow-md shadow-red-600/20 cursor-pointer"
                >
                  <Edit2 size={16} />
                  <span>Chỉnh sửa món & size</span>
                </button>
                <button
                  onClick={() => setViewDetailItem(null)}
                  className="px-5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
