-- 阶段 3：内容与 Feed 流

CREATE TABLE IF NOT EXISTS products (
  product_id VARCHAR(26) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  cover_url TEXT,
  price INTEGER NOT NULL,
  original_price INTEGER,
  stock INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);

CREATE TABLE IF NOT EXISTS posts (
  post_id VARCHAR(26) PRIMARY KEY,
  author_id VARCHAR(26) NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  cover_url TEXT NOT NULL,
  cover_width INTEGER,
  cover_height INTEGER,
  tags TEXT[] NOT NULL DEFAULT '{}',
  like_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at_id ON posts (created_at DESC, post_id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);

CREATE TABLE IF NOT EXISTS post_media (
  media_id VARCHAR(26) PRIMARY KEY,
  post_id VARCHAR(26) NOT NULL REFERENCES posts (post_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media (post_id, sort_order);

CREATE TABLE IF NOT EXISTS post_products (
  post_id VARCHAR(26) NOT NULL REFERENCES posts (post_id) ON DELETE CASCADE,
  product_id VARCHAR(26) NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_post_products_product_id ON post_products (product_id);

CREATE TABLE IF NOT EXISTS likes (
  like_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  post_id VARCHAR(26) NOT NULL REFERENCES posts (post_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes (post_id);

CREATE TABLE IF NOT EXISTS favorites (
  favorite_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  post_id VARCHAR(26) NOT NULL REFERENCES posts (post_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_post_id ON favorites (post_id);
