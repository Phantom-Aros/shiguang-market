-- 阶段 4：商品与交易链路

CREATE TABLE IF NOT EXISTS carts (
  cart_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  item_id VARCHAR(26) PRIMARY KEY,
  cart_id VARCHAR(26) NOT NULL REFERENCES carts (cart_id) ON DELETE CASCADE,
  product_id VARCHAR(26) NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items (cart_id);

CREATE TABLE IF NOT EXISTS orders (
  order_id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) NOT NULL REFERENCES users (user_id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  CHECK (status IN ('pending', 'paid', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS order_items (
  item_id VARCHAR(26) PRIMARY KEY,
  order_id VARCHAR(26) NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
  product_id VARCHAR(26) NOT NULL REFERENCES products (product_id),
  product_name VARCHAR(200) NOT NULL,
  product_cover_url TEXT,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

CREATE TABLE IF NOT EXISTS payments (
  payment_id VARCHAR(26) PRIMARY KEY,
  order_id VARCHAR(26) NOT NULL REFERENCES orders (order_id),
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  method VARCHAR(20) NOT NULL DEFAULT 'mock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
