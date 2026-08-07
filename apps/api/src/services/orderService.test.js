import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../middleware/errorHandler.js';
import { lockAndValidateItems } from '../services/orderService.js';
import * as productRepository from '../repositories/productRepository.js';

vi.mock('../repositories/productRepository.js', () => ({
  lockByIdForUpdate: vi.fn(),
}));

describe('orderService.lockAndValidateItems', () => {
  it('库存不足时抛出 INSUFFICIENT_STOCK', async () => {
    const client = {};
    vi.mocked(productRepository.lockByIdForUpdate).mockResolvedValue({
      product_id: '01PRODUCT',
      name: '测试商品',
      cover_url: null,
      price: 9900,
      stock: 1,
      status: 'active',
    });

    await expect(
      lockAndValidateItems(client, [{ productId: '01PRODUCT', quantity: 2 }]),
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      status: 400,
      message: '商品「测试商品」库存不足',
    });
  });

  it('商品不存在时抛出 NOT_FOUND', async () => {
    const client = {};
    vi.mocked(productRepository.lockByIdForUpdate).mockResolvedValue(null);

    await expect(
      lockAndValidateItems(client, [{ productId: '01MISSING', quantity: 1 }]),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('库存充足时返回商品快照', async () => {
    const client = {};
    const product = {
      product_id: '01PRODUCT',
      name: '测试商品',
      cover_url: 'https://example.com/cover.jpg',
      price: 9900,
      stock: 5,
      status: 'active',
    };
    vi.mocked(productRepository.lockByIdForUpdate).mockResolvedValue(product);

    const result = await lockAndValidateItems(client, [
      { productId: '01PRODUCT', quantity: 2 },
    ]);

    expect(result).toEqual([
      {
        productId: '01PRODUCT',
        quantity: 2,
        product,
      },
    ]);
  });
});
