-- 阶段 0：users 表骨架（阶段 1 扩展鉴权字段）
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(26) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  nickname VARCHAR(64),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);
