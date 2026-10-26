import { useEffect, useState } from 'react';
import { Loader2, Store } from 'lucide-react';
import DashboardLayout, { DashboardView } from './components/dashboard/DashboardLayout';
import OverviewView from './components/dashboard/OverviewView';
import MenuManagerView from './components/dashboard/MenuManagerView';
import PromotionsVoucherView from './components/dashboard/PromotionsVoucherView';
import CustomerInsightsView from './components/dashboard/CustomerInsightsView';
import AnalyticsView from './components/dashboard/AnalyticsView';
import ReviewsManagerView from './components/dashboard/ReviewsManagerView';
import LiveBookingsView from './views/LiveBookingsView';
import ShopProfileView from './views/ShopProfileView';
import ShopAuthScreen from './views/ShopAuthScreen';
import { useShopI18n } from './i18n/useShopI18n';
import { useShopAuth } from './context/ShopAuthContext';

export default function App() {
  const { user, shops, activeShop, isLoading, setActiveShopId, logout } = useShopAuth();
  const { t } = useShopI18n();
  const [view, setView] = useState<DashboardView>('bookings');
  const [pendingCount, setPendingCount] = useState(0);

  // Show pending requests in the browser tab so staff notice them from another tab.
  useEffect(() => {
    document.title = pendingCount > 0 ? `(${pendingCount}) Mobler Shop` : 'Mobler Shop';
  }, [pendingCount]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 text-gray-500">
        <Loader2 className="animate-spin mr-2" size={18} /> {t('shop.common.loading')}
      </div>
    );
  }

  if (!user) return <ShopAuthScreen />;

  if (!activeShop) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
        <Store size={40} className="text-gray-300" />
        <p className="font-bold text-gray-800">{t('shop.app.noShop')}</p>
        <button onClick={logout} className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-sm">{t('shop.nav.logout')}</button>
      </div>
    );
  }

  const content = () => {
    switch (view) {
      case 'bookings':
        return <LiveBookingsView key={activeShop.id} shop={activeShop} onPendingCountChange={setPendingCount} />;
      case 'overview':
        return <OverviewView onNavigate={setView} />;
      case 'menu':
        return <MenuManagerView />;
      case 'vouchers':
        return <PromotionsVoucherView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'customers':
        return <CustomerInsightsView />;
      case 'reviews':
        return <ReviewsManagerView />;
      case 'profile':
        return <ShopProfileView shop={activeShop} />;
    }
  };

  return (
    <DashboardLayout
      currentView={view}
      onNavigate={setView}
      shop={activeShop}
      shops={shops}
      onSwitchShop={setActiveShopId}
      ownerName={user.name}
      pendingCount={pendingCount}
      onLogout={logout}
    >
      {content()}
    </DashboardLayout>
  );
}
