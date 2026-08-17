import Taro from '@tarojs/taro';
import {
  createApiClient,
  createSyncStorageTokenStorage,
  createTaroFetch,
} from '@shiguang/api-client';

const API_BASE = process.env.TARO_APP_API_BASE || 'http://localhost:3000/api';

const storage = createSyncStorageTokenStorage({
  getItem: (key) => Taro.getStorageSync(key),
  setItem: (key, value) => Taro.setStorageSync(key, value),
  removeItem: (key) => Taro.removeStorageSync(key),
});

/** 与 api 客户端共用的 token 存储实例 */
export const tokenStorage = storage;

export const api = createApiClient({
  baseUrl: API_BASE,
  storage,
  fetchFn: createTaroFetch((options) =>
    Taro.request({
      url: options.url,
      method: (options.method ?? 'GET') as keyof Taro.request.Method,
      data: options.data,
      header: options.header,
    }),
  ),
});
