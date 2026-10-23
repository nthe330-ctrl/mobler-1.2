/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ReactNode } from 'react';
import { Search, UserCircle, Gift, CalendarDays } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@shared/context/ThemeContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { useUser } from './context/UserContext';
import HomeView from './components/HomeView';
import StoreDetailView from './components/StoreDetailView';
import BookingView from './components/BookingView';
import ProfileView from './components/ProfileView';
import PromotionsView from './components/PromotionsView';
import BookingsView from './components/BookingsView';
import AuthModal from './components/AuthModal';
import CustomerAuthScreen from './views/CustomerAuthScreen';
import { useAuth } from './context/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import GoogleMapsConfigModal from './components/GoogleMapsConfigModal';
import { MOCK_SHOPS } from '@shared/data';
import { CoffeeShop } from '@shared/types';
import { api } from './services/api';
import LanguageSelectorModal from './components/LanguageSelectorModal';

const INITIAL_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

function isValidKeyFormat(key: string): boolean {
  if (!key) return false;
  const k = key.trim();
  if (
    !k ||
    k === 'YOUR_API_KEY' ||
    k === 'MY_API_KEY' ||
    k === 'YOUR_GOOGLE_MAPS_API_KEY' ||
    k.includes('YOUR_KEY') ||
    k.includes('MY_KEY')
  ) {
    return false;
  }
  return k.startsWith('AIza') && k.length >= 25;
}

export interface AppliedVoucherInfo {
  code: string;
  discount: number;
  label: string;
  type?: string;
  storeId?: string;
  storeName?: string;
  description?: string;
}

export type ViewState = 
  | { name: 'home' }
  | { name: 'store'; id: string; appliedVoucher?: AppliedVoucherInfo }
  | { name: 'booking'; id: string; initialVoucher?: AppliedVoucherInfo }
  | { name: 'profile' }
  | { name: 'promotions' }
  | { name: 'bookings'; highlightBookingId?: string };

const getInitialKey = () => {
  try {
    const saved = localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY');
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  return INITIAL_API_KEY;
};

export default function App() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { t, isLanguageModalOpen, closeLanguageModal } = useLanguage();
  const { profile } = useUser();
  const [currentView, setCurrentView] = useState<ViewState>({ name: 'home' });
  const [shops, setShops] = useState<CoffeeShop[]>(MOCK_SHOPS);
  const [apiKey, setApiKey] = useState<string>(getInitialKey());
  const [isMapAuthFailed, setIsMapAuthFailed] = useState<boolean>(false);
  const [isBillingError, setIsBillingError] = useState<boolean>(false);
  const [isKeyConfigOpen, setIsKeyConfigOpen] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isNavHidden, setIsNavHidden] = useState<boolean>(false);
  const lastScrollYRef = useRef<number>(0);
  const tickingRef = useRef<boolean>(false);

  // Reset nav visibility whenever view changes
  useEffect(() => {
    setIsNavHidden(false);
    lastScrollYRef.current = 0;
  }, [currentView]);

  // Handle explicit request to show bottom nav
  useEffect(() => {
    const handleShowNav = () => {
      setIsNavHidden(false);
      lastScrollYRef.current = 0;
    };
    window.addEventListener('show-bottom-nav', handleShowNav);
    return () => {
      window.removeEventListener('show-bottom-nav', handleShowNav);
    };
  }, []);

  // Smart Auto-Hide Bottom Navigation on user scroll
  useEffect(() => {
    const SCROLL_DOWN_THRESHOLD = 24; // Minimum downwards scroll delta to trigger hide
    const SCROLL_UP_THRESHOLD = 16;   // Minimum upwards scroll delta to trigger show
    const TOP_SAFE_ZONE = 60;         // Always show when within 60px from top

    const handleScroll = (e: Event) => {
      if (tickingRef.current) return;

      tickingRef.current = true;
      requestAnimationFrame(() => {
        tickingRef.current = false;

        const target = e.target;
        let currentScrollY = 0;

        if (target === document || target === window) {
          currentScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
        } else if (target instanceof HTMLElement) {
          // Ignore scroll inside any modal, dialog, fixed popup, or drawer
          if (
            target.closest('.fixed') || 
            target.closest('[role="dialog"]') || 
            target.closest('[data-modal="true"]') ||
            target.classList.contains('fixed')
          ) {
            return;
          }

          // Ignore non-scrollable containers or horizontal-only carousels
          if (target.scrollHeight <= target.clientHeight + 40) {
            return;
          }
          currentScrollY = target.scrollTop;
        } else {
          return;
        }

        const lastY = lastScrollYRef.current;
        const delta = currentScrollY - lastY;

        // Always show when near the top of the container
        if (currentScrollY <= TOP_SAFE_ZONE) {
          setIsNavHidden(false);
          lastScrollYRef.current = currentScrollY;
          return;
        }

        // Scroll down: smoothly slide toolbar down and hide
        if (delta > SCROLL_DOWN_THRESHOLD) {
          setIsNavHidden(true);
          lastScrollYRef.current = currentScrollY;
        } 
        // Scroll up: smoothly slide toolbar up and reveal
        else if (delta < -SCROLL_UP_THRESHOLD) {
          setIsNavHidden(false);
          lastScrollYRef.current = currentScrollY;
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as any);
    };
  }, []);

  // Load shops from backend API
  useEffect(() => {
    let isMounted = true;
    const startTime = Date.now();

    api.getShops()
      .then(res => {
        if (isMounted && res && res.shops && res.shops.length > 0) {
          setShops(res.shops);
        }
      })
      .catch(err => {
        console.warn('API getShops fallback to mock:', err);
      })
      .finally(() => {
        if (isMounted) {
          const elapsed = Date.now() - startTime;
          const minDisplayTime = 800; // ensures smooth transition without flash
          const remaining = Math.max(0, minDisplayTime - elapsed);
          setTimeout(() => {
            if (isMounted) {
              setIsInitialLoading(false);
            }
          }, remaining);
        }
      });
    return () => { isMounted = false; };
  }, []);

  // Probe backend Google Maps key status on startup to detect BillingNotEnabled proactively
  useEffect(() => {
    api.getMapsKeyStatus()
      .then(res => {
        if (!res.billingEnabled) {
          console.info('Google Maps key has no billing enabled. Seamlessly falling back to vector map.');
          setIsMapAuthFailed(true);
          setIsBillingError(true);
        } else {
          setIsMapAuthFailed(false);
          setIsBillingError(false);
        }
      })
      .catch(() => {
        // network issue, retain default
      });
  }, []);

  useEffect(() => {
    // Intercept Google Maps Auth Failure to prevent app crash and switch to FallbackMap gracefully
    const originalGmAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps API authentication failed. Switching to vector fallback map.');
      setIsMapAuthFailed(true);
    };

    // Global console interceptor to catch BillingNotEnabledMapError and related Google Maps API errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
      if (
        msg.includes('BillingNotEnabledMapError') ||
        msg.includes('billing-not-enabled-map-error') ||
        msg.includes('ApiNotActivatedMapError') ||
        msg.includes('InvalidKeyMapError') ||
        msg.includes('Google Maps JavaScript API error')
      ) {
        console.warn('Caught Google Maps API error. Safely switching to interactive vector fallback map.');
        setIsMapAuthFailed(true);
        if (msg.includes('Billing') || msg.includes('billing')) {
          setIsBillingError(true);
        }
        return;
      }
      originalConsoleError.apply(console, args);
    };

    const handleWindowError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (msg.includes('BillingNotEnabledMapError') || msg.includes('Google Maps JavaScript API')) {
        setIsMapAuthFailed(true);
        setIsBillingError(true);
      }
    };

    const handleOpenConfig = () => {
      setIsKeyConfigOpen(true);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('open-google-maps-config', handleOpenConfig);

    return () => {
      (window as any).gm_authFailure = originalGmAuthFailure;
      console.error = originalConsoleError;
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('open-google-maps-config', handleOpenConfig);
    };
  }, []);

  const hasValidKeyparam = isValidKeyFormat(apiKey) && !isMapAuthFailed;

  const handleSaveKey = async (newKey: string) => {
    const trimmed = newKey.trim();
    setApiKey(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', trimmed);
        const res = await api.validateMapsKey(trimmed);
        if (res.valid && res.billingEnabled) {
          setIsMapAuthFailed(false);
          setIsBillingError(false);
        } else {
          setIsMapAuthFailed(true);
          setIsBillingError(!res.billingEnabled);
        }
      } else {
        localStorage.removeItem('GOOGLE_MAPS_PLATFORM_KEY');
        setIsMapAuthFailed(true);
        setIsBillingError(false);
      }
    } catch {
      // ignore
    }
  };

  const handleAddGoogleShops = (newShops: CoffeeShop[]) => {
    setShops(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const filtered = newShops.filter(s => !existingIds.has(s.id));
      return [...filtered, ...prev];
    });
  };

  const renderView = () => {
    switch (currentView.name) {
      case 'home':
        return (
          <HomeView 
            shops={shops}
            onAddGoogleShops={handleAddGoogleShops}
            onNavigate={(view) => setCurrentView(view)} 
            hasValidKey={hasValidKeyparam}
            isMapAuthFailed={isMapAuthFailed}
            isBillingError={isBillingError}
            onOpenKeyConfig={() => setIsKeyConfigOpen(true)}
          />
        );
      case 'store':
        return (
          <StoreDetailView 
            id={currentView.id} 
            shops={shops}
            appliedVoucher={currentView.appliedVoucher} 
            hasValidKey={hasValidKeyparam} 
            onNavigate={(view) => setCurrentView(view)} 
          />
        );
      case 'booking':
        return (
          <BookingView 
            id={currentView.id} 
            shops={shops}
            initialVoucher={currentView.initialVoucher} 
            onNavigate={(view) => setCurrentView(view)} 
          />
        );
      case 'profile':
        return <ProfileView onNavigate={(view) => setCurrentView(view)} />;
      case 'promotions':
        return <PromotionsView onNavigate={(view) => setCurrentView(view)} />;
      case 'bookings':
        return <BookingsView shops={shops} onNavigate={(view) => setCurrentView(view)} highlightBookingId={currentView.highlightBookingId} />;
      default:
        return (
          <HomeView 
            shops={shops}
            onAddGoogleShops={handleAddGoogleShops}
            onNavigate={(view) => setCurrentView(view)} 
            hasValidKey={hasValidKeyparam}
            isMapAuthFailed={isMapAuthFailed}
          />
        );
    }
  };

  const isLight = theme === 'light';

  /* Sign-in gate. Every hook above runs unconditionally — these early returns sit
     below all of them, so the hook order never changes between renders.
     AuthContext restores a saved session asynchronously, so wait for isLoading to
     settle before deciding: gating on !isAuthenticated alone would flash the login
     screen on every reload for a customer who is already signed in. */
  if (isAuthLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <CustomerAuthScreen />;

  const appContent = (
    <div className={`w-full h-[100dvh] max-h-[100dvh] overflow-hidden font-sans transition-colors duration-300 ${isLight ? 'bg-[#FAFBFD] text-[#1E1B18]' : 'bg-[#0A0807] text-[#EBE3DB]'}`}>
      <div className={`w-full h-full flex flex-col relative overflow-hidden transition-colors duration-300 ${
        isLight 
          ? 'bg-gradient-to-b from-[#FAFBFD] via-[#F1F5F9] to-[#E2E8F0]' 
          : 'bg-gradient-to-br from-[#161210] to-[#0A0807]'
      }`}>
        {/* Main Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView.name + ('id' in currentView ? currentView.id : '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="min-h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation with Smart Auto-Hide */}
        {currentView.name !== 'store' && currentView.name !== 'booking' && (
          <nav 
            aria-label="Bottom Navigation Bar"
            className={`glass-nav fixed z-50 left-1/2 -translate-x-1/2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] w-[min(30rem,calc(100%-1.5rem))] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform motion-reduce:transition-none motion-reduce:duration-0 ${
              isNavHidden ? 'translate-y-[150%] pointer-events-none' : 'translate-y-0'
            }`}
          >
            <div className="w-full flex justify-around items-center py-2 px-2 md:py-2.5 md:px-3">
              <NavItem 
                icon={<Search size={22} />} 
                label={t('nav.explore', 'Khám phá')} 
                isActive={currentView.name === 'home'} 
                isLight={isLight}
                onClick={() => setCurrentView({ name: 'home' })} 
              />
              <NavItem 
                icon={<Gift size={22} />} 
                label={t('nav.promotions', 'Khuyến mãi')} 
                isActive={currentView.name === 'promotions'} 
                isLight={isLight}
                onClick={() => setCurrentView({ name: 'promotions' })} 
              />
              <NavItem 
                icon={<CalendarDays size={22} />} 
                label={t('nav.bookings', 'Đặt bàn')} 
                isActive={currentView.name === 'bookings'} 
                isLight={isLight}
                onClick={() => setCurrentView({ name: 'bookings' })} 
              />
              <NavItem 
                icon={
                  profile.avatar ? (
                    <div className={`w-[22px] h-[22px] rounded-full overflow-hidden border ${
                      currentView.name === 'profile'
                        ? isLight ? 'border-[#800020] ring-1 ring-[#800020]/30' : 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50'
                        : isLight ? 'border-slate-300' : 'border-[#4A3B2C]'
                    }`}>
                      <img 
                        src={profile.avatar} 
                        alt={profile.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <UserCircle size={22} />
                  )
                } 
                label={t('nav.profile', 'Hồ sơ')} 
                isActive={currentView.name === 'profile'} 
                isLight={isLight}
                onClick={() => setCurrentView({ name: 'profile' })} 
              />
            </div>
          </nav>
        )}

        <LanguageSelectorModal
          isOpen={isLanguageModalOpen}
          onClose={closeLanguageModal}
        />

        <AuthModal />

        <GoogleMapsConfigModal
          isOpen={isKeyConfigOpen}
          onClose={() => setIsKeyConfigOpen(false)}
          currentKey={apiKey}
          isBillingError={isBillingError}
          onSaveKey={handleSaveKey}
        />

        {/* Global Initial Loading Screen */}
        <AnimatePresence>
          {isInitialLoading && <LoadingScreen />}
        </AnimatePresence>
      </div>
    </div>
  );

  if (hasValidKeyparam) {
    return (
      <APIProvider 
        apiKey={apiKey} 
        version="weekly" 
        libraries={['places', 'marker', 'geometry']}
        onError={(err) => {
          console.warn('APIProvider error handler caught:', err);
          setIsMapAuthFailed(true);
        }}
      >
        {appContent}
      </APIProvider>
    );
  }

  return appContent;
}

function NavItem({ icon, label, isActive, isLight, onClick }: { icon: ReactNode, label: string, isActive: boolean, isLight?: boolean, onClick: () => void }) {
  const activeClass = isLight 
    ? 'text-[#800020] font-bold md:bg-red-50/90' 
    : 'text-[#D4AF37] font-bold md:bg-[#D4AF37]/15';
    
  const inactiveClass = isLight 
    ? 'text-slate-500 hover:text-red-900 md:hover:bg-slate-100' 
    : 'text-[#7A6450] hover:text-[#A48F7A] md:hover:bg-white/5';

  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-5 py-1.5 md:py-2 rounded-xl transition-all ${isActive ? activeClass : inactiveClass}`}
    >
      {icon}
      <span className="text-[10px] md:text-xs font-semibold tracking-tight">{label}</span>
    </motion.button>
  );
}


