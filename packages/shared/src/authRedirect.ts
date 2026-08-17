const DEFAULT_CAMPAIGN_ORIGINS = ['http://localhost:5174', 'http://127.0.0.1:5174'];

/** 是否允许登录后跳回该地址（仅开发环境本地跨端口） */
export function isAllowedAuthRedirect(url: string, extraOrigins: string[] = []) {
  try {
    const { origin, protocol, hostname } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') return false;
    return [...DEFAULT_CAMPAIGN_ORIGINS, ...extraOrigins].includes(origin);
  } catch {
    return false;
  }
}

export function buildAuthRedirectUrl(
  targetUrl: string,
  tokens: { accessToken: string; refreshToken: string },
) {
  const url = new URL(targetUrl);
  const params = new URLSearchParams();
  params.set('access_token', tokens.accessToken);
  params.set('refresh_token', tokens.refreshToken);
  url.hash = params.toString();
  return url.toString();
}

export function consumeAuthTokensFromHash(hash: string) {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
