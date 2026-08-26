import { AppError } from '../middleware/errorHandler.js';
import { cacheGet, cacheSet, CACHE_TTL } from '../cache/contentCache.js';
import * as productRepository from '../repositories/productRepository.js';

/**
 * @param {number} [limit]
 */
export async function listSamples(limit = 4) {
  const cacheKey = `product:samples:${limit}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await productRepository.findSamples(limit);
  const result = { items: rows.map(productRepository.mapProductRow) };
  await cacheSet(cacheKey, result, CACHE_TTL.PRODUCT_SAMPLES);
  return result;
}

/**
 * @param {string} productId
 */
export async function getProduct(productId) {
  const cacheKey = `product:detail:${productId}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const row = await productRepository.findById(productId);
  if (!row || row.status !== 'active') {
    throw new AppError('商品不存在', 'NOT_FOUND', 404);
  }

  const result = productRepository.mapProductRow(row);
  await cacheSet(cacheKey, result, CACHE_TTL.PRODUCT_DETAIL);
  return result;
}
