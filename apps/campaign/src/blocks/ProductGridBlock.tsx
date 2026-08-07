import { useQuery } from '@tanstack/react-query';
import type { ProductDetail } from '@shiguang/shared';
import type { ProductGridBlock as ProductGridBlockType } from '@shiguang/campaign-schema';
import { api } from '@shiguang/api-client';
import { Empty, Loading, Price, Image } from '@shiguang/ui';
import styles from './ProductGridBlock.module.css';

const WEB_ORIGIN = import.meta.env.VITE_WEB_ORIGIN ?? 'http://localhost:5173';

const PREVIEW_ID_PATTERN = /^(placeholder|preview)-/;

function isPreviewOnlyProductIds(productIds: string[]) {
  return productIds.every((id) => PREVIEW_ID_PATTERN.test(id));
}

/** 搭建器预览用占位商品（无需请求接口） */
const PREVIEW_PRODUCTS: ProductDetail[] = [
  {
    productId: 'preview-1',
    name: '复古牛仔外套',
    description: null,
    coverUrl: 'https://picsum.photos/seed/sg-preview-1/400/400',
    price: 15900,
    originalPrice: 22900,
    stock: 50,
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    productId: 'preview-2',
    name: '无线降噪耳机',
    description: null,
    coverUrl: 'https://picsum.photos/seed/sg-preview-2/400/400',
    price: 39900,
    originalPrice: 49900,
    stock: 30,
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    productId: 'preview-3',
    name: '保湿面霜 50ml',
    description: null,
    coverUrl: 'https://picsum.photos/seed/sg-preview-3/400/400',
    price: 12800,
    originalPrice: 16800,
    stock: 80,
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    productId: 'preview-4',
    name: '轻量徒步背包 20L',
    description: null,
    coverUrl: 'https://picsum.photos/seed/sg-preview-4/400/400',
    price: 19900,
    originalPrice: 25900,
    stock: 40,
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

async function fetchProducts(productIds: string[], isPreview: boolean): Promise<ProductDetail[]> {
  // 搭建器预览：占位 ID 或任意预览模式均优先走本地 mock，零网络请求
  if (isPreview) {
    if (isPreviewOnlyProductIds(productIds)) {
      return PREVIEW_PRODUCTS.slice(0, productIds.length);
    }
    // 手动填入真实 productId 时尝试拉取，失败则回退 mock
    const results = await Promise.allSettled(productIds.map((id) => api.products.get(id)));
    const loaded = results
      .filter((r): r is PromiseFulfilledResult<ProductDetail> => r.status === 'fulfilled')
      .map((r) => r.value);
    if (loaded.length > 0) return loaded;
    return PREVIEW_PRODUCTS.slice(0, productIds.length);
  }

  const results = await Promise.allSettled(productIds.map((id) => api.products.get(id)));
  const loaded = results
    .filter((r): r is PromiseFulfilledResult<ProductDetail> => r.status === 'fulfilled')
    .map((r) => r.value);

  return loaded;
}

export interface ProductGridBlockProps {
  block: ProductGridBlockType;
  slug: string;
  onBlockClick?: (block: ProductGridBlockType) => void;
}

export function ProductGridBlock({ block, slug, onBlockClick }: ProductGridBlockProps) {
  const { title, productIds, columns = 2 } = block.props;
  const isPreview = slug === 'preview';

  const { data: products, isLoading } = useQuery({
    queryKey: ['campaign-products', productIds, slug],
    queryFn: () => fetchProducts(productIds, isPreview),
    retry: isPreview ? false : 1,
  });

  const handleProductClick = (productId: string) => {
    onBlockClick?.(block);
    if (isPreview || productId.startsWith('preview-')) return;
    window.open(`${WEB_ORIGIN}/products/${productId}?from=campaign&slug=${slug}`, '_blank');
  };

  return (
    <div className={styles.wrap}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {isLoading ? (
        <div className={styles.loading}>
          <Loading size="sm" />
        </div>
      ) : !products?.length ? (
        <Empty title="暂无商品" description="请检查 productIds 是否为有效的商品 ID" />
      ) : (
        <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {products.map((product) => (
            <button
              key={product.productId}
              type="button"
              className={styles.card}
              onClick={() => handleProductClick(product.productId)}
            >
              <Image
                src={product.coverUrl ?? ''}
                alt={product.name}
                aspectRatio="1 / 1"
                className={styles.image}
              />
              <div className={styles.info}>
                <p className={styles.name}>{product.name}</p>
                <Price value={product.price} originalValue={product.originalPrice ?? undefined} size="sm" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
