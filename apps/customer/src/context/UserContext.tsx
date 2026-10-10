import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/adventurer/svg?seed=CoffeeExplorer&backgroundColor=ffd5dc,ffdfbf';

export interface UserProfile {
  name: string;
  avatar: string;
  title: string;
  phone: string;
  email: string;
  location: string;
  notifyPromos: boolean;
  notifyBookings: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Khách',
  avatar: DEFAULT_AVATAR,
  title: 'Thám Hiểm Gia',
  phone: '',
  email: '',
  location: 'TP. Hồ Chí Minh',
  notifyPromos: true,
  notifyBookings: true,
};

interface UserContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updateAvatar: (avatarUrl: string) => void;
  resetAvatar: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'coffee_passport_user_profile';
const AVATAR_KEY = 'coffee_passport_user_avatar';

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, updateUserProfile } = useAuth();

  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const storedProfile = localStorage.getItem(STORAGE_KEY);
      const storedAvatar = localStorage.getItem(AVATAR_KEY);
      
      let base = { ...DEFAULT_PROFILE };
      if (storedProfile) {
        try {
          const parsed = JSON.parse(storedProfile);
          base = { ...base, ...parsed };
        } catch (e) {
          console.warn('Failed parsing stored profile', e);
        }
      }

      if (storedAvatar && !storedAvatar.includes('pravatar.cc')) {
        base.avatar = storedAvatar;
      } else if (!base.avatar || base.avatar.includes('pravatar.cc')) {
        base.avatar = DEFAULT_AVATAR;
      }

      return base;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // Sync with logged-in user from backend AuthContext
  const hadUser = useRef(false);
  useEffect(() => {
    if (!user && hadUser.current) {
      // Signed out: don't keep showing the previous person's details.
      hadUser.current = false;
      setProfile(DEFAULT_PROFILE);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(AVATAR_KEY);
      } catch {
        // ignore
      }
      return;
    }
    if (user) {
      hadUser.current = true;
      setProfile(prev => ({
        ...prev,
        name: user.name || prev.name,
        avatar: user.avatar || prev.avatar,
        title: user.title || prev.title,
        phone: user.phone || prev.phone,
        email: user.email || prev.email,
        location: user.location || prev.location,
        notifyPromos: user.notifyPromos ?? prev.notifyPromos,
        notifyBookings: user.notifyBookings ?? prev.notifyBookings
      }));
    }
  }, [user]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (updates.avatar) {
          localStorage.setItem(AVATAR_KEY, updates.avatar);
        }
      } catch (err) {
        console.warn('Storage save error:', err);
      }

      // Also persist to backend if logged in
      if (user) {
        updateUserProfile(updates).catch(() => {});
      }

      return next;
    });
  };

  const updateAvatar = (avatarUrl: string) => {
    updateProfile({ avatar: avatarUrl });
  };

  const resetAvatar = () => {
    updateAvatar(DEFAULT_AVATAR);
  };

  return (
    <UserContext.Provider value={{ profile, updateProfile, updateAvatar, resetAvatar }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
