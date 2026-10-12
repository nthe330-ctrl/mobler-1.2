import { useState, useRef, useEffect, useMemo, ChangeEvent, DragEvent, FormEvent } from 'react';
import PushToggle from './PushToggle';
import { 
  CreditCard, Award, QrCode, ChevronRight, ChevronLeft, Zap, Coffee, ShieldCheck, 
  LayoutGrid, List, X, MessageSquare, ThumbsUp, Footprints, Compass, Star,
  Settings, Sun, Moon, User, Phone, Mail, MapPin, Bell, Check, Sparkles, UserCheck, Shield, Globe, Trophy,
  Camera, Upload, Image as ImageIcon, RefreshCw, AlertCircle, Heart, MessageCircle, Send, Share2, ExternalLink,
  LogIn, LogOut, Store, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ViewState } from '../App';
import { Review } from '@shared/types';
import { MOCK_SHOPS } from '@shared/data';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES, Language } from '@shared/context/LanguageContext';
import { useUser, DEFAULT_AVATAR } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { LanguageControlButton } from './LanguageSelectorModal';
import { api, http } from '../services/api';
import { connectRealtime } from '@shared/api/realtime';
import { resolveRank, ResolvedRank, RANK_TIERS } from '@shared/ranks';
import { buildProgress, EMPTY_STATS } from '@shared/achievements';

interface Props {
  onNavigate: (view: ViewState) => void;
}

export default function ProfileView({ onNavigate }: Props) {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { profile, updateProfile, resetAvatar } = useUser();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'passport' | 'wallet' | 'diary'>('passport');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className={`flex flex-col min-h-full transition-colors duration-300 ${isLight ? 'bg-[#F0F3F7]' : 'bg-transparent'}`}>
      {/* Header Profile with Settings Button */}
      <div className={`pt-12 pb-6 px-4 md:px-8 relative overflow-hidden transition-all duration-300 ${
        isLight 
          ? 'bg-gradient-to-r from-[#800020] via-[#6B0D1B] to-[#4A0E17] text-white border-b-2 border-red-700/60 shadow-md' 
          : 'bg-[#120E0C]/80 backdrop-blur-md border-b border-[#4A3B2C] text-[#EBE3DB]'
      }`}>
        {!isLight && <div className="absolute inset-0 bg-gradient-to-br from-[#120E0C] to-[#1A1510] opacity-90"></div>}
        
        <div className="max-w-5xl mx-auto w-full relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => setIsSettingsOpen(true)}
              className={`w-16 h-16 rounded-full border-2 overflow-hidden p-0.5 shadow-md relative group cursor-pointer transition-all hover:scale-105 ${
                isLight ? 'border-red-400 bg-white/20' : 'border-[#D4AF37] bg-[#1A1510]'
              }`}
              title={t('settings.changeAvatar', 'Đổi ảnh đại diện')}
            >
              <img 
                src={profile.avatar} 
                alt={profile.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                <Camera size={18} className="text-white drop-shadow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight mb-0.5">{profile.name}</h1>
                {user && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-slate-950">
                    {(user.points || 0).toLocaleString('vi-VN')} {t('profile.points', 'điểm')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border shadow-sm backdrop-blur-md transition-all ${
                  isLight 
                    ? 'bg-white/25 text-white border-white/40' 
                    : 'bg-[#1A1510] text-[#D4AF37] border-[#3E3023]'
                }`}>
                  🏆 {t('profile.badge', profile.title)}
                </span>

                {user && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-600/30 text-emerald-100 border-emerald-400/40">
                    ☕ {t('profile.customerBadge', 'Khách hàng')} • {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls: Auth Switcher, Merchant Portal, Language and Settings */}
          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={logout}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title={t('auth.signOut', 'Đăng xuất')}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="px-3 py-1.5 rounded-xl bg-white text-[#800020] font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-100 transition-all"
              >
                <LogIn size={15} />
                <span>{t('auth.signInOrRegister', 'Đăng nhập / Tạo tài khoản')}</span>
              </button>
            )}

            <LanguageControlButton variant="badge" onDark={true} />
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2.5 rounded-full border transition-all flex items-center justify-center gap-1.5 shadow-sm font-bold text-xs ${
                isLight 
                  ? 'bg-white/15 hover:bg-white/25 border-red-300/50 text-white' 
                  : 'bg-[#1A1510] hover:bg-[#251E18] border-[#D4AF37] text-[#D4AF37]'
              }`}
              title={t('profile.settingsTitle', 'Cài đặt tài khoản & Giao diện')}
            >
              <Settings size={18} className="animate-spin-slow" />
              <span className="hidden sm:inline">{t('profile.settings', 'Cài đặt')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`sticky top-0 z-10 transition-all duration-300 border-b ${
        isLight 
          ? 'bg-white/95 backdrop-blur-md shadow-[0_4px_15px_rgba(128,0,32,0.06)] border-red-800/30' 
          : 'bg-[#120E0C]/90 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.5)] border-[#4A3B2C]'
      }`}>
        <div className="max-w-5xl mx-auto w-full flex px-1">
          <button 
            onClick={() => setActiveTab('passport')}
            className={`flex-1 py-3.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'passport' 
                ? isLight ? 'border-[#800020] text-[#800020]' : 'border-[#D4AF37] text-[#D4AF37]'
                : isLight ? 'border-transparent text-slate-500 hover:text-red-900' : 'border-transparent text-[#7A6450] hover:text-[#A48F7A]'
            }`}
          >
            <Award size={15} />
            <span>{t('profile.passport', 'Passport')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 py-3.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'wallet' 
                ? isLight ? 'border-[#800020] text-[#800020]' : 'border-[#D4AF37] text-[#D4AF37]'
                : isLight ? 'border-transparent text-slate-500 hover:text-red-900' : 'border-transparent text-[#7A6450] hover:text-[#A48F7A]'
            }`}
          >
            <CreditCard size={15} />
            <span>{t('profile.wallet', 'Ví tích lũy')}</span>
          </button>
          <button 
            onClick={() => setActiveTab('diary')}
            className={`flex-1 py-3.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'diary' 
                ? isLight ? 'border-[#800020] text-[#800020]' : 'border-[#D4AF37] text-[#D4AF37]'
                : isLight ? 'border-transparent text-slate-500 hover:text-red-900' : 'border-transparent text-[#7A6450] hover:text-[#A48F7A]'
            }`}
          >
            <Footprints size={15} />
            <span>{t('profile.diary', 'Nhật ký')}</span>
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full flex-1 overflow-y-auto">
        {activeTab === 'passport' ? <PassportTab isLight={isLight} /> : activeTab === 'wallet' ? <WalletTab isLight={isLight} /> : <DiaryTab isLight={isLight} onNavigate={onNavigate} />}
      </div>

      {/* Account & Theme Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal 
            onClose={() => setIsSettingsOpen(false)}
            theme={theme}
            setTheme={setTheme}
            toggleTheme={toggleTheme}
            isLight={isLight}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const PRESET_AVATARS = [
  { 
    id: 'av-adventurer-1', 
    label: 'Thám hiểm gia', 
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=CoffeeExplorer&backgroundColor=ffd5dc,ffdfbf' 
  },
  { 
    id: 'av-lorelei-1', 
    label: 'Barista Latte', 
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=LatteArtisan&backgroundColor=f1f4ff,ffdfbf' 
  },
  { 
    id: 'av-cat-bot', 
    label: 'Mèo Máy Pha Cà Phê', 
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CoffeeCat&backgroundColor=ffdfbf,ffd5dc' 
  },
  { 
    id: 'av-avataaars-1', 
    label: 'Chuyên gia Espresso', 
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EspressoMaster&backgroundColor=b6e3f4,ffdfbf' 
  },
  { 
    id: 'av-micah-1', 
    label: 'Nghệ nhân Rang Xay', 
    url: 'https://api.dicebear.com/7.x/micah/svg?seed=RoastWizard&backgroundColor=ffd5dc,c0aede' 
  },
  { 
    id: 'av-big-smile-1', 
    label: 'Nụ cười Coffee', 
    url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=HappyBarista&backgroundColor=ffdfbf,ffd5dc' 
  },
  { 
    id: 'av-adventurer-2', 
    label: 'Thợ săn Hương vị', 
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AromaHunter&backgroundColor=b6e3f4,c0aede' 
  },
  { 
    id: 'av-notionist-1', 
    label: 'Tín đồ Cold Brew', 
    url: 'https://api.dicebear.com/7.x/notionists/svg?seed=ColdBrewLover&backgroundColor=e1d3c1,ffd5dc' 
  },
];

function SettingsModal({
  onClose,
  theme,
  setTheme,
  toggleTheme,
  isLight
}: {
  onClose: () => void;
  theme: string;
  setTheme: (t: 'light' | 'dark') => void;
  toggleTheme: () => void;
  isLight: boolean;
}) {
  const { language, setLanguage, t } = useLanguage();
  const { profile, updateProfile, updateAvatar, resetAvatar } = useUser();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessToast, setUploadSuccessToast] = useState(false);

  // Local editing states initialized from global profile
  const [userAvatar, setUserAvatar] = useState(profile.avatar);
  const [userName, setUserName] = useState(profile.name);
  const [userPhone, setUserPhone] = useState(profile.phone || '0908 123 789');
  const [userEmail, setUserEmail] = useState(profile.email || 'hadinhc@gmail.com');
  const [userLocation, setUserLocation] = useState(profile.location || 'Quận 1, TP. Hồ Chí Minh');
  const [notifyPromos, setNotifyPromos] = useState(profile.notifyPromos ?? true);
  const [notifyBookings, setNotifyBookings] = useState(profile.notifyBookings ?? true);

  const processFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError(t('settings.fileTooLarge', 'Vui lòng chọn file hình ảnh (JPG, PNG, WebP)'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('settings.fileTooLarge', 'Dung lượng ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setUserAvatar(result);
        updateAvatar(result);
        setUploadSuccessToast(true);
        setTimeout(() => setUploadSuccessToast(false), 2500);
      }
    };
    reader.onerror = () => {
      setUploadError(t('profile.photoReadError', 'Không thể đọc tệp ảnh. Vui lòng thử lại.'));
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input value so re-selecting same file triggers onChange
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const selectPresetAvatar = (url: string) => {
    setUserAvatar(url);
    updateAvatar(url);
    setUploadSuccessToast(true);
    setTimeout(() => setUploadSuccessToast(false), 2000);
  };

  const handleResetAvatar = () => {
    setUserAvatar(DEFAULT_AVATAR);
    resetAvatar();
    setUploadSuccessToast(true);
    setTimeout(() => setUploadSuccessToast(false), 2000);
  };

  const handleSave = () => {
    updateProfile({
      name: userName.trim() || 'Hà Đình C',
      avatar: userAvatar || DEFAULT_AVATAR,
      phone: userPhone,
      email: userEmail,
      location: userLocation,
      notifyPromos,
      notifyBookings
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isLight 
            ? 'bg-[#FAFBFD] border-red-700/40 text-[#1E1B18]' 
            : 'bg-[#161210] border-[#D4AF37] text-[#EBE3DB]'
        }`}
      >
        {/* Hidden File Input */}
        <input 
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight 
            ? 'bg-gradient-to-r from-[#800020] via-[#6B0D1B] to-[#4A0E17] text-white border-red-800' 
            : 'bg-[#1A1510] border-[#4A3B2C] text-[#EBE3DB]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isLight ? 'bg-white/20 border-red-300' : 'bg-[#251E18] border-[#D4AF37]'}`}>
              <Settings size={18} className={isLight ? 'text-white' : 'text-[#D4AF37]'} />
            </div>
            <div>
              <h3 className="text-base font-bold">{t('settings.title', 'Cài đặt tài khoản & Giao diện')}</h3>
              <p className={`text-[10px] ${isLight ? 'text-red-100' : 'text-[#A48F7A]'}`}>
                {t('settings.subtitle', 'Quản lý thông tin & Chuyển đổi giao diện')}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`p-1.5 rounded-full border transition-colors ${
              isLight 
                ? 'bg-white/20 hover:bg-white/30 border-red-300/40 text-white' 
                : 'bg-[#251E18] hover:bg-[#302720] border-[#4A3B2C] text-[#A48F7A]'
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-5 flex-1 overflow-y-auto no-scrollbar">
          
          {/* Section 0: Profile Picture / Avatar Upload (Ảnh đại diện) */}
          <div className={`p-4 rounded-xl border transition-all ${
            isLight 
              ? 'bg-white border-red-300/60 shadow-[0_4px_12px_rgba(128,0,32,0.06)]' 
              : 'bg-[#1C1612] border-[#4A3B2C]'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#800020] dark:text-[#D4AF37]">
                <Camera size={14} /> {t('settings.avatar', 'Ảnh đại diện')}
              </span>
              <button
                type="button"
                onClick={handleResetAvatar}
                className={`text-[10px] font-semibold flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md border ${
                  isLight 
                    ? 'border-slate-200 text-slate-600 hover:text-red-800 hover:bg-red-50' 
                    : 'border-[#3E3023] text-[#A48F7A] hover:text-[#D4AF37] hover:bg-[#251E18]'
                }`}
                title={t('settings.resetAvatar', 'Đặt lại mặc định')}
              >
                <RefreshCw size={10} /> {t('settings.resetAvatar', 'Đặt lại')}
              </button>
            </div>

            {/* Avatar Main Card with Drag & Drop & Direct Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              {/* Avatar Circle Preview */}
              <div className="relative group shrink-0">
                <div className={`w-20 h-20 rounded-full border-2 p-1 overflow-hidden shadow-lg transition-transform group-hover:scale-105 ${
                  isLight 
                    ? 'border-red-600 bg-gradient-to-br from-red-100 via-white to-red-50 shadow-red-900/10' 
                    : 'border-[#D4AF37] bg-[#251E18] shadow-black/40'
                }`}>
                  <img 
                    src={userAvatar} 
                    alt="User Avatar Preview" 
                    className="w-full h-full rounded-full object-cover" 
                  />
                </div>
                {/* Overlay camera button on hover/click */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#800020] dark:bg-[#D4AF37] text-white dark:text-black shadow-md hover:scale-110 transition-transform"
                  title={t('settings.uploadAvatar', 'Tải ảnh từ thiết bị')}
                >
                  <Camera size={13} />
                </button>
              </div>

              {/* Upload Dropzone & Action */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 w-full p-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                  isDragging
                    ? isLight
                      ? 'border-red-600 bg-red-50/80 scale-[1.01]'
                      : 'border-[#D4AF37] bg-[#D4AF37]/15 scale-[1.01]'
                    : isLight
                      ? 'border-red-200 hover:border-red-500 bg-[#FAFBFD] hover:bg-red-50/30'
                      : 'border-[#3E3023] hover:border-[#D4AF37]/70 bg-[#15100D] hover:bg-[#201A16]'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  isLight ? 'bg-red-100 text-red-800' : 'bg-[#251E18] text-[#D4AF37]'
                }`}>
                  <Upload size={16} />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-[#EBE3DB]">
                  {t('settings.uploadAvatar', 'Tải ảnh từ thiết bị')}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-[#A48F7A] leading-tight">
                  {t('settings.dragDropAvatar', 'Kéo thả ảnh vào đây hoặc nhấp để chọn')}
                </p>
                <span className="text-[9px] font-mono text-slate-400 dark:text-[#7A6450]">
                  {t('profile.uploadHint', t('profile.uploadHint', 'JPG, PNG, WebP (Tối đa 5MB)'))}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span className="text-[11px] font-medium">{uploadError}</span>
              </div>
            )}

            {/* Upload Success Feedback */}
            {uploadSuccessToast && (
              <div className="mb-3 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5 justify-center font-medium animate-in fade-in">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px]">{t('settings.avatarUploaded', 'Đã cập nhật ảnh đại diện thành công')}</span>
              </div>
            )}

            {/* Presets Gallery (Cartoon / Illustrated Avatars) */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#2C2219]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-500 dark:text-[#A48F7A] flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" />
                  {t('settings.presetAvatars', 'Ảnh đại diện hoạt hình có sẵn')}
                </p>
                <span className="text-[9px] text-slate-400 dark:text-[#7A6450]">
                  {PRESET_AVATARS.length} nhân vật
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_AVATARS.map((preset) => {
                  const isSelected = userAvatar === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPresetAvatar(preset.url)}
                      className={`relative aspect-square rounded-full overflow-hidden border-2 p-0.5 transition-all hover:scale-110 group ${
                        isSelected 
                          ? isLight ? 'border-red-600 ring-2 ring-red-500/30 scale-105 shadow-sm' : 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40 scale-105 shadow-sm'
                          : isLight ? 'border-slate-200 hover:border-red-400 bg-slate-50 opacity-80 hover:opacity-100' : 'border-[#3E3023] hover:border-[#D4AF37] bg-[#1A1510] opacity-80 hover:opacity-100'
                      }`}
                      title={preset.label}
                    >
                      <img 
                        src={preset.url} 
                        alt={preset.label} 
                        className="w-full h-full rounded-full object-cover" 
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                          <Check size={13} className="text-white font-bold" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 1: Switch Theme (White/Silver vs Dark) */}
          <div className={`p-4 rounded-xl border transition-all ${
            isLight 
              ? 'bg-white border-red-300/60 shadow-[0_4px_12px_rgba(128,0,32,0.06)]' 
              : 'bg-[#1C1612] border-[#4A3B2C]'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#800020] dark:text-[#D4AF37]">
                <Sparkles size={14} /> {t('settings.themeTitle', 'Chuyển đổi giao diện')}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLight 
                  ? 'bg-red-50 text-red-800 border-red-300' 
                  : 'bg-[#251E18] text-[#D4AF37] border-[#3E3023]'
              }`}>
                {isLight 
                  ? t('settings.currentThemeLight', '☀️ Giao diện Sáng (Bạc & Đỏ Nâu)') 
                  : t('settings.currentThemeDark', '🌙 Giao diện Tối Midnight')}
              </span>
            </div>

            {/* Theme Choice Cards */}
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              {/* White/Silver Theme Option */}
              <button
                onClick={() => setTheme('light')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                  isLight 
                    ? 'border-2 border-red-600 bg-gradient-to-br from-[#FAFBFD] via-[#F1F5F9] to-[#E2E8F0] text-[#1E1B18] shadow-md ring-2 ring-red-500/20' 
                    : 'border-[#3E3023] bg-[#201A16] text-[#A48F7A] hover:border-red-500/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-[#800020] flex items-center gap-1">
                    <Sun size={14} className="text-amber-600" /> {t('settings.lightSilver', 'Sáng / Bạc')}
                  </span>
                  {isLight && <Check size={14} className="text-red-700 font-bold" />}
                </div>
                <div className="text-[10px] text-slate-600 font-medium leading-tight">
                  {t('settings.lightDesc', 'Chủ yếu màu bạc, gradient đỏ nâu & viền đỏ sang trọng')}
                </div>
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#800020] to-[#4A0E17]" />
              </button>

              {/* Dark Theme Option */}
              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                  !isLight 
                    ? 'border-2 border-[#D4AF37] bg-gradient-to-br from-[#1C1612] to-[#0A0807] text-[#EBE3DB] shadow-md ring-2 ring-[#D4AF37]/20' 
                    : 'border-slate-300 bg-white text-slate-600 hover:border-red-400'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1">
                    <Moon size={14} className="text-indigo-400" /> {t('settings.darkMidnight', 'Tối Midnight')}
                  </span>
                  {!isLight && <Check size={14} className="text-[#D4AF37] font-bold" />}
                </div>
                <div className="text-[10px] opacity-80 font-medium leading-tight">
                  {t('settings.darkDesc', 'Tông tối obsidian êm mắt cho buổi tối')}
                </div>
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#8B6E4E]" />
              </button>
            </div>

            <button 
              onClick={toggleTheme}
              className={`w-full py-2 px-3 rounded-lg border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isLight 
                  ? 'bg-gradient-to-r from-[#800020] to-[#6B0D1B] text-white border-red-700 shadow-sm hover:opacity-95' 
                  : 'bg-[#251E18] text-[#D4AF37] border-[#D4AF37] hover:bg-[#302720]'
              }`}
            >
              {isLight ? <Moon size={14} /> : <Sun size={14} />}
              <span>
                {isLight 
                  ? t('settings.toggleToDark', 'Chuyển sang Giao diện Tối Midnight') 
                  : t('settings.toggleToLight', 'Chuyển sang Giao diện Sáng (Bạc & Đỏ Nâu)')}
              </span>
            </button>
          </div>

          {/* Section 1.5: Language Switcher (Ngôn ngữ: Traditional Chinese, Thai, English, Vietnamese) */}
          <div className={`p-4 rounded-xl border transition-all ${
            isLight 
              ? 'bg-white border-red-300/60 shadow-[0_4px_12px_rgba(128,0,32,0.06)]' 
              : 'bg-[#1C1612] border-[#4A3B2C]'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#800020] dark:text-[#D4AF37]">
                <Globe size={14} /> {t('settings.language', 'Ngôn ngữ hiển thị')}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isLight 
                  ? 'bg-red-50 text-red-800 border-red-300' 
                  : 'bg-[#251E18] text-[#D4AF37] border-[#3E3023]'
              }`}>
                {SUPPORTED_LANGUAGES.find(l => l.code === language)?.flag} {SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? isLight
                          ? 'border-2 border-red-600 bg-red-50 text-red-950 font-bold shadow-sm'
                          : 'border-2 border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] font-bold shadow-sm'
                        : isLight
                          ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-red-300'
                          : 'border-[#3E3023] bg-[#201A16] text-[#A48F7A] hover:border-[#D4AF37]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{lang.flag}</span>
                      <div className="truncate">
                        <p className="text-xs leading-tight truncate">{lang.nativeName}</p>
                        <p className="text-[10px] opacity-70 truncate">{lang.name}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} className={isLight ? 'text-red-700 font-bold shrink-0' : 'text-[#D4AF37] font-bold shrink-0'} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Account Information */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isLight ? 'bg-white border-red-300/60 shadow-sm' : 'bg-[#1C1612] border-[#4A3B2C]'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? 'text-[#800020]' : 'text-[#D4AF37]'
            }`}>
              <User size={14} /> {t('settings.personalInfo', 'Thông tin cá nhân cơ bản')}
            </h4>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-[#A48F7A] mb-1">
                  {t('settings.fullName', 'Họ và tên')}
                </label>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border font-medium focus:outline-none transition-colors ${
                    isLight 
                      ? 'bg-[#F8FAFC] border-red-300 text-[#1E1B18] focus:border-red-600' 
                      : 'bg-[#15100D] border-[#4A3B2C] text-[#EBE3DB] focus:border-[#D4AF37]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-[#A48F7A] mb-1">
                    {t('settings.phoneNumber', 'Số điện thoại')}
                  </label>
                  <input 
                    type="text" 
                    value={userPhone} 
                    onChange={(e) => setUserPhone(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border font-medium focus:outline-none transition-colors ${
                      isLight 
                        ? 'bg-[#F8FAFC] border-red-300 text-[#1E1B18] focus:border-red-600' 
                        : 'bg-[#15100D] border-[#4A3B2C] text-[#EBE3DB] focus:border-[#D4AF37]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-[#A48F7A] mb-1">
                    {t('settings.email', 'Email')}
                  </label>
                  <input 
                    type="email" 
                    value={userEmail} 
                    onChange={(e) => setUserEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border font-medium focus:outline-none transition-colors ${
                      isLight 
                        ? 'bg-[#F8FAFC] border-red-300 text-[#1E1B18] focus:border-red-600' 
                        : 'bg-[#15100D] border-[#4A3B2C] text-[#EBE3DB] focus:border-[#D4AF37]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-[#A48F7A] mb-1">
                  {t('settings.favoriteArea', 'Khu vực ưu tiên tìm quán')}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={userLocation} 
                    onChange={(e) => setUserLocation(e.target.value)}
                    className={`w-full pl-8 pr-3 py-2 rounded-lg border font-medium focus:outline-none transition-colors ${
                      isLight 
                        ? 'bg-[#F8FAFC] border-red-300 text-[#1E1B18] focus:border-red-600' 
                        : 'bg-[#15100D] border-[#4A3B2C] text-[#EBE3DB] focus:border-[#D4AF37]'
                    }`}
                  />
                  <MapPin size={14} className="absolute left-2.5 top-2.5 text-red-600 dark:text-[#D4AF37]" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Notification & Preferences */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isLight ? 'bg-white border-red-300/60 shadow-sm' : 'bg-[#1C1612] border-[#4A3B2C]'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? 'text-[#800020]' : 'text-[#D4AF37]'
            }`}>
              <Bell size={14} /> {t('settings.notifications', 'Thông báo & Bảo mật')}
            </h4>

            <div className="space-y-2 text-xs">
              <PushToggle />

              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="font-medium text-slate-700 dark:text-[#A48F7A]">
                  {t('settings.promoNotif', 'Thông báo Khuyến mãi & Voucher')}
                </span>
                <input 
                  type="checkbox" 
                  checked={notifyPromos} 
                  onChange={(e) => setNotifyPromos(e.target.checked)}
                  className="w-4 h-4 accent-red-700 cursor-pointer"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="font-medium text-slate-700 dark:text-[#A48F7A]">
                  {t('settings.bookingNotif', 'Nhắc nhở lịch đặt bàn cà phê')}
                </span>
                <input 
                  type="checkbox" 
                  checked={notifyBookings} 
                  onChange={(e) => setNotifyBookings(e.target.checked)}
                  className="w-4 h-4 accent-red-700 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Google Maps Platform API Key Config */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isLight ? 'bg-amber-50/60 border-amber-200 shadow-sm' : 'bg-[#1C1612] border-[#4A3B2C]'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-amber-800' : 'text-[#D4AF37]'
              }`}>
                <MapPin size={14} /> Google Maps Platform
              </h4>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new CustomEvent('open-google-maps-config'));
                }}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 shadow-sm ${
                  isLight 
                    ? 'bg-[#800020] text-white border-red-900 hover:bg-[#600018]' 
                    : 'bg-[#D4AF37] text-black border-[#D4AF37] hover:bg-[#b8952b]'
                }`}
              >
                <span>{t('profile.configKey', 'Cấu hình Key')}</span>
                <ExternalLink size={12} />
              </button>
            </div>
            <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
              {t('profile.mapsKeyHint', t('profile.mapsKeyHint', 'Cài đặt Google Maps API Key hoặc Maps Demo Key miễn phí để hiển thị bản đồ vệ tinh và tải danh sách quán cà phê thực tế.'))}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isLight ? 'bg-white border-red-200' : 'bg-[#1A1510] border-[#4A3B2C]'
        }`}>
          {savedSuccess ? (
            <div className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in">
              <Check size={16} /> {t('settings.savedSuccess', 'Đã lưu cài đặt thành công!')}
            </div>
          ) : (
            <div className="flex w-full gap-2">
              <button 
                onClick={onClose}
                className={`flex-1 py-2.5 rounded-xl border font-bold text-xs transition-colors ${
                  isLight 
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                    : 'bg-[#251E18] hover:bg-[#302720] border-[#4A3B2C] text-[#A48F7A]'
                }`}
              >
                {t('settings.cancel', 'Hủy')}
              </button>
              <button 
                onClick={handleSave}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  isLight 
                    ? 'bg-gradient-to-r from-[#800020] via-[#991B1B] to-[#6B0D1B] text-white border border-red-600 hover:opacity-95' 
                    : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] hover:from-[#D4AF37] text-white border border-[#D4AF37]'
                }`}
              >
                <Check size={14} /> {t('settings.saveChanges', 'Lưu thay đổi')}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}


function PassportTab({ isLight }: { isLight: boolean }) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [selectedStoreRank, setSelectedStoreRank] = useState<any | null>(null);
  const [showSystemRank, setShowSystemRank] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [achieveFilter, setAchieveFilter] = useState<'all' | 'achieved' | 'locked'>('all');

  // Rank names follow the UI language; the Vietnamese text in ranks.ts is the fallback.
  const rankTitle = (tier: { id: string; title: string }) => t(`rank.${tier.id}.title`, tier.title);
  const rankSubtitle = (tier: { id: string; subtitle: string }) => t(`rank.${tier.id}.subtitle`, tier.subtitle);

  // Every mission at 0 progress — shown to signed-out visitors and whenever the
  // server cannot be reached, so the mission list is never an empty box.
  const emptyMissions = useMemo(() => buildProgress(EMPTY_STATS, {}), []);

  // Real missions computed by the server from this customer's activity.
  const [serverAch, setServerAch] = useState<any[]>(emptyMissions);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [rank, setRank] = useState<ResolvedRank>(() => resolveRank(0));
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!isAuthenticated) { setServerAch(emptyMissions); setStats({}); setRank(resolveRank(0)); return; }
    let alive = true;
    api.getAchievements()
      .then(r => { if (alive) { setServerAch(r.achievements?.length ? r.achievements : emptyMissions); setStats(r.stats || {}); setRank(r.rank || resolveRank(r.points)); } })
      .catch(() => { if (alive) { setServerAch(emptyMissions); setStats({}); setRank(resolveRank(0)); } });
    return () => { alive = false; };
  }, [isAuthenticated, reloadKey, emptyMissions]);

  /**
   * Keep mission progress live. A completed check-in raises progress even when no
   * mission unlocks, so refresh on any achievement OR booking event, and again
   * whenever the window regains focus (the shop may have completed it while away).
   */
  useEffect(() => {
    if (!isAuthenticated) return;
    const stop = connectRealtime({
      http,
      onEvent: (event) => {
        if (event === 'achievement' || event === 'booking') setReloadKey(k => k + 1);
      }
    });
    const refresh = () => { if (document.visibilityState === 'visible') setReloadKey(k => k + 1); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      stop();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isAuthenticated]);

  const ACH = serverAch.map((a: any) => {
    const n = String(a.id).replace('ach-', '');
    return {
      id: a.id,
      icon: a.icon,
      titleKey: `achievements.ach${n}Title`,
      title: a.title,
      descKey: `achievements.ach${n}Desc`,
      description: a.description,
      rewardKey: `achievements.ach${n}Reward` as string | undefined,
      reward: a.rewardLabel,
      difficulty: a.difficulty as 'easy' | 'medium' | 'hard' | undefined,
      points: a.reward?.points as number | undefined,
      // Distance-based missions are measured in km, the rest are plain counts.
      unit: a.metric === 'travel_distance_km' ? ' km' : '',
      progress: a.progress,
      total: a.target,
      achieved: a.achieved,
      achievedDate: a.unlocked_at ? new Date(a.unlocked_at).toLocaleDateString('vi-VN') : t('profile.completed', 'Đã hoàn thành')
    };
  });

  const filteredAchievements = ACH.filter(a => {
    if (achieveFilter === 'achieved') return a.achieved;
    if (achieveFilter === 'locked') return !a.achieved;
    return true;
  });

  const achievedCount = ACH.filter(a => a.achieved).length;
  const lockedCount = ACH.filter(a => !a.achieved).length;
  const ACH_TOTAL = ACH.length || 8;

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* System Level */}
      <div 
        onClick={() => setShowSystemRank(true)}
        className={`p-5 rounded-3xl relative overflow-hidden group cursor-pointer transition-all border-2 ${
          isLight 
            ? 'bg-gradient-to-r from-[#800020] via-[#6B0D1B] to-[#4A0E17] text-white border-red-600 shadow-[0_10px_25px_rgba(128,0,32,0.2)] hover:shadow-[0_12px_28px_rgba(128,0,32,0.3)]' 
            : 'bg-gradient-to-br from-[#201A16] to-[#14100D] text-[#EBE3DB] border-[#D4AF37] shadow-[0_10px_25px_rgba(0,0,0,0.6)] hover:border-[#D4AF37]/80'
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:scale-110 transition-transform">
          <Award size={100} className={isLight ? 'text-white' : 'text-[#D4AF37]'} />
        </div>
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isLight ? 'text-red-200' : 'text-[#A48F7A]'}`}>
              {t('profile.memberRank', 'Hạng thành viên')}
            </p>
            <p className="text-2xl font-bold drop-shadow-md flex items-center gap-2">
              <span>{rank.current.icon}</span>
              <span>{rankTitle(rank.current)}</span>
            </p>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-red-100/90' : 'text-[#A48F7A]'}`}>{rankSubtitle(rank.current)}</p>
          </div>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-sm shrink-0 ${
            isLight ? 'bg-white/20 border-white' : 'bg-[#1A1510]'
          }`} style={{ borderColor: isLight ? undefined : rank.current.color }}>
            <span className="text-xl">{rank.current.icon}</span>
          </div>
        </div>
        <div className={`h-2 rounded-full overflow-hidden mb-2 relative z-10 border ${
          isLight ? 'bg-black/20 border-white/20' : 'bg-[#1A1510] border-[#3E3023]'
        }`}>
          <div className="h-full shadow-md transition-all duration-500" style={{ width: `${rank.progressPercent}%`, background: `linear-gradient(to right, ${rank.current.color}, ${rank.next?.color || rank.current.color})` }} />
        </div>
        <div className={`flex justify-between text-[10px] font-bold relative z-10 uppercase tracking-wider ${
          isLight ? 'text-red-100' : 'text-[#A48F7A]'
        }`}>
          <span>{rank.points.toLocaleString('vi-VN')} {t('profile.points', 'điểm')} · {stats.shops_visited || 0} {t('profile.stores', 'Quán')}</span>
          <span>
            {rank.isMax
              ? t('profile.rankMax', 'Hạng cao nhất')
              : `${t('profile.rankNext', 'Còn')} ${rank.pointsToNext.toLocaleString('vi-VN')} → ${rankTitle(rank.next!)}`}
          </span>
        </div>
      </div>

      {/* Achievements Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className={`text-xs sm:text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
            isLight ? 'text-[#800020]' : 'text-[#D4AF37]'
          }`}>
            <Sparkles size={14} className={isLight ? 'text-red-700' : 'text-[#D4AF37]'} />
            <span>{t('profile.personalAchievements', 'Nhiệm Vụ Khám Phá')}</span>
          </h3>
          <div className="flex items-center">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-xs inline-flex items-center gap-1.5 transition-all ${
              isLight 
                ? 'bg-red-50/90 text-red-900 border-red-200/90 shadow-[0_2px_8px_rgba(128,0,32,0.06)]' 
                : 'bg-[#1A1510] text-[#D4AF37] border-[#4A3B2C] shadow-[0_2px_8px_rgba(0,0,0,0.4)]'
            }`}>
              <span>{t('profile.achievedCount', 'Đã đạt')}</span>
              <span className="font-mono font-extrabold">{achievedCount}/{ACH_TOTAL}</span>
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={`flex rounded-xl p-1 border mb-3 transition-all ${
          isLight ? 'bg-white/90 border-red-200 shadow-xs' : 'bg-[#120E0C] border-[#4A3B2C]'
        }`}>
          <button 
            onClick={() => setAchieveFilter('all')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              achieveFilter === 'all' 
                ? isLight ? 'bg-gradient-to-r from-[#800020] to-[#991B1B] text-white shadow-sm' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white border border-[#D4AF37]/50 shadow-sm' 
                : isLight ? 'text-slate-600 hover:text-red-900' : 'text-[#7A6450] hover:text-[#A48F7A]'
            }`}
          >
            {t('profile.filterAll', 'Tất cả')} ({ACH_TOTAL})
          </button>
          <button 
            onClick={() => setAchieveFilter('achieved')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              achieveFilter === 'achieved' 
                ? isLight ? 'bg-gradient-to-r from-[#800020] to-[#991B1B] text-white shadow-sm' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white border border-[#D4AF37]/50 shadow-sm' 
                : isLight ? 'text-slate-600 hover:text-red-900' : 'text-[#7A6450] hover:text-[#A48F7A]'
            }`}
          >
            {t('profile.filterAchieved', 'Đã đạt')} ({achievedCount})
          </button>
          <button 
            onClick={() => setAchieveFilter('locked')}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
              achieveFilter === 'locked' 
                ? isLight ? 'bg-gradient-to-r from-[#800020] to-[#991B1B] text-white shadow-sm' : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] text-white border border-[#D4AF37]/50 shadow-sm' 
                : isLight ? 'text-slate-600 hover:text-red-900' : 'text-[#7A6450] hover:text-[#A48F7A]'
            }`}
          >
            {t('profile.filterLocked', 'Chưa đạt')} ({lockedCount})
          </button>
        </div>

        {!isAuthenticated && (
          <p className={`text-xs rounded-xl px-3 py-2 mb-2.5 border ${isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-[#1A1510] border-[#3E3023] text-[#D4AF37]'}`}>
            {t('profile.signInToEarn', 'Đăng nhập để bắt đầu tích lũy. Mỗi lần check-in hoàn tất tại quán, viết đánh giá và đăng ảnh đều được tính.')}
          </p>
        )}
        {/* Achievement List */}
        <div className="space-y-2.5">
          {filteredAchievements.map((ach) => (
            <div 
              key={ach.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                ach.achieved
                  ? isLight
                    ? 'bg-gradient-to-r from-red-50/80 to-amber-50/80 border-red-300/80 shadow-sm'
                    : 'bg-gradient-to-r from-[#251E18] to-[#1A1510] border-[#D4AF37]/50'
                  : isLight
                    ? 'bg-slate-100/70 border-slate-200'
                    : 'bg-[#0E0B09] border-[#2A211A]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 border ${
                    ach.achieved
                      ? isLight ? 'bg-white border-red-300 shadow-sm' : 'bg-[#1A1510] border-[#D4AF37]'
                      : isLight ? 'bg-slate-200/70 border-slate-300' : 'bg-[#120E0C] border-[#2A211A]'
                  }`}
                  // Locked missions stay visible but dimmed, so people can see what is coming.
                  style={ach.achieved ? undefined : { filter: 'grayscale(1)', opacity: 0.45 }}
                >
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4 className={`font-bold text-xs truncate ${
                      isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'
                    }`}>{t(ach.titleKey, ach.title)}</h4>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                      ach.achieved
                        ? isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                        : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-[#1A1510] text-[#7A6450] border-[#3E3023]'
                    }`}>
                      {ach.achieved ? t('profile.unlocked', '✓ Đã đạt') : t('profile.locked', 'Chưa đạt')}
                    </span>
                  </div>
                  {/* Difficulty + point value */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {ach.difficulty && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        ach.difficulty === 'easy'
                          ? (isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/50 text-emerald-300 border-emerald-800')
                          : ach.difficulty === 'medium'
                          ? (isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/50 text-amber-300 border-amber-800')
                          : (isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-950/50 text-rose-300 border-rose-800')
                      }`}>
                        {ach.difficulty === 'easy'
                          ? t('mission.easy', 'Dễ')
                          : ach.difficulty === 'medium'
                          ? t('mission.medium', 'Trung bình')
                          : t('mission.hard', 'Khó')}
                      </span>
                    )}
                    {typeof ach.points === 'number' && (
                      <span className={`text-[10px] font-extrabold ${isLight ? 'text-[#800020]' : 'text-[#D4AF37]'}`}>+{ach.points?.toLocaleString('vi-VN')} {t('profile.points', 'điểm')}</span>
                    )}
                  </div>
                  <p className={`text-[11px] mb-2 leading-relaxed ${
                    ach.achieved
                      ? (isLight ? 'text-slate-600' : 'text-[#A48F7A]')
                      : (isLight ? 'text-slate-500/80' : 'text-[#6B5B4A]')
                  }`}>
                    {t(ach.descKey, ach.description)}
                  </p>
                  <p className={`text-[10px] font-bold mb-2 ${
                    ach.achieved
                      ? (isLight ? 'text-amber-700' : 'text-amber-300')
                      : (isLight ? 'text-amber-700/60' : 'text-amber-200/45')
                  }`}>
                    🎁 {ach.rewardKey ? t(ach.rewardKey, ach.reward) : ach.reward}
                  </p>
                  
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className={ach.achieved ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : (isLight ? 'text-slate-700' : 'text-[#A48F7A]')}>
                        {ach.achieved
                          ? `${t('profile.completed', 'Đã hoàn thành')} (${ach.progress}${ach.unit}/${ach.total}${ach.unit})`
                          : `${t('profile.progress', 'Tiến trình')}: ${ach.progress}${ach.unit}/${ach.total}${ach.unit}`}
                      </span>
                      <span className={isLight ? 'text-red-900' : 'text-[#D4AF37]'}>
                        {ach.achieved ? ach.achievedDate : `${Math.floor((ach.progress / ach.total) * 100)}%`}
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden border ${
                      isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#120E0C] border-[#3E3023]'
                    }`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          ach.achieved 
                            ? 'bg-emerald-500' 
                            : isLight ? 'bg-gradient-to-r from-red-600 to-[#800020]' : 'bg-gradient-to-r from-[#B88645] to-[#D4AF37]'
                        }`} 
                        style={{ width: `${Math.min(100, Math.round((ach.progress / ach.total) * 100))}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Store Levels */}
      <div>
        <h3 className={`text-[11px] font-bold uppercase tracking-widest mb-3 px-1 ${
          isLight ? 'text-red-900' : 'text-[#A48F7A]'
        }`}>
          {t('profile.favoriteStoreAchievements', 'Thành Tựu Quán Yêu Thích')}
        </h3>
        <div className="space-y-3">
          <StoreRankCard 
            name="The Workshop Coffee" 
            visits={15} 
            tierKey="storeTier.vip"
            tier="Khách ruột (VIP)" 
            nextRewardKey="storeReward.freePastry"
            nextReward="Bánh ngọt miễn phí" 
            progress={80} 
            isLight={isLight}
            onClick={() => setSelectedStoreRank({
              name: "The Workshop Coffee", 
              visits: 15, 
              tierKey: "storeTier.vip",
              tier: "Khách ruột (VIP)", 
              nextRewardKey: "storeReward.freePastry",
              nextReward: "Bánh ngọt miễn phí", 
              progress: 80, 
              reviews: 3,
              achievements: [
                { titleKey: 'storeAch.newTitle', title: t('tier.newLabel', 'Khách Mới'), descKey: 'storeAch.newDesc', desc: t('tier.firstVisit', 'Ghé quán lần đầu tiên'), achieved: true, date: '02/01/2026' },
                { titleKey: 'storeAch.regularTitle', title: t('tier.regularLabel', 'Khách Quen'), descKey: 'storeAch.regularDesc', desc: t('tier.fiveVisits', 'Ghé quán 5 lần'), achieved: true, date: '15/03/2026' },
                { titleKey: 'storeAch.vipTitle', title: t('tier.vipLabel', 'Khách Ruột (VIP)'), descKey: 'storeAch.vipDesc', desc: t('tier.tenVisits', 'Ghé quán 10 lần & viết 2 review'), achieved: true, date: '10/05/2026' },
                { titleKey: 'storeAch.soulmateTitle', title: t('tier.soulmate', 'Tri Kỷ Cà Phê'), descKey: 'storeAch.soulmateDesc', desc: t('tier.twentyVisits', 'Ghé quán 20 lần'), achieved: false, progress: '15/20' }
              ]
            })}
          />
          <StoreRankCard 
            name="SOK - Space of K" 
            visits={5} 
            tierKey="storeTier.regular"
            tier="Khách quen (Regular)" 
            nextRewardKey="storeReward.discount10"
            nextReward="Giảm 10% hóa đơn" 
            progress={40} 
            isLight={isLight}
            onClick={() => setSelectedStoreRank({
              name: "SOK - Space of K", 
              visits: 5, 
              tierKey: "storeTier.regular",
              tier: "Khách quen (Regular)", 
              nextRewardKey: "storeReward.discount10",
              nextReward: "Giảm 10% hóa đơn", 
              progress: 40, 
              reviews: 1,
              achievements: [
                { titleKey: 'storeAch.newTitle', title: t('tier.newLabel', 'Khách Mới'), descKey: 'storeAch.newDesc', desc: t('tier.firstVisit', 'Ghé quán lần đầu tiên'), achieved: true, date: '10/04/2026' },
                { titleKey: 'storeAch.regularTitle', title: t('tier.regularLabel', 'Khách Quen'), descKey: 'storeAch.regularDesc', desc: t('tier.fiveVisits', 'Ghé quán 5 lần'), achieved: true, date: '20/06/2026' },
                { titleKey: 'storeAch.vipTitle', title: t('tier.vipLabel', 'Khách Ruột (VIP)'), descKey: 'storeAch.vipDesc', desc: t('tier.tenVisits', 'Ghé quán 10 lần & viết 2 review'), achieved: false, progress: '5/10' },
                { titleKey: 'storeAch.soulmateTitle', title: t('tier.soulmate', 'Tri Kỷ Cà Phê'), descKey: 'storeAch.soulmateDesc', desc: t('tier.twentyVisits', 'Ghé quán 20 lần'), achieved: false, progress: '5/20' }
              ]
            })}
          />
          <StoreRankCard 
            name="Blanc. Cafe" 
            visits={1} 
            tierKey="storeTier.new"
            tier="Khách mới (New)" 
            nextRewardKey="storeReward.welcomeDrink"
            nextReward="Nước chào mừng" 
            progress={10} 
            isLight={isLight}
            onClick={() => setSelectedStoreRank({
              name: "Blanc. Cafe", 
              visits: 1, 
              tierKey: "storeTier.new",
              tier: "Khách mới (New)", 
              nextRewardKey: "storeReward.welcomeDrink",
              nextReward: "Nước chào mừng", 
              progress: 10, 
              reviews: 0,
              achievements: [
                { titleKey: 'storeAch.newTitle', title: t('tier.newLabel', 'Khách Mới'), descKey: 'storeAch.newDesc', desc: t('tier.firstVisit', 'Ghé quán lần đầu tiên'), achieved: true, date: '18/07/2026' },
                { titleKey: 'storeAch.regularTitle', title: t('tier.regularLabel', 'Khách Quen'), descKey: 'storeAch.regularDesc', desc: t('tier.fiveVisits', 'Ghé quán 5 lần'), achieved: false, progress: '1/5' },
                { titleKey: 'storeAch.vipTitle', title: t('tier.vipLabel', 'Khách Ruột (VIP)'), descKey: 'storeAch.vipDesc', desc: t('tier.tenVisits', 'Ghé quán 10 lần & viết 2 review'), achieved: false, progress: '1/10' },
                { titleKey: 'storeAch.soulmateTitle', title: t('tier.soulmate', 'Tri Kỷ Cà Phê'), descKey: 'storeAch.soulmateDesc', desc: t('tier.twentyVisits', 'Ghé quán 20 lần'), achieved: false, progress: '1/20' }
              ]
            })}
          />
        </div>
      </div>

      {/* Leaderboard Teaser */}
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowLeaderboardModal(true)}
        className={`rounded-2xl p-4 border transition-all flex items-center justify-between cursor-pointer group ${
        isLight 
          ? 'bg-white border-red-700/30 hover:border-red-600 shadow-[0_4px_15px_rgba(128,0,32,0.06)]' 
          : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C] hover:border-[#8B6E4E] shadow-[0_4px_15px_rgba(0,0,0,0.5)]'
      }`}>
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🏆</span>
            <h3 className={`font-bold transition-colors text-sm ${
              isLight ? 'text-[#1E1B18] group-hover:text-red-800' : 'text-[#EBE3DB] group-hover:text-[#D4AF37]'
            }`}>
              {t('profile.leaderboardTitle', 'Bảng xếp hạng khu vực')}
            </h3>
          </div>
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-[#A48F7A]'}`}>
            {t('profile.leaderboardDesc', 'Bạn đang ở top 15% Quận 1')}
          </p>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
          isLight ? 'bg-red-50 border-red-200 text-red-700 group-hover:bg-red-100' : 'bg-[#1A1510] border-[#3E3023] text-[#A48F7A] group-hover:text-[#D4AF37] group-hover:border-[#D4AF37]'
        }`}>
          <ChevronRight size={18} />
        </div>
      </motion.div>

      {selectedStoreRank && (
        <StoreProgressModal data={selectedStoreRank} onClose={() => setSelectedStoreRank(null)} isLight={isLight} />
      )}

      {showSystemRank && (
        <SystemProgressModal onClose={() => setShowSystemRank(false)} isLight={isLight} achievements={ACH} stats={stats} rank={rank} />
      )}

      {showLeaderboardModal && (
        <LeaderboardModal onClose={() => setShowLeaderboardModal(false)} isLight={isLight} />
      )}
    </div>
  );
}

function StoreRankCard({ 
  name, 
  visits, 
  tier, 
  tierKey,
  nextReward, 
  nextRewardKey,
  progress, 
  onClick, 
  isLight 
}: { 
  name: string, 
  visits: number, 
  tier: string, 
  tierKey?: string,
  nextReward: string, 
  nextRewardKey?: string,
  progress: number, 
  onClick: () => void, 
  isLight: boolean 
}) {
  const { t } = useLanguage();
  const displayTier = tierKey ? t(tierKey, tier) : tier;
  const displayReward = nextRewardKey ? t(nextRewardKey, nextReward) : nextReward;

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }} 
      onClick={onClick} 
      className={`rounded-2xl p-4 border flex items-center gap-4 transition-all cursor-pointer group ${
        isLight 
          ? 'bg-white border-red-700/30 hover:border-red-600 shadow-[0_4px_12px_rgba(128,0,32,0.06)]' 
          : 'bg-gradient-to-b from-[#201A16] to-[#14100D] border-[#4A3B2C] hover:border-[#8B6E4E] shadow-[0_4px_15px_rgba(0,0,0,0.4)]'
      }`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
        isLight 
          ? 'bg-red-50 border-red-300 text-red-800 group-hover:bg-red-100' 
          : 'bg-[#1A1510] border-[#4A3B2C] text-[#D4AF37] group-hover:bg-[#251E18]'
      }`}>
        <Coffee size={20} />
      </div>
      <div className="flex-1">
        <h4 className={`font-bold text-sm transition-colors ${
          isLight ? 'text-[#1E1B18] group-hover:text-red-800' : 'text-[#EBE3DB] group-hover:text-[#D4AF37]'
        }`}>{name}</h4>
        <div className="flex items-center gap-2 mt-1 mb-2">
          <span className={`font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border ${
            isLight 
              ? 'bg-red-50 text-red-800 border-red-200' 
              : 'bg-[#1A1510] text-[#D4AF37] border-[#3E3023]'
          }`}>{displayTier}</span>
          <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-[#A48F7A]'}`}>{visits} {t('profile.visits', 'lần ghé')}</span>
        </div>
        <div className={`rounded-full h-1.5 mb-1 border ${
          isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#1A1510] border-[#3E3023]'
        }`}>
          <div className={`h-full rounded-full ${
            isLight ? 'bg-gradient-to-r from-red-600 to-[#800020]' : 'bg-gradient-to-r from-[#B88645] to-[#D4AF37]'
          }`} style={{ width: `${progress}%` }} />
        </div>
        <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-[#7A6450]'}`}>
          {t('profile.nextReward', 'Tiếp theo:')} <span className={`font-bold ${isLight ? 'text-red-900' : 'text-[#A48F7A]'}`}>{displayReward}</span>
        </p>
      </div>
    </motion.div>
  );
}

function StoreProgressModal({ data, onClose, isLight }: { data: any, onClose: () => void, isLight: boolean }) {
  const { t } = useLanguage();
  const displayTier = data.tierKey ? t(data.tierKey, data.tier) : data.tier;
  const displayReward = data.nextRewardKey ? t(data.nextRewardKey, data.nextReward) : data.nextReward;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[80] flex flex-col p-4 animate-in fade-in">
      <div className="flex justify-end mb-4 pt-10">
        <button onClick={onClose} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
          isLight ? 'bg-white border-red-300 text-slate-800' : 'bg-[#1A1510] border-[#4A3B2C] text-white'
        }`}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="text-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 mx-auto mb-4 ${
            isLight ? 'bg-red-50 border-red-600 text-red-800' : 'bg-[#1A1510] border-[#D4AF37] text-[#D4AF37]'
          }`}>
            <Coffee size={40} />
          </div>
          <h2 className={`text-2xl font-bold mb-1 ${isLight ? 'text-white' : 'text-[#EBE3DB]'}`}>{data.name}</h2>
          <span className={`font-bold px-3 py-1 rounded text-xs uppercase tracking-wider border ${
            isLight ? 'bg-white/20 text-white border-white/40' : 'bg-[#1A1510] text-[#D4AF37] border-[#3E3023]'
          }`}>{displayTier}</span>
        </div>

        <div className={`border rounded-2xl p-5 mb-6 ${
          isLight ? 'bg-white text-slate-800 border-red-300' : 'bg-[#1A1510] text-[#EBE3DB] border-[#4A3B2C]'
        }`}>
          <div className="flex justify-between items-center mb-4 text-xs font-bold">
            <span>{t('profile.currentProgress', 'Tiến trình hiện tại')}</span>
            <span>{data.visits} {t('profile.visits', 'lần ghé')} • {data.reviews} {t('profile.reviewsCount', 'review')}</span>
          </div>
          <div className="bg-slate-200 dark:bg-[#120E0C] rounded-full h-2 mb-3">
            <div className={`h-full rounded-full ${
              isLight ? 'bg-gradient-to-r from-red-600 to-[#800020]' : 'bg-gradient-to-r from-[#B88645] to-[#D4AF37]'
            }`} style={{ width: `${data.progress}%` }} />
          </div>
          <p className="text-xs text-center opacity-80">
            {5 - (data.visits % 5)} {t('profile.visits', 'lần ghé')} &rarr; <span className="font-bold text-red-600 dark:text-[#D4AF37]">{displayReward}</span>
          </p>
        </div>

        {/* Store Specific Achievements */}
        {data.achievements && (
          <div className={`border rounded-2xl p-5 ${
            isLight ? 'bg-white text-slate-800 border-red-300' : 'bg-[#1A1510] text-[#EBE3DB] border-[#4A3B2C]'
          }`}>
            <h3 className="font-bold text-xs uppercase tracking-widest mb-4 opacity-90">
              {t('profile.storeTitles', 'Danh hiệu tại')} {data.name}
            </h3>
            <div className="space-y-3">
              {data.achievements.map((ach: any, idx: number) => {
                const titleText = ach.titleKey ? t(ach.titleKey, ach.title) : ach.title;
                const descText = ach.descKey ? t(ach.descKey, ach.desc) : ach.desc;
                return (
                  <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between ${
                    ach.achieved 
                      ? isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/30 border-emerald-800'
                      : isLight ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-[#120E0C] border-[#3E3023] opacity-60'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{titleText}</span>
                        {ach.achieved ? (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{t('profile.unlocked', '✓ Đã đạt')}</span>
                        ) : (
                          <span className="text-[9px] text-slate-400">({ach.progress})</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#A48F7A]">{descText}</p>
                    </div>
                    {ach.achieved && (
                      <span className="text-[10px] text-slate-400 font-mono">{ach.date}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SystemProgressModal({ onClose, isLight, achievements, stats, rank }: { onClose: () => void, isLight: boolean, achievements: any[], stats: Record<string, number>, rank: ResolvedRank }) {
  const { t } = useLanguage();
  const rankTitle = (tier: { id: string; title: string }) => t(`rank.${tier.id}.title`, tier.title);
  const rankSubtitle = (tier: { id: string; subtitle: string }) => t(`rank.${tier.id}.subtitle`, tier.subtitle);
  const achieved = achievements.filter(a => a.achieved);
  const locked = achievements.filter(a => !a.achieved);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[80] flex flex-col p-4 animate-in fade-in">
      <div className="flex justify-end mb-4 pt-10">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 border border-white/30 text-white flex items-center justify-center">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10 text-white space-y-6">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center border-2 mx-auto mb-4 shadow-xl text-5xl" style={{ borderColor: rank.current.color, background: `radial-gradient(circle at 30% 30%, ${rank.current.color}44, #1A1510)` }}>
            {rank.current.icon}
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-200 mb-1">
            {t('profile.systemRank', 'Hạng hệ thống')}
          </p>
          <h2 className="text-3xl font-bold text-white mb-1">
            {rankTitle(rank.current)}
          </h2>
          <p className="text-xs text-red-200/80 mb-3">{rankSubtitle(rank.current)}</p>

          {/* Points + progress to next rank */}
          <div className="max-w-xs mx-auto">
            <div className="flex justify-between text-[11px] font-bold text-amber-200 mb-1">
              <span>{rank.points.toLocaleString('vi-VN')} {t('profile.points', 'điểm')}</span>
              <span>{rank.isMax ? t('profile.rankMax', 'Hạng cao nhất') : `→ ${rankTitle(rank.next!)}`}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-black/40 border border-white/15">
              <div className="h-full transition-all duration-500" style={{ width: `${rank.progressPercent}%`, background: `linear-gradient(to right, ${rank.current.color}, ${rank.next?.color || rank.current.color})` }} />
            </div>
            {!rank.isMax && (
              <p className="text-[10px] text-red-200/70 mt-1">
                {t('profile.rankNeed', 'Cần thêm {n} điểm để lên hạng').replace('{n}', rank.pointsToNext.toLocaleString('vi-VN'))}
              </p>
            )}
          </div>
        </div>

        {/* Full rank ladder */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-3 flex items-center gap-2">
            <span>🧭</span> {t('profile.rankLadder', 'Hành trình thăng hạng')}
          </h3>
          <div className="space-y-2">
            {RANK_TIERS.map((tier, i) => {
              const reached = rank.points >= tier.minPoints;
              const isCurrent = i === rank.level;
              return (
                <div key={tier.id} className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  isCurrent ? 'bg-white/15 border-white/50' : reached ? 'bg-white/5 border-white/15' : 'bg-black/20 border-white/10 opacity-60'
                }`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border" style={{ borderColor: tier.color, background: reached ? `${tier.color}33` : 'transparent' }}>
                    {reached ? tier.icon : '🔒'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <h4 className="font-bold text-sm text-white truncate">{rankTitle(tier)}</h4>
                      {isCurrent && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-black shrink-0">{t('profile.rankCurrent', 'Hiện tại')}</span>}
                    </div>
                    <p className="text-[11px] text-white/60 truncate">{rankSubtitle(tier)}</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-200 shrink-0">{tier.minPoints.toLocaleString()} {t('profile.pointsShort', 'đ')}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-300 mb-1">{stats.shops_visited || 0}</div>
            <div className="text-[10px] uppercase font-bold text-red-100">
              {t('profile.visitedStores', 'Quán đã đến')}
            </div>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-300 mb-1">{stats.reviews_total || 0}</div>
            <div className="text-[10px] uppercase font-bold text-red-100">
              {t('profile.totalReviews', 'Bài Review')}
            </div>
          </div>
        </div>

        {/* Achieved Section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
            <span>🏆</span> {t('profile.unlockedAchievements', 'Thành Tựu Đã Đạt')} ({achieved.length})
          </h3>
          <div className="space-y-2.5">
            {achieved.map(ach => (
              <div key={ach.id} className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-400 flex items-center justify-center text-xl shrink-0">
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-xs text-emerald-200 truncate">{t(ach.titleKey, ach.title)}</h4>
                    <span className="text-[9px] text-emerald-400 font-mono">{ach.achievedDate}</span>
                  </div>
                  <p className="text-[11px] text-emerald-100/70">{t(ach.descKey, ach.description)}</p>
                  <p className="text-[10px] font-bold text-amber-300 mt-1">
                    {t('profile.reward', 'Phần thưởng:')} {ach.rewardKey ? t(ach.rewardKey, ach.reward) : ach.reward}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Locked Section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <span>🔒</span> {t('profile.lockedAchievements', 'Thành Tựu Chưa Đạt')} ({locked.length})
          </h3>
          <div className="space-y-2.5">
            {locked.map(ach => (
              <div key={ach.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 opacity-80">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl shrink-0 grayscale">
                  {ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-xs text-slate-200 truncate">{t(ach.titleKey, ach.title)}</h4>
                    <span className="text-[10px] text-amber-300 font-bold">{ach.progress}/{ach.total}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-1.5">{t(ach.descKey, ach.description)}</p>
                  <p className="text-[10px] font-bold text-amber-300 mb-1.5">
                    {t('profile.reward', 'Phần thưởng:')} {ach.rewardKey ? t(ach.rewardKey, ach.reward) : ach.reward}
                  </p>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden border border-white/10">
                    <div 
                      className="bg-amber-400 h-full rounded-full" 
                      style={{ width: `${Math.round((ach.progress / ach.total) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExplorerRank {
  id: string;
  rank: number;
  name: string;
  isYou?: boolean;
  avatar: string;
  points: number;
  checkins: number;
  districtKey: string;
  districtFallback: string;
  badgeKey?: string;
  badgeFallback?: string;
}

const DISTRICT_EXPLORERS: Record<string, ExplorerRank[]> = {
  all: [
    { id: 'exp-1', rank: 1, name: 'Minh Triết', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', points: 2850, checkins: 38, districtKey: 'leaderboard.district1', districtFallback: 'Quận 1', badgeKey: 'leaderboard.top1Badge', badgeFallback: '👑 Quán quân khám phá' },
    { id: 'exp-2', rank: 2, name: 'Hoàng Lan', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80', points: 2410, checkins: 31, districtKey: 'leaderboard.district2', districtFallback: 'Quận 2', badgeKey: 'leaderboard.top2Badge', badgeFallback: '🥈 Á quân 1' },
    { id: 'exp-3', rank: 3, name: 'Gia Hưng', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80', points: 1980, checkins: 26, districtKey: 'leaderboard.district3', districtFallback: 'Quận 3', badgeKey: 'leaderboard.top3Badge', badgeFallback: '🥉 Á quân 2' },
    { id: 'exp-you', rank: 4, name: 'Bạn', isYou: true, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80', points: 1420, checkins: 24, districtKey: 'leaderboard.district1', districtFallback: 'Quận 1' },
    { id: 'exp-4', rank: 5, name: 'Thuỳ Dương', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80', points: 1290, checkins: 19, districtKey: 'leaderboard.districtBinhThanh', districtFallback: 'Bình Thạnh' },
    { id: 'exp-5', rank: 6, name: 'Tuấn Anh', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80', points: 1150, checkins: 17, districtKey: 'leaderboard.district1', districtFallback: 'Quận 1' },
  ],
  d1: [
    { id: 'exp-1', rank: 1, name: 'Minh Triết', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', points: 2850, checkins: 38, districtKey: 'leaderboard.district1', districtFallback: 'Quận 1', badgeKey: 'leaderboard.top1Badge', badgeFallback: '👑 Quán quân khám phá' },
    { id: 'exp-you', rank: 2, name: 'Bạn', isYou: true, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80', points: 1420, checkins: 24, districtKey: 'leaderboard.district1', districtFallback: 'Quận 1', badgeKey: 'leaderboard.top2Badge', badgeFallback: '🥈 Á quân 1' },
    { id: 'exp-5', rank: 3, name: 'Tuấn Anh', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80', points: 1150, checkins: 17, districtKey: 'leaderboard.district1', districtFallback: 'Quận 1', badgeKey: 'leaderboard.top3Badge', badgeFallback: '🥉 Á quân 2' },
  ],
  d2: [
    { id: 'exp-2', rank: 1, name: 'Hoàng Lan', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80', points: 2410, checkins: 31, districtKey: 'leaderboard.district2', districtFallback: 'Quận 2', badgeKey: 'leaderboard.top1Badge', badgeFallback: '👑 Quán quân khám phá' },
    { id: 'exp-6', rank: 2, name: 'Bảo Trâm', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80', points: 1340, checkins: 18, districtKey: 'leaderboard.district2', districtFallback: 'Quận 2', badgeKey: 'leaderboard.top2Badge', badgeFallback: '🥈 Á quân 1' },
  ],
  d3: [
    { id: 'exp-3', rank: 1, name: 'Gia Hưng', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80', points: 1980, checkins: 26, districtKey: 'leaderboard.district3', districtFallback: 'Quận 3', badgeKey: 'leaderboard.top1Badge', badgeFallback: '👑 Quán quân khám phá' },
    { id: 'exp-7', rank: 2, name: 'Mai Phương', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80', points: 1220, checkins: 16, districtKey: 'leaderboard.district3', districtFallback: 'Quận 3', badgeKey: 'leaderboard.top2Badge', badgeFallback: '🥈 Á quân 1' },
  ],
  bt: [
    { id: 'exp-4', rank: 1, name: 'Thuỳ Dương', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80', points: 1290, checkins: 19, districtKey: 'leaderboard.districtBinhThanh', districtFallback: 'Bình Thạnh', badgeKey: 'leaderboard.top1Badge', badgeFallback: '👑 Quán quân khám phá' },
    { id: 'exp-8', rank: 2, name: 'Đăng Khoa', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&auto=format&fit=crop&q=80', points: 980, checkins: 13, districtKey: 'leaderboard.districtBinhThanh', districtFallback: 'Bình Thạnh', badgeKey: 'leaderboard.top2Badge', badgeFallback: '🥈 Á quân 1' },
  ]
};

function LeaderboardModal({ onClose, isLight }: { onClose: () => void, isLight: boolean }) {
  const { t } = useLanguage();
  const { profile } = useUser();
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  const districtList = [
    { key: 'all', label: t('leaderboard.allDistricts', 'Tất cả quận') },
    { key: 'd1', label: t('leaderboard.district1', 'Quận 1') },
    { key: 'd2', label: t('leaderboard.district2', 'Quận 2 (Thảo Điền)') },
    { key: 'd3', label: t('leaderboard.district3', 'Quận 3') },
    { key: 'bt', label: t('leaderboard.districtBinhThanh', 'Bình Thạnh') },
  ];

  const currentList = DISTRICT_EXPLORERS[selectedDistrict] || DISTRICT_EXPLORERS['all'];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[85] flex flex-col p-4 animate-in fade-in">
      <div className="flex justify-end mb-3 pt-10">
        <button 
          onClick={onClose} 
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 text-white flex items-center justify-center transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-12 text-white space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-[#800020] via-amber-600 to-[#D4AF37] rounded-full flex items-center justify-center border-2 border-amber-300 mx-auto mb-3 shadow-xl">
            <Trophy size={38} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {t('leaderboard.modalTitle', 'Bảng Xếp Hạng Khám Phá')}
          </h2>
          <p className="text-xs text-amber-200/90 max-w-xs mx-auto">
            {t('leaderboard.modalSubtitle', 'Top người sành cà phê tích cực nhất tại TP.HCM')}
          </p>
        </div>

        {/* User Current Standing Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/70 via-[#201A16] to-amber-950/70 border border-amber-500/50 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                {t('leaderboard.yourRankTitle', 'Thứ hạng của bạn')}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
              #4 {t('leaderboard.rankCol', 'Hạng')}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-200">
            <p className="text-[11px] text-amber-100/80">
              {t('leaderboard.topPercent', 'Bạn đang ở top 15% Quận 1')}
            </p>
            <div className="font-mono font-bold text-amber-300 text-sm">
              1,420 {t('leaderboard.pointsCol', 'Điểm')}
            </div>
          </div>
        </div>

        {/* District Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {districtList.map(dist => (
            <button
              key={dist.key}
              onClick={() => setSelectedDistrict(dist.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                selectedDistrict === dist.key
                  ? 'bg-[#D4AF37] text-black border-amber-300 shadow-md scale-[1.02]'
                  : 'bg-white/10 text-slate-300 border-white/15 hover:bg-white/20'
              }`}
            >
              {dist.label}
            </button>
          ))}
        </div>

        {/* Rankings List */}
        <div className="space-y-2.5">
          {currentList.map((exp) => {
            const displayName = exp.isYou ? `${t('leaderboard.you', 'Bạn')} (${profile.name || exp.name})` : exp.name;
            const displayAvatar = exp.isYou ? profile.avatar : exp.avatar;
            const displayDistrict = t(exp.districtKey, exp.districtFallback);
            const badgeText = exp.badgeKey ? t(exp.badgeKey, exp.badgeFallback || '') : '';

            const rankMedal = exp.rank === 1 ? '🥇' : exp.rank === 2 ? '🥈' : exp.rank === 3 ? '🥉' : `#${exp.rank}`;

            return (
              <div 
                key={exp.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                  exp.isYou
                    ? 'bg-gradient-to-r from-red-900/60 to-amber-900/60 border-amber-400 shadow-md ring-1 ring-amber-400/30'
                    : 'bg-white/10 border-white/15 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 font-black text-center text-sm ${
                    exp.rank === 1 ? 'text-amber-300 text-base' : exp.rank === 2 ? 'text-slate-300 text-base' : exp.rank === 3 ? 'text-amber-500 text-base' : 'text-slate-400'
                  }`}>
                    {rankMedal}
                  </div>

                  <img 
                    src={displayAvatar} 
                    alt={displayName} 
                    referrerPolicy="no-referrer"
                    className={`w-10 h-10 rounded-full object-cover border-2 ${
                      exp.isYou ? 'border-amber-400' : 'border-white/30'
                    }`}
                  />

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-xs ${exp.isYou ? 'text-amber-300' : 'text-white'}`}>
                        {displayName}
                      </span>
                      {badgeText && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                          {badgeText}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5">
                      <span>{displayDistrict}</span>
                      <span>•</span>
                      <span>{exp.checkins} {t('leaderboard.checkinsCol', 'Check-in')}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-amber-300">
                    {exp.points.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                    {t('leaderboard.pointsCol', 'Điểm')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Close button at bottom */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 font-bold text-sm text-white transition-colors"
          >
            {t('leaderboard.close', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletTab({ isLight }: { isLight: boolean }) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [rewards, setRewards] = useState<{ points: number; vouchers: any[] } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setRewards(null); return; }
    let alive = true;
    api.getRewards().then(r => alive && setRewards(r)).catch(() => alive && setRewards({ points: 0, vouchers: [] }));
    return () => { alive = false; };
  }, [isAuthenticated]);

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const card = isLight ? 'bg-white border-red-200' : 'bg-[#201A16] border-[#4A3B2C]';
  const muted = isLight ? 'text-slate-500' : 'text-[#A48F7A]';
  const statusLabel: Record<string, string> = {
    active: t('wallet.active', 'Có thể dùng'),
    used: t('wallet.used', 'Đã dùng'),
    expired: t('wallet.expired', 'Hết hạn')
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Real reward points */}
      <div className={`rounded-3xl p-6 border relative overflow-hidden text-white shadow-lg ${
        isLight
          ? 'bg-gradient-to-r from-[#800020] via-[#6B0D1B] to-[#4A0E17] border-red-500'
          : 'bg-gradient-to-r from-[#B88645] to-[#8B6E4E] border-[#D4AF37]'
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{t('profile.missionPoints', 'Điểm thưởng thành tựu')}</p>
        <h2 className="text-4xl font-mono font-bold drop-shadow-md">
          {isAuthenticated ? (rewards ? rewards.points.toLocaleString('vi-VN') : '…') : 0} <span className="text-lg">{t('profile.points', 'điểm')}</span>
        </h2>
        <p className="text-xs opacity-80 mt-2">{t('profile.pointsAutoNote', 'Điểm được cộng tự động khi bạn hoàn thành thành tựu.')}</p>
      </div>

      {/* Reward vouchers */}
      <div>
        <h3 className={`text-[11px] font-bold uppercase tracking-widest mb-3 px-1 ${isLight ? 'text-red-900' : 'text-[#A48F7A]'}`}>
          {t('profile.walletVouchers', 'Voucher thưởng của bạn')}
        </h3>
        {!isAuthenticated ? (
          <p className={`text-sm ${muted}`}>{t('profile.signInForRewards', 'Đăng nhập để xem điểm và voucher thưởng.')}</p>
        ) : !rewards ? (
          <p className={`text-sm ${muted}`}>{t('common.loading', 'Đang tải…')}</p>
        ) : rewards.vouchers.length === 0 ? (
          <div className={`p-5 rounded-2xl border text-sm ${card} ${muted}`}>
            {t('profile.noVouchers', t('profile.noVouchers', 'Chưa có voucher thưởng. Hoàn thành các thành tựu như “Chuyên Gia Review”, “Thợ Săn Bình Minh” hay “Cú Đêm Cà Phê” để nhận voucher.'))}
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.vouchers.map(v => (
              <div key={v.id} className={`p-4 rounded-2xl border ${card} ${v.status !== 'active' ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-bold text-sm ${isLight ? 'text-[#1E1B18]' : 'text-[#EBE3DB]'}`}>{t(`voucher.${String(v.achievement_id).replace('-', '')}.title`, v.title)}</p>
                    <p className={`text-xs mt-0.5 ${muted}`}>{t(`voucher.${String(v.achievement_id).replace('-', '')}.desc`, v.description)}</p>
                    <p className={`text-[10px] mt-1 ${muted}`}>HSD: {new Date(v.expires_at).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    v.status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>{statusLabel[v.status] || v.status}</span>
                </div>
                {v.status === 'active' && (
                  <button onClick={() => copy(v.code)} className={`mt-3 w-full py-2 rounded-xl border border-dashed font-mono font-bold text-sm ${isLight ? 'border-red-300 text-[#800020]' : 'border-[#D4AF37] text-[#D4AF37]'}`}>
                    {copied === v.code ? t('profile.copied', 'Đã sao chép!') : v.code}
                  </button>
                )}
              </div>
            ))}
            <p className={`text-[11px] ${muted}`}>{t('profile.voucherUseNote', 'Nhập mã khi đặt bàn để dùng. Mỗi voucher chỉ dùng được một lần.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CommentItem {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  time: string;
  likes?: number;
}

interface PostReviewData extends Review {
  shopId: string;
  shopName: string;
  shopAddress?: string;
  likedByMe?: boolean;
  commentsList: CommentItem[];
}

const INITIAL_COMMENTS_MAP: Record<string, CommentItem[]> = {
  r1: [
    {
      id: 'c1-1',
      userName: 'Linh Đan',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      content: 'Góc quầy bar pha chế của Workshop nhìn mê thực sự! Ánh sáng tự nhiên rất thích hợp làm việc.',
      time: '1 giờ trước',
      likes: 4
    },
    {
      id: 'c1-2',
      userName: 'Quốc Bảo',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      content: 'Cà phê pour-over ở đây hương vị hoa quả sáng và hậu vị rất êm 👍',
      time: '30 phút trước',
      likes: 2
    }
  ],
  r2: [
    {
      id: 'c2-1',
      userName: 'Minh Trí',
      userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      content: 'Không gian chuẩn gu industrial, nhạc nền cũng rất văn minh.',
      time: '2 giờ trước',
      likes: 1
    }
  ],
  r3: [
    {
      id: 'c3-1',
      userName: 'Mai Chi',
      userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      content: 'Tone trắng tối giản lên hình xinh xắn lắm luôn 🌿 Không gian nhiều cây xanh mát mắt.',
      time: '3 giờ trước',
      likes: 8
    },
    {
      id: 'c3-2',
      userName: 'Hải Đăng',
      userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
      content: 'Bánh sừng bò hạnh nhân ở Blanc cực kỳ ngon, giòn xốp thơm bơ.',
      time: '1 giờ trước',
      likes: 5
    }
  ]
};

function DiaryTab({ isLight, onNavigate }: { isLight: boolean; onNavigate?: (view: ViewState) => void }) {
  const { profile } = useUser();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activePost, setActivePost] = useState<PostReviewData | null>(null);

  // Initialize interactive posts list from shops & profile
  const [posts, setPosts] = useState<PostReviewData[]>(() => {
    return MOCK_SHOPS.flatMap(s => 
      s.reviews.map(r => ({
        ...r,
        userName: profile.name,
        userAvatar: profile.avatar,
        userSystemBadge: profile.title,
        shopId: s.id,
        shopName: s.name,
        shopAddress: s.address,
        likedByMe: false,
        commentsList: INITIAL_COMMENTS_MAP[r.id] || [
          {
            id: `c-default-${r.id}`,
            userName: 'Thanh Trúc',
            userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
            content: 'Không gian quán nhìn ấn tượng quá! Cảm ơn bạn đã review chi tiết.',
            time: '2 giờ trước',
            likes: 3
          }
        ]
      }))
    );
  });

  // Keep author profile updated when profile changes
  const synchronizedPosts = posts.map(p => ({
    ...p,
    userName: profile.name,
    userAvatar: profile.avatar,
    userSystemBadge: profile.title,
  }));

  const handleToggleLike = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextLiked = !p.likedByMe;
        const nextLikes = nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
        return { ...p, likedByMe: nextLiked, likes: nextLikes };
      }
      return p;
    }));

    if (activePost && activePost.id === postId) {
      setActivePost(prev => {
        if (!prev) return null;
        const nextLiked = !prev.likedByMe;
        const nextLikes = nextLiked ? prev.likes + 1 : Math.max(0, prev.likes - 1);
        return { ...prev, likedByMe: nextLiked, likes: nextLikes };
      });
    }
  };

  const handleAddComment = (postId: string, text: string) => {
    if (!text.trim()) return;
    const newComment: CommentItem = {
      id: `c-${Date.now()}`,
      userName: profile.name,
      userAvatar: profile.avatar,
      content: text.trim(),
      time: 'Vừa xong',
      likes: 0
    };

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextList = [newComment, ...p.commentsList];
        return {
          ...p,
          comments: nextList.length,
          commentsList: nextList
        };
      }
      return p;
    }));

    if (activePost && activePost.id === postId) {
      setActivePost(prev => {
        if (!prev) return null;
        const nextList = [newComment, ...prev.commentsList];
        return {
          ...prev,
          comments: nextList.length,
          commentsList: nextList
        };
      });
    }
  };

  const allImages = synchronizedPosts.flatMap(post => 
    post.images.map((img, imgIdx) => ({ img, post, initialImgIdx: imgIdx }))
  );

  return (
    <div className="animate-in fade-in pb-12">
      {/* View Mode Toggle Header */}
      <div className={`flex items-center justify-between border-b pb-3 mb-5 ${
        isLight ? 'border-red-200' : 'border-[#3E3023]'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isLight ? 'text-red-800' : 'text-[#D4AF37]'
          }`}>
            {t('profile.diaryTitle', 'Nhật ký check-in')}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
            isLight ? 'bg-red-100 text-red-700' : 'bg-[#2A2017] text-[#D4AF37]'
          }`}>
            {synchronizedPosts.length} {t('profile.postsCount', 'bài viết')}
          </span>
        </div>

        <div className={`flex items-center p-1 rounded-xl border ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#1F1914] border-[#3E3023]'
        }`}>
          <button 
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
              viewMode === 'grid' 
                ? isLight ? 'bg-white text-red-700 shadow-sm' : 'bg-[#2E241C] text-[#D4AF37] shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title={t('profile.gridView', 'Dạng lưới ảnh')}
          >
            <LayoutGrid size={15} />
            <span className="hidden sm:inline">{t('profile.gridLabel', 'Lưới')}</span>
          </button>
          <button 
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
              viewMode === 'list' 
                ? isLight ? 'bg-white text-red-700 shadow-sm' : 'bg-[#2E241C] text-[#D4AF37] shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title={t('profile.listView', 'Dạng danh sách bài viết')}
          >
            <List size={15} />
            <span className="hidden sm:inline">{t('profile.listLabel', 'Danh sách')}</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        allImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {allImages.map((item, idx) => (
              <motion.div 
                key={idx} 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActivePost(item.post)} 
                className={`aspect-square relative cursor-pointer group rounded-xl overflow-hidden border shadow-sm transition-all ${
                  isLight ? 'border-red-200/80 bg-slate-100' : 'border-[#3E3023] bg-[#1A1510]'
                }`}
              >
                <img 
                  src={item.img} 
                  alt="Coffee Diary" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                
                {/* Image overlay with hover stats */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                  <span className="text-[10px] font-bold self-start bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm line-clamp-1">
                    {item.post.shopName}
                  </span>
                  <div className="flex items-center justify-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1 drop-shadow">
                      <Heart size={13} className={item.post.likedByMe ? 'fill-red-500 text-red-500' : 'text-white'} /> 
                      {item.post.likes}
                    </span>
                    <span className="flex items-center gap-1 drop-shadow">
                      <MessageCircle size={13} className="text-white" /> 
                      {item.post.commentsList.length}
                    </span>
                  </div>
                </div>

                {/* Multi-image indicator badge */}
                {item.post.images.length > 1 && (
                  <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md rounded-md p-1 text-white">
                    <ImageIcon size={11} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 opacity-60">
            <Coffee size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">{t('profile.emptyDiary', 'Chưa có hình ảnh nào trong nhật ký.')}</p>
          </div>
        )
      ) : (
        /* List View */
        <div className="space-y-4">
          {synchronizedPosts.map((post) => (
            <ProfileReviewCard 
              key={post.id} 
              post={post} 
              isLight={isLight} 
              onOpenPost={() => setActivePost(post)}
              onToggleLike={() => handleToggleLike(post.id)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      {/* Interactive Post Detail Modal */}
      <AnimatePresence>
        {activePost && (
          <PostDetailModal 
            post={activePost}
            isLight={isLight}
            onClose={() => setActivePost(null)}
            onToggleLike={() => handleToggleLike(activePost.id)}
            onAddComment={(text) => handleAddComment(activePost.id, text)}
            onNavigate={onNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileReviewCard({ 
  post, 
  isLight, 
  onOpenPost,
  onToggleLike,
  onNavigate
}: { 
  post: PostReviewData; 
  isLight?: boolean; 
  onOpenPost: () => void;
  onToggleLike: () => void;
  onNavigate?: (view: ViewState) => void;
  key?: string | number;
}) {
  const { t } = useLanguage();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-2xl p-4 md:p-5 transition-all shadow-sm ${
        isLight 
          ? 'bg-white border-red-700/20 text-[#1E1B18] shadow-[0_4px_16px_rgba(128,0,32,0.05)] hover:border-red-600/40' 
          : 'border-[#3E3023] bg-gradient-to-b from-[#201A16] to-[#14100D] text-[#EBE3DB] hover:border-[#D4AF37]/40'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            onClick={onOpenPost}
            className={`w-10 h-10 rounded-full border-2 p-0.5 overflow-hidden flex-none cursor-pointer hover:opacity-90 transition-opacity ${
              isLight ? 'border-red-600 bg-red-50' : 'border-[#D4AF37] bg-[#1A1510]'
            }`}
          >
            <img 
              src={post.userAvatar} 
              alt={post.userName} 
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span onClick={onOpenPost} className="font-bold text-sm tracking-tight cursor-pointer hover:underline">{post.userName}</span>
              <span className={`text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.2 rounded border ${
                isLight ? 'bg-red-50 text-red-800 border-red-200' : 'bg-[#2A2017] text-[#D4AF37] border-[#4A3B2C]'
              }`}>
                {post.userSystemBadge}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] opacity-80 mt-0.5">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (post.shopId && onNavigate) {
                    onNavigate({ name: 'store', id: post.shopId });
                  }
                }}
                className={`font-semibold flex items-center gap-1 cursor-pointer transition-all hover:underline px-1.5 py-0.5 rounded ${
                  isLight 
                    ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60' 
                    : 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/40'
                }`}
                title={t('profile.viewShopInfo', 'Xem thông tin quán cà phê')}
              >
                <Coffee size={11} className="flex-none" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{post.shopName}</span>
                <ChevronRight size={10} className="opacity-70 flex-none" />
              </button>
              <span>•</span>
              <span>{post.date}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onOpenPost}
          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
            isLight 
              ? 'border-red-200 text-red-800 hover:bg-red-50' 
              : 'border-[#4A3B2C] text-[#D4AF37] hover:bg-[#2A2017]'
          }`}
        >
          {t('profile.viewDetail', 'Xem chi tiết')}
        </button>
      </div>

      {/* Review Content */}
      <p 
        onClick={onOpenPost}
        className="text-xs sm:text-sm leading-relaxed mb-3.5 opacity-90 cursor-pointer"
      >
        {post.content}
      </p>

      {/* Images Carousel / Gallery */}
      {post.images.length > 0 && (
        <div 
          onClick={onOpenPost}
          className="flex gap-2.5 mb-3.5 overflow-x-auto no-scrollbar rounded-xl cursor-pointer"
        >
          {post.images.map((img, idx) => (
            <div key={idx} className="relative flex-none w-48 sm:w-60 h-36 rounded-xl overflow-hidden border border-red-700/15 group">
              <img 
                src={img} 
                alt={`Photo ${idx + 1}`} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/25 transition-colors" />
            </div>
          ))}
        </div>
      )}

      {/* Metric Badges */}
      <div className="grid grid-cols-3 gap-2 mb-3.5">
        <div className={`rounded-xl p-2 text-center border ${
          isLight ? 'bg-red-50/40 border-red-100' : 'bg-[#18130F] border-[#3E3023]'
        }`}>
          <div className="text-[9px] uppercase font-bold tracking-wider opacity-75 mb-0.5">{t('profile.metricNoise', 'Tiếng ồn')}</div>
          <div className="flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full ${
                  i < post.metrics.noise ? (isLight ? 'bg-red-700' : 'bg-[#D4AF37]') : 'bg-slate-300 dark:bg-slate-700'
                }`} 
              />
            ))}
          </div>
        </div>

        <div className={`rounded-xl p-2 text-center border ${
          isLight ? 'bg-red-50/40 border-red-100' : 'bg-[#18130F] border-[#3E3023]'
        }`}>
          <div className="text-[9px] uppercase font-bold tracking-wider opacity-75 mb-0.5">{t('profile.metricSeating', 'Chỗ ngồi')}</div>
          <div className="flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full ${
                  i < post.metrics.seating ? (isLight ? 'bg-red-700' : 'bg-[#D4AF37]') : 'bg-slate-300 dark:bg-slate-700'
                }`} 
              />
            ))}
          </div>
        </div>

        <div className={`rounded-xl p-2 text-center border ${
          isLight ? 'bg-red-50/40 border-red-100' : 'bg-[#18130F] border-[#3E3023]'
        }`}>
          <div className="text-[9px] uppercase font-bold tracking-wider opacity-75 mb-0.5">{t('profile.metricAccuracy', 'Chân thực')}</div>
          <div className="flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full ${
                  i < post.metrics.accuracy ? (isLight ? 'bg-red-700' : 'bg-[#D4AF37]') : 'bg-slate-300 dark:bg-slate-700'
                }`} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Actions (Likes, Comments) */}
      <div className={`flex items-center justify-between border-t pt-3 ${
        isLight ? 'border-slate-100 text-slate-600' : 'border-[#3E3023] text-[#A48F7A]'
      }`}>
        <div className="flex items-center gap-5">
          {/* Like Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike();
            }}
            className={`flex items-center gap-1.5 text-xs font-bold transition-transform active:scale-125 ${
              post.likedByMe 
                ? 'text-red-600 dark:text-red-400' 
                : isLight ? 'hover:text-red-600' : 'hover:text-[#D4AF37]'
            }`}
          >
            <Heart 
              size={16} 
              className={`transition-colors ${post.likedByMe ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''}`} 
            />
            <span>{post.likes}</span>
          </button>

          {/* Comment Count / Open */}
          <button 
            type="button"
            onClick={onOpenPost}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
              isLight ? 'hover:text-red-700' : 'hover:text-[#D4AF37]'
            }`}
          >
            <MessageCircle size={16} />
            <span>{post.commentsList.length}</span>
            <span className="text-[11px] font-normal opacity-80 hidden sm:inline">{t('profile.commentsLabel', 'bình luận')}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PostDetailModal({
  post,
  isLight,
  onClose,
  onToggleLike,
  onAddComment,
  onNavigate
}: {
  post: PostReviewData;
  isLight: boolean;
  onClose: () => void;
  onToggleLike: () => void;
  onAddComment: (text: string) => void;
  onNavigate?: (view: ViewState) => void;
}) {
  const { profile } = useUser();
  const { t } = useLanguage();
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [copiedToast, setCopiedToast] = useState(false);

  const images = post.images || [];
  const currentImg = images[selectedImgIdx] || images[0];

  const handleSendComment = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(commentInput);
    setCommentInput('');
  };

  const handleShare = () => {
    setCopiedToast(true);
    navigator.clipboard?.writeText?.(window.location.href);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden ${
          isLight 
            ? 'bg-[#FCFDFD] border-red-700/30 text-[#1E1B18]' 
            : 'bg-[#18130E] border-[#4A3B2C] text-[#EBE3DB]'
        }`}
      >
        {/* Modal Top Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b ${
          isLight ? 'bg-white border-red-100' : 'bg-[#1E1813] border-[#3E3023]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full border-2 p-0.5 overflow-hidden flex-none ${
              isLight ? 'border-red-600 bg-red-50' : 'border-[#D4AF37] bg-[#1A1510]'
            }`}>
              <img 
                src={post.userAvatar} 
                alt={post.userName} 
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">{post.userName}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                  isLight ? 'bg-red-50 text-red-800 border-red-200' : 'bg-[#2A2017] text-[#D4AF37] border-[#4A3B2C]'
                }`}>
                  {post.userSystemBadge}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] opacity-85 mt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (post.shopId && onNavigate) {
                      onClose();
                      onNavigate({ name: 'store', id: post.shopId });
                    }
                  }}
                  className={`font-semibold flex items-center gap-1 cursor-pointer transition-all hover:underline px-2 py-0.5 rounded-md ${
                    isLight 
                      ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/70' 
                      : 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50'
                  }`}
                  title={t('profile.viewShopInfo', 'Xem thông tin quán cà phê')}
                >
                  <Coffee size={12} className="flex-none" />
                  <span className="truncate max-w-[170px] sm:max-w-[240px]">{post.shopName}</span>
                  <ChevronRight size={11} className="opacity-70 flex-none" />
                </button>
                <span>•</span>
                <span>{post.date}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleShare}
              className={`p-2 rounded-full border transition-all ${
                isLight 
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100' 
                  : 'border-[#3E3023] text-[#A48F7A] hover:bg-[#2A2017]'
              }`}
              title={t('profile.sharePost', 'Chia sẻ bài viết')}
            >
              <Share2 size={16} />
            </button>
            <button 
              type="button"
              onClick={onClose}
              className={`p-2 rounded-full border transition-all ${
                isLight 
                  ? 'border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700' 
                  : 'border-[#3E3023] text-[#A48F7A] hover:bg-[#2A2017] hover:text-white'
              }`}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4">
          {/* Toast Notification */}
          {copiedToast && (
            <div className="p-2 rounded-lg bg-emerald-600 text-white text-xs font-bold text-center animate-in fade-in flex items-center justify-center gap-1.5">
              <Check size={14} /> {t('profile.linkCopied', t('profile.linkCopied', 'Đã sao chép liên kết bài viết vào clipboard!'))}
            </div>
          )}

          {/* Main Photo Gallery */}
          {images.length > 0 && (
            <div className="space-y-2">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden border border-red-700/15 bg-black/10">
                <img 
                  src={currentImg} 
                  alt="Post Photo" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />

                {/* Left / Right Carousel Controls */}
                {images.length > 1 && (
                  <>
                    <button 
                      type="button"
                      onClick={() => setSelectedImgIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedImgIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white text-[11px] font-bold">
                      {selectedImgIdx + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImgIdx(idx)}
                      className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 flex-none transition-all ${
                        selectedImgIdx === idx 
                          ? isLight ? 'border-red-600 ring-2 ring-red-500/30' : 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40' 
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Post Text Description */}
          <div className={`p-4 rounded-2xl border ${
            isLight ? 'bg-white border-red-100' : 'bg-[#201A15] border-[#3E3023]'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {post.content}
            </p>
          </div>

          {/* Space Metrics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className={`rounded-xl p-2.5 text-center border ${
              isLight ? 'bg-white border-red-100' : 'bg-[#201A15] border-[#3E3023]'
            }`}>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75 mb-1">{t('profile.metricNoise2', 'Mức ồn')}</div>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full ${
                      i < post.metrics.noise ? (isLight ? 'bg-red-700' : 'bg-[#D4AF37]') : 'bg-slate-200 dark:bg-slate-700'
                    }`} 
                  />
                ))}
              </div>
            </div>

            <div className={`rounded-xl p-2.5 text-center border ${
              isLight ? 'bg-white border-red-100' : 'bg-[#201A15] border-[#3E3023]'
            }`}>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75 mb-1">{t('profile.metricSeating', 'Chỗ ngồi')}</div>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full ${
                      i < post.metrics.seating ? (isLight ? 'bg-red-700' : 'bg-[#D4AF37]') : 'bg-slate-200 dark:bg-slate-700'
                    }`} 
                  />
                ))}
              </div>
            </div>

            <div className={`rounded-xl p-2.5 text-center border ${
              isLight ? 'bg-white border-red-100' : 'bg-[#201A15] border-[#3E3023]'
            }`}>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75 mb-1">{t('profile.metricAccuracy2', 'Độ chuẩn xác')}</div>
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full ${
                      i < post.metrics.accuracy ? (isLight ? 'bg-red-700' : 'bg-[#D4AF37]') : 'bg-slate-200 dark:bg-slate-700'
                    }`} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Post Social Stats & Like Bar */}
          <div className={`flex items-center justify-between p-3 rounded-xl border ${
            isLight ? 'bg-red-50/50 border-red-100' : 'bg-[#1D1712] border-[#3E3023]'
          }`}>
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={onToggleLike}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-xs transition-all active:scale-95 ${
                  post.likedByMe 
                    ? 'bg-red-600 text-white border-red-600 shadow-sm' 
                    : isLight 
                      ? 'bg-white text-slate-700 border-slate-200 hover:border-red-400' 
                      : 'bg-[#282019] text-[#EBE3DB] border-[#4A3B2C] hover:border-[#D4AF37]'
                }`}
              >
                <Heart size={16} className={post.likedByMe ? 'fill-white' : ''} />
                <span>{post.likes} {t('profile.likes', 'Lượt thích')}</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs font-bold opacity-80">
                <MessageCircle size={16} className="text-amber-500" />
                <span>{post.commentsList.length} {t('profile.commentsLabel', 'bình luận')}</span>
              </div>
            </div>
          </div>

          {/* Comments Thread Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-amber-500" />
              {t('profile.commentsSection', 'Thảo luận cộng đồng')} ({post.commentsList.length})
            </h4>

            {/* Comments List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar pr-1">
              {post.commentsList.map((cmt) => (
                <div 
                  key={cmt.id} 
                  className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isLight ? 'bg-white border-slate-100' : 'bg-[#201A15] border-[#3E3023]'
                  }`}
                >
                  <img 
                    src={cmt.userAvatar} 
                    alt={cmt.userName} 
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover flex-none border border-amber-500/30" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-xs">{cmt.userName}</span>
                      <span className="text-[10px] opacity-50">{cmt.time}</span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{cmt.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comment Input Sticky Footer */}
        <form 
          onSubmit={handleSendComment}
          className={`p-3 sm:p-4 border-t flex items-center gap-2.5 ${
            isLight ? 'bg-white border-red-100' : 'bg-[#1E1813] border-[#3E3023]'
          }`}
        >
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover flex-none border border-amber-500/40" 
          />
          <input 
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder={t('profile.writeCommentPlaceholder', 'Viết bình luận của bạn về bài viết này...')}
            className={`flex-1 text-xs px-3.5 py-2.5 rounded-xl border outline-none transition-all ${
              isLight 
                ? 'bg-slate-50 border-slate-200 focus:bg-white focus:border-red-600 focus:ring-1 focus:ring-red-600/30' 
                : 'bg-[#15110E] border-[#3E3023] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 text-white'
            }`}
          />
          <button 
            type="submit"
            disabled={!commentInput.trim()}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              commentInput.trim()
                ? isLight 
                  ? 'bg-[#800020] text-white hover:bg-red-800 shadow-md active:scale-95' 
                  : 'bg-[#D4AF37] text-black hover:bg-amber-300 shadow-md active:scale-95'
                : 'opacity-40 cursor-not-allowed bg-slate-300 dark:bg-[#33281E] text-slate-500'
            }`}
          >
            <Send size={14} />
            <span className="hidden sm:inline">{t('profile.sendComment', 'Gửi')}</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}

