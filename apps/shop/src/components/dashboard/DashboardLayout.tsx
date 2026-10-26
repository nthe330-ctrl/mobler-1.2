import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Coffee, BarChart3, Star, Store, Menu as MenuIcon, X, Users, Ticket, LogOut, CalendarCheck } from 'lucide-react';
import { CoffeeShop } from '@shared/types';
import { useShopI18n } from '../../i18n/useShopI18n';
import ShopLanguagePicker from './ShopLanguagePicker';
import ShopCurrencyPicker from './ShopCurrencyPicker';

export type DashboardView = 'bookings' | 'overview' | 'menu' | 'vouchers' | 'analytics' | 'customers' | 'reviews' | 'profile';



interface DashboardLayoutProps {
  currentView: DashboardView;
  onNavigate: (view: DashboardView) => void;
  shop: CoffeeShop;
  shops: CoffeeShop[];
  onSwitchShop: (id: string) => void;
  ownerName?: string;
  pendingCount?: number;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function DashboardLayout({ currentView, onNavigate, shop, shops, onSwitchShop, ownerName, pendingCount = 0, onLogout, children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t, tf } = useShopI18n();

  // Rebuilt on each render so the labels follow the language without a reload — the ids
  // are what the app routes on, and those never change.
  const navItems = [
    { id: 'bookings', icon: <CalendarCheck size={20} />, label: t('shop.nav.live') },
    { id: 'overview', icon: <LayoutGrid size={20} />, label: t('shop.nav.overview') },
    { id: 'menu', icon: <Coffee size={20} />, label: t('shop.nav.menu') },
    { id: 'vouchers', icon: <Ticket size={20} />, label: t('shop.nav.vouchers') },
    { id: 'analytics', icon: <BarChart3 size={20} />, label: t('shop.nav.analytics') },
    { id: 'customers', icon: <Users size={20} />, label: t('shop.nav.customers') },
    { id: 'reviews', icon: <Star size={20} />, label: t('shop.nav.reviews') },
    { id: 'profile', icon: <Store size={20} />, label: t('shop.nav.profile') },
  ] as const;

  return (
    <div className="shop-dash-shell min-h-screen text-gray-900 flex font-sans">
      {/*
        The dashboard's backdrop. A fixed layer rather than a background on this element,
        because this page scrolls: `background-attachment: fixed` is the one-line version
        and iOS Safari ignores it, which would leave the artwork sliding under the data.

        It sits behind everything (z-index -1) and takes no pointer events, so the sidebar,
        the overlay and every modal keep their own stacking exactly as before. The login
        screen has its own backdrop and never renders this component.
      */}
      <div className="shop-dash-backdrop" aria-hidden="true" />
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {/*
        On desktop the sidebar is sticky and exactly one screen tall, NOT `static`.
        As a static flex item it stretched to the height of the main column, and
        `justify-between` then pinned its footer to the bottom of the DOCUMENT rather than
        the bottom of the SCREEN — so the language switch and sign-out sat below the fold
        on every view whose content ran past one screen, and further down the longer the
        view got. They were in the DOM the whole time, which is why nothing looked broken.
      */}
      <motion.aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:bottom-auto lg:h-screen lg:block ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col justify-between">
          {/* min-h-0 is what lets the nav below actually scroll: without it a flex child
              refuses to shrink past its content and pushes the footer out again. */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="p-6 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-red-600/30">
                  M
                </div>
                <div>
                  <h1 className="text-lg font-black text-gray-900 tracking-tight">Mobler Shop</h1>
                  <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[140px]">{shop.name}</p>
                </div>
              </div>
              <button className="lg:hidden text-gray-500 hover:text-gray-900" onClick={() => setIsSidebarOpen(false)}>
                <X size={24} />
              </button>
            </div>

            {shops.length > 1 && (
              <div className="px-4 pt-3">
                <label className="block text-[10px] font-bold text-gray-500 mb-1 px-1">{t('shop.nav.managing')}</label>
                <select
                  value={shop.id}
                  onChange={e => onSwitchShop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800 focus:outline-none focus:border-red-600"
                >
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <nav className="min-h-0 px-4 py-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
                    currentView === item.id
                      ? 'bg-red-600 text-white font-bold shadow-md shadow-red-600/20'
                      : 'text-gray-600 hover:bg-red-50 hover:text-red-700'
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'bookings' && pendingCount > 0 && (
                    <span className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-black flex items-center justify-center ${
                      currentView === item.id ? 'bg-white text-red-700' : 'bg-amber-500 text-white'
                    }`}>{pendingCount}</span>
                  )}
                </button>
              ))}
            </nav>

            {/*
              Language and currency sit directly under the menu, as full-width rows with
              their current value showing, rather than as an icon in the footer. The icon
              was findable only if you already knew it was a language switch — the two
              settings a shop changes when it opens in another country should not be a
              guess. They stay OUTSIDE the scrolling nav so a long menu never hides them.

              Both also remain in Hồ sơ Quán → Regional Preferences, where they are
              explained. This is the shortcut, not a second source of truth: the currency
              row writes the same field through the same endpoint, behind the same warning.
            */}
            <div className="shrink-0 px-4 pb-1 pt-3 space-y-2">
              <ShopLanguagePicker />
              <ShopCurrencyPicker />
            </div>

            {/*
              The slack sits BELOW the two rows, not above them, so they stay just under
              the menu where they are easy to find. On a short screen the nav gives up its
              height first (it scrolls; this block is shrink-0), which is what keeps the
              rows on screen instead of pushing them off as the old footer did.
            */}
            <div className="flex-1 min-h-0" aria-hidden="true" />
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center space-x-3">
              <img
                src={shop.coverImage || shop.images?.[0]}
                alt=""
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover border border-gray-200 bg-gray-100"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">{ownerName}</p>
                <p className={`text-[10px] font-semibold flex items-center gap-1 ${shop.bookingSettings?.acceptingBookings === false ? 'text-gray-500' : 'text-emerald-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${shop.bookingSettings?.acceptingBookings === false ? 'bg-gray-400' : 'bg-emerald-500 animate-pulse'}`}></span>
                  {shop.bookingSettings?.acceptingBookings === false ? t('shop.nav.pausedBookings') : t('shop.nav.acceptingBookings')}
                </p>
              </div>
              <button onClick={onLogout} className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50" title={t('shop.nav.logout')} aria-label={t('shop.nav.logout')}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-gray-900">
              {navItems.find(i => i.id === currentView)?.label}
            </h1>
            {pendingCount > 0 && currentView !== 'bookings' && (
              <button onClick={() => onNavigate('bookings')} className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black">
                {tf('shop.nav.pendingBadge', { count: pendingCount })}
              </button>
            )}
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <MenuIcon size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
