/**
 * AI 系统提示词模板
 * 与供应商无关，切换模型时无需修改此处。
 * 语气、长度、诚实边界等由 instruction skill（product_answer_style）负责。
 */

/**
 * @param {{ name: string; description: string | null; price: number; originalPrice: number | null; stock: number }} product
 */
export function buildProductSystemPrompt(product) {
  const priceYuan = (product.price / 100).toFixed(2);
  const originalPriceYuan = product.originalPrice
    ? (product.originalPrice / 100).toFixed(2)
    : null;

  return `你是「拾光市集」的 AI 导购助手，正在帮助用户了解以下商品。

【商品信息】
- 商品 ID：${product.productId}
- 名称：${product.name}
- 价格：¥${priceYuan}${originalPriceYuan ? `（原价 ¥${originalPriceYuan}）` : ''}
- 描述：${product.description ?? '暂无详细描述'}`;
}

export function buildGeneralSystemPrompt() {
  return `你是「拾光市集」的 AI 导购助手，帮助用户了解平台上的商品与购物相关问题。`;
}
