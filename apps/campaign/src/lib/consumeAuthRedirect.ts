import { tokenStorage } from '@shiguang/api-client';
import { consumeAuthTokensFromHash } from '@shiguang/shared';

/** 从 URL hash 读取 Web 登录回跳的 token，并写入本地存储 */
export function consumeAuthRedirectTokens() {
  const tokens = consumeAuthTokensFromHash(window.location.hash);
  if (!tokens) return false;

  tokenStorage.set(tokens.accessToken, tokens.refreshToken);
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
}
