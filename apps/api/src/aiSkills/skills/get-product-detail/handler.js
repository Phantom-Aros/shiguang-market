import * as productRepository from '../../../repositories/productRepository.js';

/**
 * @param {{ productId: string }} args
 * @param {import('../../types.js').AiSkillContext} _ctx
 */
export async function execute({ productId }, _ctx) {
  const row = await productRepository.findById(productId);
  if (!row || row.status !== 'active') {
    return { found: false, productId };
  }

  const product = productRepository.mapProductRow(row);

  return {
    found: true,
    product: {
      productId: product.productId,
      name: product.name,
      description: product.description,
      priceYuan: (product.price / 100).toFixed(2),
      originalPriceYuan: product.originalPrice
        ? (product.originalPrice / 100).toFixed(2)
        : null,
      stock: product.stock,
      inStock: product.stock > 0,
    },
  };
}
