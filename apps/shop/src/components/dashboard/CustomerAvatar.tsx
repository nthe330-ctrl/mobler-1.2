import React from 'react';
import { useShopI18n } from '../../i18n/useShopI18n';

// i18n-exempt-start: the tier names here are MATCHED against the milestone strings the
// backend sends (and against aliases like "VIP" and "Regular"), so they are identity, not
// display text. What the reader sees comes from shop.milestone.* via titleKey/descKey.
export type MilestoneType = 'Lính mới' | 'Thám Hiểm Gia' | 'Chuyên Gia' | 'Huyền Thoại';

export interface MilestoneInfo {
  /**
   * The Vietnamese tier name is the IDENTITY here, not display text: `getMilestoneInfo`
   * matches it against the milestone strings the backend sends (and against aliases like
   * "VIP" and "Regular"). So it stays, and what the reader SEES comes from the dictionary
   * via `titleKey` / `descKey`.
   */
  title: MilestoneType;
  titleKey: string;
  descKey: string;
  icon: string;
  badgeBg: string;
  badgeBorder: string;
  textClass: string;
  frameContainerClass: string;
  headerBg: string;
  headerTextClass: string;
  headerSubtextClass: string;
  accentColor: string;
  hasMedalWatermark?: boolean;
}

export const MILESTONES: Record<MilestoneType, MilestoneInfo> = {
  'Lính mới': {
    title: 'Lính mới',
    titleKey: 'shop.milestone.newbie.title',
    descKey: 'shop.milestone.newbie.desc',
    icon: '🌱',
    badgeBg: 'bg-slate-100 text-slate-700',
    badgeBorder: 'border-slate-300',
    textClass: 'text-slate-700',
    frameContainerClass: 'border-2 border-slate-300 rounded-full',
    headerBg: 'bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700',
    headerTextClass: 'text-white',
    headerSubtextClass: 'text-slate-200',
    accentColor: 'text-slate-600',
    hasMedalWatermark: false,
  },
  'Thám Hiểm Gia': {
    title: 'Thám Hiểm Gia',
    titleKey: 'shop.milestone.explorer.title',
    descKey: 'shop.milestone.explorer.desc',
    icon: '🧭',
    badgeBg: 'bg-red-50 text-red-700',
    badgeBorder: 'border-red-300',
    textClass: 'text-red-600',
    frameContainerClass: 'p-[2.5px] bg-red-600 rounded-full shadow-sm',
    headerBg: 'bg-gradient-to-r from-red-700 via-red-950 to-black',
    headerTextClass: 'text-white',
    headerSubtextClass: 'text-red-200',
    accentColor: 'text-red-600',
    hasMedalWatermark: false,
  },
  'Chuyên Gia': {
    title: 'Chuyên Gia',
    titleKey: 'shop.milestone.expert.title',
    descKey: 'shop.milestone.expert.desc',
    icon: '🎓',
    badgeBg: 'bg-amber-50 text-amber-800',
    badgeBorder: 'border-amber-300',
    textClass: 'text-amber-800',
    frameContainerClass: 'p-[2.5px] bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-sm',
    headerBg: 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-50 border-b border-amber-200',
    headerTextClass: 'text-amber-950',
    headerSubtextClass: 'text-amber-900/80',
    accentColor: 'text-amber-700',
    hasMedalWatermark: false,
  },
  'Huyền Thoại': {
    title: 'Huyền Thoại',
    titleKey: 'shop.milestone.legend.title',
    descKey: 'shop.milestone.legend.desc',
    icon: '👑',
    badgeBg: 'bg-purple-100 text-purple-900',
    badgeBorder: 'border-purple-300',
    textClass: 'text-purple-700',
    frameContainerClass: 'p-[3px] bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-900 rounded-full shadow-md',
    headerBg: 'bg-gradient-to-r from-purple-800 via-indigo-900 to-blue-950',
    headerTextClass: 'text-white',
    headerSubtextClass: 'text-purple-200',
    accentColor: 'text-purple-600',
    hasMedalWatermark: true,
  },
};

export const getMilestoneInfo = (milestoneInput?: string | string[]): MilestoneInfo => {
  if (!milestoneInput) return MILESTONES['Lính mới'];

  const searchStr = Array.isArray(milestoneInput) ? milestoneInput.join(' ') : milestoneInput;

  if (searchStr.includes('Huyền Thoại') || searchStr.includes('VIP') || searchStr.includes('Kim Cương')) {
    return MILESTONES['Huyền Thoại'];
  }
  if (searchStr.includes('Chuyên Gia')) {
    return MILESTONES['Chuyên Gia'];
  }
  if (searchStr.includes('Thám Hiểm Gia') || searchStr.includes('Regular') || searchStr.includes('Thân Thiết')) {
    return MILESTONES['Thám Hiểm Gia'];
  }
  return MILESTONES['Lính mới'];
};
// i18n-exempt-end

interface CustomerAvatarProps {
  src?: string;
  name?: string;
  milestone?: string | string[];
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadgeOverlay?: boolean;
  className?: string;
}

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({
  src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
  name,
  milestone,
  size = 'md',
  showBadgeOverlay = false,
  className = '',
}) => {
  const { t } = useShopI18n();
  const info = getMilestoneInfo(milestone);

  const imageDimensions = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20',
  }[size];

  const overlayBadgeSize = {
    xs: 'text-[9px] w-3.5 h-3.5 -bottom-0.5 -right-0.5',
    sm: 'text-[10px] w-4 h-4 -bottom-0.5 -right-0.5',
    md: 'text-[11px] w-5 h-5 -bottom-1 -right-1',
    lg: 'text-xs w-5.5 h-5.5 -bottom-1 -right-1',
    xl: 'text-sm w-7 h-7 -bottom-1.5 -right-1.5',
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Outer Frame Wrapper */}
      <div className={`${info.frameContainerClass} transition-all`}>
        <img
          src={src}
          alt={name || t(info.titleKey)}
          referrerPolicy="no-referrer"
          className={`${imageDimensions} rounded-full object-cover bg-white block`}
        />
      </div>

      {/* Optional Badge Overlay */}
      {showBadgeOverlay && (
        <span
          className={`absolute ${overlayBadgeSize} rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center select-none z-10`}
          title={`${t(info.titleKey)}: ${t(info.descKey)}`}
        >
          {info.icon}
        </span>
      )}
    </div>
  );
};

export default CustomerAvatar;
