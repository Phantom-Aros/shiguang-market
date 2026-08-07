-- 阶段 1：鉴权相关表

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash ON user_sessions (refresh_token_hash);

CREATE TABLE IF NOT EXISTS wechat_bindings (
  binding_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  openid VARCHAR(64) NOT NULL UNIQUE,
  union_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wechat_bindings_user_id ON wechat_bindings (user_id);
