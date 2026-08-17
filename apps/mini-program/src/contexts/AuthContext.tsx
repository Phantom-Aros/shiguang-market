import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Taro from '@tarojs/taro';
import type { User } from '@shiguang/shared';
import { api, tokenStorage } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  loginWithWechat: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.setOnUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.hasTokens()) {
      setUser(null);
      return;
    }
    const me = await api.auth.getMe();
    setUser(me);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      if (!tokenStorage.hasTokens()) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        await refreshUser();
      } catch {
        tokenStorage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, [refreshUser]);

  const loginWithWechat = useCallback(async () => {
    const loginResult = await Taro.login();
    if (!loginResult.code) {
      throw new Error('微信登录失败，请重试');
    }

    const data = await api.auth.loginWithWechat(loginResult.code);
    tokenStorage.set(data.tokens.accessToken, data.tokens.refreshToken);
    setUser(data.user);
    Taro.showToast({ title: '登录成功', icon: 'success' });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      tokenStorage.clear();
      setUser(null);
      Taro.showToast({ title: '已退出', icon: 'none' });
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isLoggedIn: Boolean(user),
      loginWithWechat,
      logout,
      refreshUser,
    }),
    [user, loading, loginWithWechat, logout, refreshUser],
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
