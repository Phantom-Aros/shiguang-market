import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@shiguang/api-client';
import { AnalyticsEvents, track } from '@shiguang/shared/analytics';
import { Button, Empty, Icon, Image, Loading, Price, useToast } from '@shiguang/ui';
import { AiChatDrawer } from '../components/AiChatDrawer';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import { productQueryKey } from '../lib/queryClient';
import styles from './ProductDetail.module.css';

export function ProductDetailPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { productId = '' } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [aiOpen, setAiOpen] = useState(false);
  const { upsertItem, isUpdating } = useCart();

  const productQuery = useQuery({
    queryKey: productQueryKey(productId),
    queryFn: () => api.products.get(productId),
    enabled: Boolean(productId),
  });

  useEffect(() => {
    if (!productId) return;
    track(AnalyticsEvents.DETAIL_VIEW, { type: 'product', productId });
  }, [productId]);

  async function handleAddToCart() {
    try {
      await upsertItem({ productId, quantity });
      track(AnalyticsEvents.ADD_CART, { productId, quantity, source: 'product_detail' });
      toast.show('已加入购物车', 'success');
    } catch {
      // error handled in hook
    }
  }

  async function handleBuyNow() {
    try {
      await upsertItem({ productId, quantity });
      navigate('/checkout');
    } catch {
      // error handled in hook
    }
  }

  if (productQuery.isLoading) {
    return <Loading tip="加载中…" block />;
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <Empty
        title="商品不存在"
        description="商品可能已下架"
        action={
          <Button variant="primary" onClick={() => navigate(-1)}>
            返回
          </Button>
        }
      />
    );
  }

  const product = productQuery.data;
  const maxQuantity = Math.max(product.stock, 1);

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate(-1)}>
        <Icon name="chevronRight" size={18} className={styles.backIcon} />
        返回
      </button>

      <div className={styles.cover}>
        {product.coverUrl ? (
          <Image src={product.coverUrl} alt={product.name} aspectRatio="1 / 1" />
        ) : (
          <div className={styles.coverPlaceholder}>
            <Icon name="image" size={48} />
          </div>
        )}
      </div>

      <section className={styles.info}>
        <Price value={product.price} originalValue={product.originalPrice ?? undefined} size="lg" />
        <h1 className={styles.name}>{product.name}</h1>
        {product.description && <p className={styles.description}>{product.description}</p>}
        <p className={styles.stock}>库存 {product.stock} 件</p>
        <button
          type="button"
          className={styles.askAiBtn}
          onClick={() => {
            if (!isAuthenticated) {
              navigate('/login', { state: { from: `/products/${productId}` } });
              return;
            }
            setAiOpen(true);
          }}
        >
          <Icon name="search" size={16} />
          问 AI
        </button>
      </section>

      <section className={styles.quantity}>
        <span>数量</span>
        <div className={styles.stepper}>
          <button
            type="button"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            disabled={quantity >= product.stock}
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          >
            +
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        <Button variant="secondary" loading={isUpdating} onClick={handleAddToCart} data-testid="add-to-cart">
          加入购物车
        </Button>
        <Button
          variant="primary"
          loading={isUpdating}
          disabled={product.stock <= 0}
          onClick={handleBuyNow}
        >
          {product.stock > 0 ? '立即购买' : '已售罄'}
        </Button>
      </footer>

      <AiChatDrawer
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        productId={productId}
        productName={product.name}
      />
    </div>
  );
}
