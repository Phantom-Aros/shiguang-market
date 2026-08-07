
CREATE TABLE ai_conversations (
  conversation_id VARCHAR(26) PRIMARY KEY,
  user_id         VARCHAR(26) NOT NULL REFERENCES users(user_id),
  product_id      VARCHAR(26) REFERENCES products(product_id),  -- 可空，通用问答
  title           VARCHAR(200),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

CREATE TABLE ai_messages (
  message_id       VARCHAR(26) PRIMARY KEY,
  conversation_id  VARCHAR(26) NOT NULL REFERENCES ai_conversations(conversation_id) ON DELETE CASCADE,
  role             VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);