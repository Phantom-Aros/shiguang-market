import { AppError } from '../middleware/errorHandler.js';
import * as cartRepository from '../repositories/cartRepository.js';
import * as productRepository from '../repositories/productRepository.js';

/**
 * @param {string} userId
 */
export async function getCart(userId) {
  const cart = await cartRepository.findCartByUserId(userId);
  if (!cart) {
    return { items: [], totalAmount: 0, itemCount: 0 };
  }

  const rows = await cartRepository.findItemsByCartId(cart.cart_id);
  const items = rows.map(cartRepository.mapCartItemRow);
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, totalAmount, itemCount };
}

/**
 * @param {string} userId
 * @param {{ productId: string; quantity: number }} input
 */
export async function upsertCartItem(userId, input) {
  const product = await productRepository.findById(input.productId);
  if (!product || product.status !== 'active') {
    throw new AppError('商品不存在', 'NOT_FOUND', 404);
  }

  if (input.quantity > product.stock) {
    throw new AppError('库存不足', 'INSUFFICIENT_STOCK', 400);
  }

  const cartId = await cartRepository.getOrCreateCart(userId);

  if (input.quantity <= 0) {
    const existing = await cartRepository.findItemByProduct(cartId, input.productId);
    if (existing) {
      await cartRepository.deleteItem(cartId, existing.item_id);
    }
    return getCart(userId);
  }

  await cartRepository.upsertItem(cartId, input.productId, input.quantity);
  return getCart(userId);
}

/**
 * @param {string} userId
 * @param {string} itemId
 */
export async function removeCartItem(userId, itemId) {
  const cart = await cartRepository.findCartByUserId(userId);
  if (!cart) {
    throw new AppError('购物车为空', 'NOT_FOUND', 404);
  }

  const deleted = await cartRepository.deleteItem(cart.cart_id, itemId);
  if (!deleted) {
    throw new AppError('购物车项不存在', 'NOT_FOUND', 404);
  }

  return getCart(userId);
}
