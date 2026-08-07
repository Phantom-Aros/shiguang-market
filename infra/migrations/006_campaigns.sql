-- 阶段 6：活动页与配置化搭建

CREATE TABLE IF NOT EXISTS campaigns (
  campaign_id VARCHAR(26) PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_version_id VARCHAR(26),
  canary_version_id VARCHAR(26),
  rollout_percent INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns (slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);

CREATE TABLE IF NOT EXISTS campaign_versions (
  version_id VARCHAR(26) PRIMARY KEY,
  campaign_id VARCHAR(26) NOT NULL REFERENCES campaigns (campaign_id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  schema JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, version_number),
  CHECK (status IN ('draft', 'published', 'superseded', 'rolled_back'))
);

CREATE INDEX IF NOT EXISTS idx_campaign_versions_campaign_id ON campaign_versions (campaign_id, version_number DESC);

ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_published_version
  FOREIGN KEY (published_version_id) REFERENCES campaign_versions (version_id)
  ON DELETE SET NULL;

ALTER TABLE campaigns
  ADD CONSTRAINT fk_campaigns_canary_version
  FOREIGN KEY (canary_version_id) REFERENCES campaign_versions (version_id)
  ON DELETE SET NULL;
