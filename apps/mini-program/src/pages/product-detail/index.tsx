import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import type { ProductDetail } from '@shiguang/shared';
import { Button, Empty, Icon, Image, Loading, Price } from '@shiguang/ui-taro';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { api } from '../../lib/api';
import './index.scss';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function ProductDetailPage() {
  const router = useRouter();
  const productId = router.params.productId ?? '';
  const { isLoggedIn } = useAuth();
  const { upsertItem, isUpdating: cartUpdating } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [updating, setUpdating] = useState(false);
  const actionLoading = updating || cartUpdating;

  useEffect(() => {
    if (!productId) {
      setError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    void api.products
      .get(productId)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setQuantity(1);
        Taro.setNavigationBarTitle({ title: data.name.slice(0, 12) });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const requireLogin = useCallback(() => {
    Taro.showToast({ title: '请先登录', icon: 'none' });
    Taro.switchTab({ url: '/pages/profile/index' });
  }, []);

  const handleAddToCart = async () => {
    if (!product) return;
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    setUpdating(true);
    try {
      await upsertItem(productId, quantity);
      Taro.showToast({ title: '已加入购物车', icon: 'success' });
    } catch (err) {
      Taro.showToast({ title: getErrorMessage(err, '操作失败'), icon: 'none' });
    } finally {
      setUpdating(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || product.stock <= 0) return;
    if (!isLoggedIn) {
      requireLogin();
      return;
    }

    setUpdating(true);
    try {
      const order = await api.orders.create({
        items: [{ productId, quantity }],
      });
      Taro.navigateTo({ url: `/pages/pay/index?orderId=${order.orderId}` });
    } catch (err) {
      Taro.showToast({ title: getErrorMessage(err, '下单失败'), icon: 'none' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <Loading tip="加载中…" block />;
  }

  if (error || !product) {
    return (
      <Empty
        title="商品不存在"
        description="商品可能已下架"
        action={
          <Button variant="primary" onClick={() => Taro.navigateBack()}>
            返回
          </Button>
        }
      />
    );
  }

  const maxQuantity = Math.max(product.stock, 1);

  return (
    <View className="product-page">
      <ScrollView className="product-scroll" scrollY>
        <View className="product-cover">
          {product.coverUrl ? (
            <Image src={product.coverUrl} alt={product.name} aspectRatio="1 / 1" />
          ) : (
            <View className="product-cover-placeholder">
              <Icon name="image" size={48} color="#b2bec3" />
            </View>
          )}
        </View>

        <View className="product-info">
          <Price value={product.price} originalValue={product.originalPrice ?? undefined} size="lg" />
          <Text className="product-name">{product.name}</Text>
          {product.description ? (
            <Text className="product-description">{product.description}</Text>
          ) : null}
          <Text className="product-stock">库存 {product.stock} 件</Text>
          <View
            className="product-ask-ai"
            onClick={() => {
              if (!isLoggedIn) {
                requireLogin();
                return;
              }
              Taro.navigateTo({
                url: `/pages/ai-chat/index?productId=${productId}&productName=${encodeURIComponent(product.name)}`,
              });
            }}
          >
            <Icon name="search" size={16} color="#ff6b4a" />
            <Text className="product-ask-ai-text">问 AI</Text>
          </View>
        </View>

        <View className="product-quantity">
          <Text>数量</Text>
          <View className="product-stepper">
            <View
              className={`product-stepper-btn ${quantity <= 1 ? 'product-stepper-btn--disabled' : ''}`}
              onClick={() => quantity > 1 && setQuantity((q) => q - 1)}
            >
              <Text>−</Text>
            </View>
            <Text className="product-stepper-value">{quantity}</Text>
            <View
              className={`product-stepper-btn ${quantity >= product.stock ? 'product-stepper-btn--disabled' : ''}`}
              onClick={() => quantity < product.stock && setQuantity((q) => Math.min(maxQuantity, q + 1))}
            >
              <Text>+</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="product-footer safe-bottom">
        <View className="product-footer-btn">
          <Button variant="secondary" block loading={actionLoading} onClick={() => void handleAddToCart()}>
            加入购物车
          </Button>
        </View>
        <View className="product-footer-btn">
          <Button
            variant="primary"
            block
            loading={actionLoading}
            disabled={product.stock <= 0}
            onClick={() => void handleBuyNow()}
          >
            {product.stock > 0 ? '立即购买' : '已售罄'}
          </Button>
        </View>
      </View>
    </View>
  );
}
