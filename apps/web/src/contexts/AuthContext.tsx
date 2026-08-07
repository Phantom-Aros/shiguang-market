import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api, tokenStorage } from '@shiguang/api-client';
import type { User } from '@shiguang/shared';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.hasTokens()) {
      setUser(null);
      return;
    }
    const me = await api.auth.getMe();
    setUser(me);
  }, []);

  useEffect(() => {
    api.setOnUnauthorized(() => {
      setUser(null);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (!tokenStorage.hasTokens()) {
      setLoading(false);
      return;
    }

    refreshUser()
      .catch(() => {
        tokenStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (phone: string, code: string) => {
      const data = await api.auth.login(phone, code);
      tokenStorage.set(data.tokens.accessToken, data.tokens.refreshToken);
      setUser(data.user);
      navigate('/', { replace: true });
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      tokenStorage.clear();
      setUser(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
    }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
