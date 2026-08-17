/// <reference types="@tarojs/taro" />

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';
declare module '*.scss';

interface ProcessEnv {
  TARO_ENV: 'weapp' | 'swan' | 'alipay' | 'h5' | 'rn' | 'tt' | 'quickapp' | 'qq' | 'jd';
  NODE_ENV: 'development' | 'production';
  TARO_APP_API_BASE: string;
}
