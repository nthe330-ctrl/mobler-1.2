import React, { useState } from 'react';
import ShopNotificationBell from './NotificationBell';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Coffee, BarChart3, Star, Store, Menu as MenuIcon, X, Users, Ticket, LogOut, CalendarCheck } from 'lucide-react';
import { CoffeeShop } from '@shared/types';

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

  const navItems = [
    { id: 'bookings', icon: <CalendarCheck size={20} />, label: 'Đặt bàn trực tiếp' },
    { id: 'overview', icon: <LayoutGrid size={20} />, label: 'Tổng quan' },
    { id: 'menu', icon: <Coffee size={20} />, label: 'Quản lý Menu' },
    { id: 'vouchers', icon: <Ticket size={20} />, label: 'Khuyến mãi & Voucher' },
    { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Thống kê' },
    { id: 'customers', icon: <Users size={20} />, label: 'Khách hàng' },
    { id: 'reviews', icon: <Star size={20} />, label: 'Đánh giá' },
    { id: 'profile', icon: <Store size={20} />, label: 'Hồ sơ Quán' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex font-sans">
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
      <motion.aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col justify-between">
          <div>
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
                <label className="block text-[10px] font-bold text-gray-500 mb-1 px-1">Đang quản lý</label>
                <select
                  value={shop.id}
                  onChange={e => onSwitchShop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-800 focus:outline-none focus:border-red-600"
                >
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            <nav className="px-4 py-3 space-y-1 overflow-y-auto">
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
                  {shop.bookingSettings?.acceptingBookings === false ? 'Tạm ngưng đặt bàn' : 'Đang nhận đặt bàn'}
                </p>
              </div>
              <button onClick={onLogout} className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50" title="Đăng xuất" aria-label="Đăng xuất">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-gray-900">
              {navItems.find(i => i.id === currentView)?.label}
            </h1>
            {pendingCount > 0 && currentView !== 'bookings' && (
              <button onClick={() => onNavigate('bookings')} className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black">
                {pendingCount} chờ
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ShopNotificationBell />
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <MenuIcon size={24} />
            </button>
          </div>
        </header>

        {/* On a wide screen the sidebar replaces the mobile header, so the inbox floats. */}
        <div className="hidden lg:block absolute top-4 right-6 z-40">
          <ShopNotificationBell />
        </div>

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
