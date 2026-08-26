import { ulid } from 'ulid';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { pool, query, withTransaction } from '../db/postgres.js';
import { logger } from '../logger.js';
import { build618ExampleSchema } from '@shiguang/campaign-schema/schema';

const log = logger.child({ name: 'seed' });

/** E2E / 集成测试固定账号 */
export const E2E_TEST_USER = {
  phone: '13900000001',
  nickname: 'E2E 测试用户',
  avatarUrl: 'https://i.pravatar.cc/150?u=e2e',
};

const AUTHORS = [
  E2E_TEST_USER,
  { phone: '13800001001', nickname: '穿搭达人', avatarUrl: 'https://i.pravatar.cc/150?u=sg1' },
  { phone: '13800001002', nickname: '生活家', avatarUrl: 'https://i.pravatar.cc/150?u=sg2' },
  { phone: '13800001003', nickname: '数码控', avatarUrl: 'https://i.pravatar.cc/150?u=sg3' },
  { phone: '13800001004', nickname: '美妆博主', avatarUrl: 'https://i.pravatar.cc/150?u=sg4' },
  { phone: '13800001005', nickname: '户外玩家', avatarUrl: 'https://i.pravatar.cc/150?u=sg5' },
];

const TAG_POOL = ['穿搭', '家居', '数码', '美妆', '户外', '零食', '文具', '宠物', '旅行', '健身'];

const PRODUCT_TEMPLATES = [
  { name: '复古牛仔外套', price: 15900, originalPrice: 22900 },
  { name: '极简陶瓷马克杯', price: 4900, originalPrice: 6900 },
  { name: '无线降噪耳机', price: 39900, originalPrice: 49900 },
  { name: '保湿面霜 50ml', price: 12800, originalPrice: 16800 },
  { name: '轻量徒步背包 20L', price: 19900, originalPrice: 25900 },
  { name: '手账贴纸套装', price: 2900, originalPrice: 3900 },
  { name: '宠物自动喂食器', price: 8900, originalPrice: 11900 },
  { name: '便携榨汁杯', price: 7900, originalPrice: 9900 },
];

const TITLE_TEMPLATES = [
  '今日份好物分享｜{tag}灵感',
  '实测推荐！这件{tag}单品太绝了',
  '深圳周末逛市集挖到的宝藏',
  '闭眼入不踩雷的{tag}清单',
  '同事追着问的{tag}好物',
  '学生党也能冲的平价{tag}',
  '提升幸福感的{tag}小物',
  '回购三次的{tag}心头好',
];

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickTags() {
  const count = 1 + Math.floor(Math.random() * 2);
  const shuffled = [...TAG_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function buildTitle(tags) {
  const tag = tags[0] ?? '生活';
  return pickRandom(TITLE_TEMPLATES).replaceAll('{tag}', tag);
}

function coverSize(seed) {
  const widths = [300, 320, 360, 400];
  const ratios = [1.2, 1.33, 1.5, 1.66];
  const width = widths[seed % widths.length];
  const height = Math.round(width * ratios[seed % ratios.length]);
  return { width, height };
}

/**
 * @param {string} userId
 */
async function ensureAuthor(userId, author) {
  const existing = await query(`SELECT user_id FROM users WHERE phone = $1`, [author.phone]);
  if (existing.rows[0]) {
    return existing.rows[0].user_id;
  }

  const result = await query(
    `
    INSERT INTO users (user_id, phone, nickname, avatar_url)
    VALUES ($1, $2, $3, $4)
    RETURNING user_id
    `,
    [userId, author.phone, author.nickname, author.avatarUrl],
  );
  return result.rows[0].user_id;
}

async function seedProducts() {
  const products = [];

  for (let i = 0; i < PRODUCT_TEMPLATES.length; i += 1) {
    const template = PRODUCT_TEMPLATES[i];
    const productId = ulid();
    const coverUrl = `https://picsum.photos/seed/sg-product-${i}/400/400`;

    await query(
      `
      INSERT INTO products (
        product_id, name, description, cover_url, price, original_price, stock, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      ON CONFLICT (product_id) DO NOTHING
      `,
      [
        productId,
        template.name,
        `${template.name} · 拾光市集精选好物`,
        coverUrl,
        template.price,
        template.originalPrice,
        50 + (i * 17) % 200,
      ],
    );

    products.push({ productId, ...template });
  }

  return products;
}

async function seedPosts(authorIds, products, postCount = 60) {
  for (let i = 0; i < postCount; i += 1) {
    const postId = ulid();
    const authorId = authorIds[i % authorIds.length];
    const tags = pickTags();
    const title = buildTitle(tags);
    const { width, height } = coverSize(i);
    const coverUrl = `https://picsum.photos/seed/sg-post-${i}/${width}/${height}`;
    const content = `这是一篇关于${tags.join('、')}的种草笔记。\n\n周末逛拾光市集时发现的好物，质感在线、颜值能打，分享给你们～\n\n#${tags.join(' #')}`;
    const likeCount = Math.floor(Math.random() * 2000);
    const favoriteCount = Math.floor(Math.random() * 500);
    const createdAt = new Date(Date.now() - i * 3_600_000 - Math.floor(Math.random() * 86_400_000));

    await query(
      `
      INSERT INTO posts (
        post_id, author_id, title, content, cover_url, cover_width, cover_height,
        tags, like_count, favorite_count, view_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      `,
      [
        postId,
        authorId,
        title,
        content,
        coverUrl,
        width,
        height,
        tags,
        likeCount,
        favoriteCount,
        Math.floor(Math.random() * 10_000),
        createdAt,
      ],
    );

    const extraMediaCount = i % 3;
    for (let m = 0; m < extraMediaCount; m += 1) {
      const mediaId = ulid();
      const mediaSize = coverSize(i + m + 1);
      await query(
        `
        INSERT INTO post_media (media_id, post_id, url, width, height, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          mediaId,
          postId,
          `https://picsum.photos/seed/sg-post-${i}-m${m}/${mediaSize.width}/${mediaSize.height}`,
          mediaSize.width,
          mediaSize.height,
          m + 1,
        ],
      );
    }

    if (i % 2 === 0) {
      const product = products[i % products.length];
      await query(
        `
        INSERT INTO post_products (post_id, product_id, sort_order)
        VALUES ($1, $2, 0)
        ON CONFLICT DO NOTHING
        `,
        [postId, product.productId],
      );
    }
  }
}

async function seedCampaign(products) {
  const existing = await query(`SELECT campaign_id FROM campaigns WHERE slug = '618-sale'`);
  if (existing.rows[0]) {
    log.info('618 campaign already exists, skipping');
    return;
  }

  const campaignId = ulid();
  const versionId = ulid();
  const productIds = products.map((p) => p.productId);
  const schema = build618ExampleSchema(productIds);

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO campaigns (campaign_id, slug, title, status)
       VALUES ($1, '618-sale', '拾光市集 618 狂欢', 'draft')`,
      [campaignId],
    );

    await client.query(
      `INSERT INTO campaign_versions (version_id, campaign_id, version_number, schema, status)
       VALUES ($1, $2, 1, $3, 'draft')`,
      [versionId, campaignId, JSON.stringify(schema)],
    );

    await client.query(
      `UPDATE campaign_versions SET status = 'published', published_at = NOW() WHERE version_id = $1`,
      [versionId],
    );

    await client.query(
      `UPDATE campaigns
       SET status = 'published', published_version_id = $2, rollout_percent = 100, updated_at = NOW()
       WHERE campaign_id = $1`,
      [campaignId, versionId],
    );
  });

  log.info({ slug: '618-sale', campaignId }, '618 campaign seeded and published');
}

async function seed() {
  const postCountResult = await query(`SELECT COUNT(*)::int AS count FROM posts`);
  if (postCountResult.rows[0].count > 0) {
    const productsResult = await query(`SELECT product_id FROM products LIMIT 8`);
    const products = productsResult.rows.map((r) => ({ productId: r.product_id }));
    await seedCampaign(products);
    await ensureE2eUser();
    log.info({ count: postCountResult.rows[0].count }, 'posts already exist, skipping feed seed');
    return { skipped: true, posts: postCountResult.rows[0].count };
  }

  const authorIds = [];
  for (const author of AUTHORS) {
    const userId = ulid();
    const id = await ensureAuthor(userId, author);
    authorIds.push(id);
  }

  const products = await seedProducts();
  await seedPosts(authorIds, products, 60);
  await seedCampaign(products);

  log.info({ authors: AUTHORS.length, products: 8, posts: 60, campaign: '618-sale' }, 'seed complete');
  return { skipped: false, authors: AUTHORS.length, products: 8, posts: 60, campaign: '618-sale' };
}

/** 确保 E2E 测试用户存在（幂等） */
async function ensureE2eUser() {
  await ensureAuthor(ulid(), E2E_TEST_USER);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  seed()
    .catch((err) => {
      log.fatal({ err }, 'seed failed');
      process.exit(1);
    })
    .finally(() => pool.end());
}

export { seed, seedProducts, seedPosts, seedCampaign, ensureE2eUser };
