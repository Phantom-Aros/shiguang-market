import { ulid } from 'ulid';
import { query } from '../db/postgres.js';

/**
 * @param {object} row
 */
export function mapOrderRow(row) {
  return {
    orderId: row.order_id,
    userId: row.user_id,
    status: row.status,
    totalAmount: row.total_amount,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    paidAt: row.paid_at ? row.paid_at.toISOString() : null,
    cancelledAt: row.cancelled_at ? row.cancelled_at.toISOString() : null,
  };
}

/**
 * @param {object} row
 */
export function mapOrderItemRow(row) {
  return {
    itemId: row.item_id,
    productId: row.product_id,
    productName: row.product_name,
    productCoverUrl: row.product_cover_url,
    price: row.price,
    quantity: row.quantity,
    subtotal: row.price * row.quantity,
  };
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ userId: string; totalAmount: number }} data
 */
export async function createOrder(client, data) {
  const orderId = ulid();
  const result = await client.query(
    `INSERT INTO orders (order_id, user_id, status, total_amount)
     VALUES ($1, $2, 'pending', $3)
     RETURNING order_id, user_id, status, total_amount, created_at, updated_at, paid_at, cancelled_at`,
    [orderId, data.userId, data.totalAmount],
  );
  return result.rows[0];
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ orderId: string; productId: string; productName: string; productCoverUrl: string | null; price: number; quantity: number }} data
 */
export async function createOrderItem(client, data) {
  const itemId = ulid();
  await client.query(
    `INSERT INTO order_items (item_id, order_id, product_id, product_name, product_cover_url, price, quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      itemId,
      data.orderId,
      data.productId,
      data.productName,
      data.productCoverUrl,
      data.price,
      data.quantity,
    ],
  );
}

/**
 * @param {string} orderId
 * @param {string} userId
 */
export async function findByIdForUser(orderId, userId) {
  const result = await query(
    `SELECT order_id, user_id, status, total_amount, created_at, updated_at, paid_at, cancelled_at
     FROM orders
     WHERE order_id = $1 AND user_id = $2`,
    [orderId, userId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} orderId
 */
export async function lockByIdForUpdate(client, orderId) {
  const result = await client.query(
    `SELECT order_id, user_id, status, total_amount, created_at, updated_at, paid_at, cancelled_at
     FROM orders
     WHERE order_id = $1
     FOR UPDATE`,
    [orderId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} orderId
 */
export async function findItemsByOrderId(orderId) {
  const result = await query(
    `SELECT item_id, product_id, product_name, product_cover_url, price, quantity
     FROM order_items
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId],
  );
  return result.rows;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} orderId
 */
export async function findItemsByOrderIdForUpdate(client, orderId) {
  const result = await client.query(
    `SELECT item_id, product_id, product_name, product_cover_url, price, quantity
     FROM order_items
     WHERE order_id = $1`,
    [orderId],
  );
  return result.rows;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} orderId
 */
export async function markPaid(client, orderId) {
  const result = await client.query(
    `UPDATE orders
     SET status = 'paid', paid_at = NOW(), updated_at = NOW()
     WHERE order_id = $1
     RETURNING order_id, user_id, status, total_amount, created_at, updated_at, paid_at, cancelled_at`,
    [orderId],
  );
  return result.rows[0];
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} orderId
 */
export async function markCancelled(client, orderId) {
  const result = await client.query(
    `UPDATE orders
     SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
     WHERE order_id = $1
     RETURNING order_id, user_id, status, total_amount, created_at, updated_at, paid_at, cancelled_at`,
    [orderId],
  );
  return result.rows[0];
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ orderId: string; amount: number }} data
 */
export async function createPayment(client, data) {
  const paymentId = ulid();
  await client.query(
    `INSERT INTO payments (payment_id, order_id, amount, status, method)
     VALUES ($1, $2, $3, 'success', 'mock')`,
    [paymentId, data.orderId, data.amount],
  );
  return paymentId;
}

/**
 * @param {string} userId
 * @param {{ limit: number; offset: number }} options
 */
export async function findByUserId(userId, options) {
  const result = await query(
    `SELECT order_id, user_id, status, total_amount, created_at, updated_at, paid_at, cancelled_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, options.limit, options.offset],
  );
  return result.rows;
}

/**
 * @param {string} userId
 */
export async function countByUserId(userId) {
  const result = await query(
    `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0]?.total ?? 0;
}
