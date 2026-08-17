export const WEB_ORIGIN = import.meta.env.VITE_WEB_ORIGIN ?? 'http://localhost:5173';

/** 跳转到 Web 端登录，登录成功后回跳到 returnTo */
export function getWebLoginUrl(returnTo?: string) {
  const url = new URL(`${WEB_ORIGIN}/login`);
  url.searchParams.set('redirect', returnTo ?? window.location.href);
  return url.toString();
}
