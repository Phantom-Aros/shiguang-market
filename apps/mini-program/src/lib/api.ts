import {
  createApiClient,
  createSyncStorageTokenStorage,
  createTaroChatStreamTransport,
  createTaroFetch,
} from '@shiguang/api-client';
import Taro from '@tarojs/taro';

const API_BASE = process.env.TARO_APP_API_BASE || 'http://localhost:3000/api';

const storage = createSyncStorageTokenStorage({
  getItem: (key) => Taro.getStorageSync(key),
  setItem: (key, value) => Taro.setStorageSync(key, value),
  removeItem: (key) => Taro.removeStorageSync(key),
});

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
  chatStreamTransport: createTaroChatStreamTransport((options) =>
    Taro.request({
      url: options.url,
      method: 'POST',
      data: options.data,
      header: options.header,
      enableChunked: options.enableChunked,
      success: options.success,
      fail: options.fail,
    }),
  ),
});
