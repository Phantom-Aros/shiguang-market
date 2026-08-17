const STORAGE_KEY_ACCESS = 'sg_access_token';
const STORAGE_KEY_REFRESH = 'sg_refresh_token';

export interface TokenStorage {
  getAccess(): string | null;
  getRefresh(): string | null;
  set(accessToken: string, refreshToken: string): void;
  clear(): void;
  hasTokens(): boolean;
}

export function createLocalStorageTokenStorage(): TokenStorage {
  return {
    getAccess() {
      return localStorage.getItem(STORAGE_KEY_ACCESS);
    },
    getRefresh() {
      return localStorage.getItem(STORAGE_KEY_REFRESH);
    },
    set(accessToken, refreshToken) {
      localStorage.setItem(STORAGE_KEY_ACCESS, accessToken);
      localStorage.setItem(STORAGE_KEY_REFRESH, refreshToken);
    },
    clear() {
      localStorage.removeItem(STORAGE_KEY_ACCESS);
      localStorage.removeItem(STORAGE_KEY_REFRESH);
    },
    hasTokens() {
      return Boolean(
        localStorage.getItem(STORAGE_KEY_ACCESS) && localStorage.getItem(STORAGE_KEY_REFRESH),
      );
    },
  };
}

/** 小程序端使用 wx / Taro 同步存储 */
export function createSyncStorageTokenStorage(
  storage: {
    getItem(key: string): string | null | undefined;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  },
): TokenStorage {
  return {
    getAccess() {
      return storage.getItem(STORAGE_KEY_ACCESS) ?? null;
    },
    getRefresh() {
      return storage.getItem(STORAGE_KEY_REFRESH) ?? null;
    },
    set(accessToken, refreshToken) {
      storage.setItem(STORAGE_KEY_ACCESS, accessToken);
      storage.setItem(STORAGE_KEY_REFRESH, refreshToken);
    },
    clear() {
      storage.removeItem(STORAGE_KEY_ACCESS);
      storage.removeItem(STORAGE_KEY_REFRESH);
    },
    hasTokens() {
      return Boolean(storage.getItem(STORAGE_KEY_ACCESS) && storage.getItem(STORAGE_KEY_REFRESH));
    },
  };
}
