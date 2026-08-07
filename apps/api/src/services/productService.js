import { AppError } from '../middleware/errorHandler.js';
import * as productRepository from '../repositories/productRepository.js';

/**
 * @param {number} [limit]
 */
export async function listSamples(limit = 4) {
  const rows = await productRepository.findSamples(limit);
  return { items: rows.map(productRepository.mapProductRow) };
}

/**
 * @param {string} productId
 */
export async function getProduct(productId) {
  const row = await productRepository.findById(productId);
  if (!row || row.status !== 'active') {
    throw new AppError('商品不存在', 'NOT_FOUND', 404);
  }
  return productRepository.mapProductRow(row);
}
