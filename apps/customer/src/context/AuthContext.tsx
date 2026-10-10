import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { api, http, UserAccount } from '../services/api';

type AuthMode = 'login' | 'register';

interface OpenAuthOptions {
  /** Short explanation shown at the top of the modal, e.g. why login is needed. */
  reason?: string;
  /** Called once the user has signed in or created an account. */
  onSuccess?: () => void;
}

interface AuthContextType {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthMode;
  authModalReason?: string;
  openAuthModal: (mode?: AuthMode, options?: OpenAuthOptions) => void;
  closeAuthModal: () => void;
  loginWithPassword: (identifier: string, password: string) => Promise<void>;
  registerAccount: (data: { phone: string; email?: string; password: string; name: string }) => Promise<void>;
  updateUserProfile: (updates: Partial<UserAccount>) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('login');
  const [authModalReason, setAuthModalReason] = useState<string | undefined>();
  const pendingSuccess = useRef<(() => void) | null>(null);

  const refreshUser = async () => {
    try {
      if (!api.getToken()) {
        setUser(null);
        return;
      }
      const data = await api.getMe();
      if (data?.user) setUser(data.user);
    } catch (e) {
      console.warn('Failed to load active session, clearing token:', e);
      api.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    http.setUnauthorizedHandler(() => setUser(null));
    refreshUser();
  }, []);

  const openAuthModal = (mode: AuthMode = 'login', options: OpenAuthOptions = {}) => {
    setAuthModalMode(mode);
    setAuthModalReason(options.reason);
    pendingSuccess.current = options.onSuccess || null;
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    pendingSuccess.current = null;
  };

  const finishAuth = (u: UserAccount) => {
    setUser(u);
    setIsAuthModalOpen(false);
    const cb = pendingSuccess.current;
    pendingSuccess.current = null;
    if (cb) setTimeout(cb, 0);
  };

  const loginWithPassword = async (identifier: string, password: string) => {
    const res = await api.login({ identifier, password });
    finishAuth(res.user);
  };

  const registerAccount = async (data: { phone: string; email?: string; password: string; name: string }) => {
    const res = await api.register(data);
    finishAuth(res.user);
  };

  const updateUserProfile = async (updates: Partial<UserAccount>) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        authModalReason,
        openAuthModal,
        closeAuthModal,
        loginWithPassword,
        registerAccount,
        updateUserProfile,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
