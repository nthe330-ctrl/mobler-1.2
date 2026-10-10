import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CoffeeShop } from '@shared/types';
import { http, shopApi, ShopRegistration, ShopUser } from '../services/shopApi';

const ACTIVE_SHOP_KEY = 'mobler_shop_active_shop';

interface ShopAuthContextType {
  user: ShopUser | null;
  shops: CoffeeShop[];
  activeShop: CoffeeShop | null;
  isLoading: boolean;
  setActiveShopId: (id: string) => void;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: ShopRegistration) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  replaceShop: (shop: CoffeeShop) => void;
}

const ShopAuthContext = createContext<ShopAuthContextType | undefined>(undefined);

function readActiveShop(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SHOP_KEY);
  } catch {
    return null;
  }
}

export function ShopAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ShopUser | null>(null);
  const [shops, setShops] = useState<CoffeeShop[]>([]);
  const [activeShopId, setActiveShopIdState] = useState<string | null>(readActiveShop());
  const [isLoading, setIsLoading] = useState(true);

  const setActiveShopId = (id: string) => {
    setActiveShopIdState(id);
    try {
      localStorage.setItem(ACTIVE_SHOP_KEY, id);
    } catch {
      // ignore
    }
  };

  const refresh = async () => {
    if (!http.getToken()) {
      setUser(null);
      setShops([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await shopApi.me();
      if (res.user.account_type !== 'shop') throw new Error('Not a shop account');
      setUser(res.user);
      setShops(res.shops || []);
    } catch {
      shopApi.logout();
      setUser(null);
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    http.setUnauthorizedHandler(() => {
      setUser(null);
      setShops([]);
    });
    refresh();
  }, []);

  const login = async (identifier: string, password: string) => {
    await shopApi.login(identifier, password);
    await refresh();
  };

  const register = async (payload: ShopRegistration) => {
    const res = await shopApi.register(payload);
    setActiveShopId(res.shop.id);
    await refresh();
  };

  const logout = () => {
    shopApi.logout();
    setUser(null);
    setShops([]);
  };

  const replaceShop = (shop: CoffeeShop) => setShops(prev => prev.map(s => (s.id === shop.id ? shop : s)));

  const activeShop = shops.find(s => s.id === activeShopId) || shops[0] || null;

  return (
    <ShopAuthContext.Provider
      value={{ user, shops, activeShop, isLoading, setActiveShopId, login, register, logout, refresh, replaceShop }}
    >
      {children}
    </ShopAuthContext.Provider>
  );
}

export function useShopAuth() {
  const ctx = useContext(ShopAuthContext);
  if (!ctx) throw new Error('useShopAuth must be used inside ShopAuthProvider');
  return ctx;
}
