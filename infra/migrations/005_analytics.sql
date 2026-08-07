-- 阶段 5：埋点与监控治理

CREATE TABLE IF NOT EXISTS analytics_events (
  event_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) REFERENCES users (user_id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  event_name VARCHAR(100) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  page_url TEXT,
  user_agent TEXT,
  client_ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created
  ON analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS client_metrics (
  metric_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) REFERENCES users (user_id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  name VARCHAR(20) NOT NULL,
  value NUMERIC NOT NULL,
  rating VARCHAR(20),
  page_url TEXT,
  navigation_type VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_metrics_name_created
  ON client_metrics (name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_metrics_created
  ON client_metrics (created_at DESC);

CREATE TABLE IF NOT EXISTS client_errors (
  error_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) REFERENCES users (user_id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_errors_created
  ON client_errors (created_at DESC);
