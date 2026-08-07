import { query } from '../db/postgres.js';

/**
 * @param {object} row
 */
export function mapProductRow(row) {
  return {
    productId: row.product_id,
    name: row.name,
    description: row.description,
    coverUrl: row.cover_url,
    price: row.price,
    originalPrice: row.original_price,
    stock: row.stock,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * @param {number} [limit]
 */
export async function findSamples(limit = 4) {
  const result = await query(
    `SELECT product_id, name, description, cover_url, price, original_price, stock, status, created_at
     FROM products
     WHERE status = 'active'
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/**
 * @param {string} productId
 */
export async function findById(productId) {
  const result = await query(
    `SELECT product_id, name, description, cover_url, price, original_price, stock, status, created_at
     FROM products
     WHERE product_id = $1`,
    [productId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} productId
 */
export async function lockByIdForUpdate(client, productId) {
  const result = await client.query(
    `SELECT product_id, name, description, cover_url, price, original_price, stock, status
     FROM products
     WHERE product_id = $1 AND status = 'active'
     FOR UPDATE`,
    [productId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} productId
 * @param {number} quantity
 */
export async function deductStock(client, productId, quantity) {
  await client.query(
    `UPDATE products
     SET stock = stock - $2, updated_at = NOW()
     WHERE product_id = $1`,
    [productId, quantity],
  );
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} productId
 * @param {number} quantity
 */
export async function restoreStock(client, productId, quantity) {
  await client.query(
    `UPDATE products
     SET stock = stock + $2, updated_at = NOW()
     WHERE product_id = $1`,
    [productId, quantity],
  );
}
