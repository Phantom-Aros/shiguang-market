import { AppError } from '../middleware/errorHandler.js';
import { withTransaction } from '../db/postgres.js';
import * as cartRepository from '../repositories/cartRepository.js';
import * as orderRepository from '../repositories/orderRepository.js';
import * as productRepository from '../repositories/productRepository.js';
import { scheduleOrderExpiry, cancelOrderExpiry } from '../jobs/orderExpiry.js';

/**
 * @typedef {{ productId: string; quantity: number }} OrderLineInput
 */

/**
 * @param {import('pg').PoolClient} client
 * @param {OrderLineInput[]} items
 */
export async function lockAndValidateItems(client, items) {
  /** @type {Array<{ productId: string; quantity: number; product: object }>} */
  const resolved = [];

  for (const item of items) {
    const product = await productRepository.lockByIdForUpdate(client, item.productId);
    if (!product) {
      throw new AppError(`商品 ${item.productId} 不存在或已下架`, 'NOT_FOUND', 404);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`商品「${product.name}」库存不足`, 'INSUFFICIENT_STOCK', 400);
    }
    resolved.push({ ...item, product });
  }

  return resolved;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {Array<{ productId: string; quantity: number; product: object }>} items
 */
export async function deductItemsStock(client, items) {
  for (const item of items) {
    await productRepository.deductStock(client, item.productId, item.quantity);
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {Array<{ productId: string; quantity: number }>} items
 */
export async function restoreItemsStock(client, items) {
  for (const item of items) {
    await productRepository.restoreStock(client, item.productId, item.quantity);
  }
}

/**
 * @param {string} userId
 * @param {{ fromCart?: boolean; items?: OrderLineInput[] }} input
 */
export async function createOrder(userId, input) {
  /** @type {OrderLineInput[]} */
  let lineItems = input.items ?? [];

  if (input.fromCart) {
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart) {
      throw new AppError('购物车为空', 'VALIDATION_ERROR', 400);
    }
    const rows = await cartRepository.findItemsByCartId(cart.cart_id);
    if (rows.length === 0) {
      throw new AppError('购物车为空', 'VALIDATION_ERROR', 400);
    }
    lineItems = rows.map((row) => ({
      productId: row.product_id,
      quantity: row.quantity,
    }));
  }

  if (lineItems.length === 0) {
    throw new AppError('订单商品不能为空', 'VALIDATION_ERROR', 400);
  }

  const order = await withTransaction(async (client) => {
    const resolved = await lockAndValidateItems(client, lineItems);
    const totalAmount = resolved.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    await deductItemsStock(client, resolved);

    const orderRow = await orderRepository.createOrder(client, { userId, totalAmount });

    for (const item of resolved) {
      await orderRepository.createOrderItem(client, {
        orderId: orderRow.order_id,
        productId: item.productId,
        productName: item.product.name,
        productCoverUrl: item.product.cover_url,
        price: item.product.price,
        quantity: item.quantity,
      });
    }

    if (input.fromCart) {
      const cart = await cartRepository.findCartByUserId(userId);
      if (cart) {
        await cartRepository.deleteItemsByProductIds(
          cart.cart_id,
          resolved.map((item) => item.productId),
        );
      }
    }

    return orderRow;
  });

  await scheduleOrderExpiry(order.order_id);

  return getOrderDetail(userId, order.order_id);
}

/**
 * @param {string} userId
 * @param {string} orderId
 */
export async function payOrder(userId, orderId) {
  const orderRow = await withTransaction(async (client) => {
    const order = await orderRepository.lockByIdForUpdate(client, orderId);
    if (!order || order.user_id !== userId) {
      throw new AppError('订单不存在', 'NOT_FOUND', 404);
    }
    if (order.status !== 'pending') {
      throw new AppError('订单状态不允许支付', 'ORDER_INVALID_STATE', 400);
    }

    const updated = await orderRepository.markPaid(client, orderId);
    await orderRepository.createPayment(client, {
      orderId,
      amount: order.total_amount,
    });
    return updated;
  });

  await cancelOrderExpiry(orderId);

  return mapOrderWithItems(orderRow, await orderRepository.findItemsByOrderId(orderId));
}

/**
 * @param {string} orderId
 * @param {string} [userId]
 */
export async function cancelOrder(orderId, userId) {
  const orderRow = await withTransaction(async (client) => {
    const order = await orderRepository.lockByIdForUpdate(client, orderId);
    if (!order) {
      throw new AppError('订单不存在', 'NOT_FOUND', 404);
    }
    if (userId && order.user_id !== userId) {
      throw new AppError('订单不存在', 'NOT_FOUND', 404);
    }
    if (order.status !== 'pending') {
      throw new AppError('订单状态不允许取消', 'ORDER_INVALID_STATE', 400);
    }

    const items = await orderRepository.findItemsByOrderIdForUpdate(client, orderId);
    await restoreItemsStock(
      client,
      items.map((item) => ({ productId: item.product_id, quantity: item.quantity })),
    );

    return orderRepository.markCancelled(client, orderId);
  });

  return mapOrderWithItems(orderRow, await orderRepository.findItemsByOrderId(orderId));
}

/**
 * @param {string} orderId
 */
export async function cancelExpiredOrder(orderId) {
  try {
    return await cancelOrder(orderId);
  } catch (err) {
    if (err instanceof AppError && err.code === 'ORDER_INVALID_STATE') {
      return null;
    }
    throw err;
  }
}

/**
 * @param {string} userId
 * @param {string} orderId
 */
export async function getOrderDetail(userId, orderId) {
  const order = await orderRepository.findByIdForUser(orderId, userId);
  if (!order) {
    throw new AppError('订单不存在', 'NOT_FOUND', 404);
  }
  const items = await orderRepository.findItemsByOrderId(orderId);
  return mapOrderWithItems(order, items);
}

/**
 * @param {string} userId
 * @param {{ page?: number; limit?: number }} options
 */
export async function listOrders(userId, options = {}) {
  const limit = Math.min(options.limit ?? 20, 50);
  const page = Math.max(options.page ?? 1, 1);
  const offset = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    orderRepository.findByUserId(userId, { limit, offset }),
    orderRepository.countByUserId(userId),
  ]);

  return {
    items: rows.map(orderRepository.mapOrderRow),
    total,
    page,
    limit,
    hasMore: offset + rows.length < total,
  };
}

/**
 * @param {object} orderRow
 * @param {object[]} itemRows
 */
function mapOrderWithItems(orderRow, itemRows) {
  return {
    ...orderRepository.mapOrderRow(orderRow),
    items: itemRows.map(orderRepository.mapOrderItemRow),
  };
}
