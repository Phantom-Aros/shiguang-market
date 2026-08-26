-- 阶段 9：Feed / 详情查询性能索引

-- Feed min_price 子查询：按 post_id 关联 post_products
CREATE INDEX IF NOT EXISTS idx_post_products_post_id ON post_products (post_id);

-- 子查询中过滤 active 商品
CREATE INDEX IF NOT EXISTS idx_products_status_product_id ON products (status, product_id);

-- 登录用户 EXISTS 查询：post_id + user_id 顺序
CREATE INDEX IF NOT EXISTS idx_likes_post_user ON likes (post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_post_user ON favorites (post_id, user_id);

-- 相关推荐：同作者帖子
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts (author_id, created_at DESC);
