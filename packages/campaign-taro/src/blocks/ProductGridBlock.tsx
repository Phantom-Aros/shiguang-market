import { useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';
import type { ProductDetail } from '@shiguang/shared';
import type { ProductGridBlock as ProductGridBlockType } from '@shiguang/campaign-schema';
import { Empty, Image, Loading, Price } from '@shiguang/ui-taro';
import './ProductGridBlock.scss';

export interface ProductGridBlockProps {
  block: ProductGridBlockType;
  fetchProducts: (productIds: string[]) => Promise<ProductDetail[]>;
  onProductClick?: (productId: string) => void;
}

export function ProductGridBlock({ block, fetchProducts, onProductClick }: ProductGridBlockProps) {
  const { title, productIds, columns = 2 } = block.props;
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchProducts(productIds)
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchProducts, productIds]);

  return (
    <View className="campaign-product-grid">
      {title ? <Text className="campaign-product-grid__title">{title}</Text> : null}
      {loading ? (
        <Loading tip="加载商品…" />
      ) : products.length === 0 ? (
        <Empty title="暂无商品" description="请检查活动配置" />
      ) : (
        <View
          className="campaign-product-grid__list"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {products.map((product) => (
            <View
              key={product.productId}
              className="campaign-product-grid__card"
              onClick={() => onProductClick?.(product.productId)}
            >
              <Image
                src={product.coverUrl ?? ''}
                aspectRatio="1 / 1"
                className="campaign-product-grid__image"
              />
              <View className="campaign-product-grid__info">
                <Text className="campaign-product-grid__name">{product.name}</Text>
                <Price
                  value={product.price}
                  originalValue={product.originalPrice ?? undefined}
                  size="sm"
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
