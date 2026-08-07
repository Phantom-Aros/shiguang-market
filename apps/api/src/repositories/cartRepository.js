import { ulid } from 'ulid';
import { query } from '../db/postgres.js';

/**
 * @param {object} row
 */
export function mapCartItemRow(row) {
  return {
    itemId: row.item_id,
    productId: row.product_id,
    quantity: row.quantity,
    product: {
      productId: row.product_id,
      name: row.name,
      coverUrl: row.cover_url,
      price: row.price,
      originalPrice: row.original_price,
      stock: row.stock,
      status: row.status,
    },
    subtotal: row.price * row.quantity,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * @param {string} userId
 */
export async function findCartByUserId(userId) {
  const result = await query(`SELECT cart_id FROM carts WHERE user_id = $1`, [userId]);
  return result.rows[0] ?? null;
}

/**
 * @param {string} userId
 */
export async function getOrCreateCart(userId) {
  const existing = await findCartByUserId(userId);
  if (existing) {
    return existing.cart_id;
  }

  const cartId = ulid();
  await query(
    `INSERT INTO carts (cart_id, user_id) VALUES ($1, $2)`,
    [cartId, userId],
  );
  return cartId;
}

/**
 * @param {string} cartId
 */
export async function findItemsByCartId(cartId) {
  const result = await query(
    `SELECT
       ci.item_id,
       ci.product_id,
       ci.quantity,
       ci.created_at,
       p.name,
       p.cover_url,
       p.price,
       p.original_price,
       p.stock,
       p.status
     FROM cart_items ci
     JOIN products p ON p.product_id = ci.product_id
     WHERE ci.cart_id = $1
     ORDER BY ci.created_at ASC`,
    [cartId],
  );
  return result.rows;
}

/**
 * @param {string} cartId
 * @param {string} productId
 */
export async function findItemByProduct(cartId, productId) {
  const result = await query(
    `SELECT item_id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
    [cartId, productId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} cartId
 * @param {string} productId
 * @param {number} quantity
 */
export async function upsertItem(cartId, productId, quantity) {
  const existing = await findItemByProduct(cartId, productId);
  if (existing) {
    await query(
      `UPDATE cart_items SET quantity = $3, updated_at = NOW() WHERE cart_id = $1 AND product_id = $2`,
      [cartId, productId, quantity],
    );
    return existing.item_id;
  }

  const itemId = ulid();
  await query(
    `INSERT INTO cart_items (item_id, cart_id, product_id, quantity) VALUES ($1, $2, $3, $4)`,
    [itemId, cartId, productId, quantity],
  );
  return itemId;
}

/**
 * @param {string} cartId
 * @param {string} itemId
 */
export async function deleteItem(cartId, itemId) {
  const result = await query(
    `DELETE FROM cart_items WHERE cart_id = $1 AND item_id = $2 RETURNING item_id`,
    [cartId, itemId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} cartId
 * @param {string[]} productIds
 */
export async function deleteItemsByProductIds(cartId, productIds) {
  if (productIds.length === 0) return;
  await query(
    `DELETE FROM cart_items WHERE cart_id = $1 AND product_id = ANY($2::varchar[])`,
    [cartId, productIds],
  );
}

/**
 * @param {string} cartId
 */
export async function countItems(cartId) {
  const result = await query(
    `SELECT COALESCE(SUM(quantity), 0)::int AS total FROM cart_items WHERE cart_id = $1`,
    [cartId],
  );
  return result.rows[0]?.total ?? 0;
}
