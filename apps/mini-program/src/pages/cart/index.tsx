import { useState } from 'react';
import { Image as TaroImage, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { Button, Empty, Loading, Price } from '@shiguang/ui-taro';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useTabBarSelected } from '../../hooks/useTabBarSelected';
import { api } from '../../lib/api';
import './index.scss';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function CartPage() {
  useTabBarSelected(1);
  const { isLoggedIn } = useAuth();
  const { cart, loading, isUpdating, refreshCart, upsertItem, removeItem } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  useDidShow(() => {
    void refreshCart();
  });

  const openProductDetail = (productId: string) => {
    Taro.navigateTo({ url: `/pages/product-detail/index?productId=${productId}` });
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;

    setCheckingOut(true);
    try {
      const order = await api.orders.create({ fromCart: true });
      await refreshCart();
      Taro.navigateTo({ url: `/pages/pay/index?orderId=${order.orderId}` });
    } catch (err) {
      Taro.showToast({ title: getErrorMessage(err, '下单失败'), icon: 'none' });
    } finally {
      setCheckingOut(false);
    }
  };

  const handleQuantityChange = async (productId: string, quantity: number) => {
    try {
      await upsertItem(productId, quantity);
    } catch (err) {
      Taro.showToast({ title: getErrorMessage(err, '操作失败'), icon: 'none' });
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch (err) {
      Taro.showToast({ title: getErrorMessage(err, '删除失败'), icon: 'none' });
    }
  };

  if (!isLoggedIn) {
    return (
      <View className="cart-page cart-login safe-bottom">
        <Text className="cart-login-title">登录后查看购物车</Text>
        <Text className="cart-login-desc">同步你在各端加入的商品，一键结算</Text>
        <Button variant="primary" onClick={() => Taro.switchTab({ url: '/pages/profile/index' })}>
          去登录
        </Button>
      </View>
    );
  }

  if (loading) {
    return <Loading tip="加载购物车…" block />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View className="cart-page safe-bottom">
        <Empty
          title="购物车是空的"
          description="去首页逛逛好物吧"
          action={
            <Button variant="primary" onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
              去逛逛
            </Button>
          }
        />
      </View>
    );
  }

  return (
    <View className="cart-page">
      <ScrollView className="cart-scroll" scrollY>
        <View className="cart-list">
        {cart.items.map((item) => (
          <View key={item.itemId} className="cart-item">
            <View onClick={() => openProductDetail(item.productId)}>
              {item.product.coverUrl ? (
                <TaroImage
                  className="cart-item-cover"
                  src={item.product.coverUrl}
                  mode="aspectFill"
                />
              ) : (
                <View className="cart-item-cover cart-item-cover--placeholder" />
              )}
            </View>

            <View className="cart-item-body">
              <Text className="cart-item-name" onClick={() => openProductDetail(item.productId)}>
                {item.product.name}
              </Text>
              <Price value={item.product.price} size="sm" />
              <View className="cart-item-actions">
                <View className="cart-stepper">
                  <View
                    className={`cart-stepper-btn ${isUpdating ? 'cart-stepper-btn--disabled' : ''}`}
                    onClick={() => !isUpdating && void handleQuantityChange(item.productId, item.quantity - 1)}
                  >
                    <Text>−</Text>
                  </View>
                  <Text className="cart-stepper-value">{item.quantity}</Text>
                  <View
                    className={`cart-stepper-btn ${
                      isUpdating || item.quantity >= item.product.stock
                        ? 'cart-stepper-btn--disabled'
                        : ''
                    }`}
                    onClick={() =>
                      !isUpdating &&
                      item.quantity < item.product.stock &&
                      void handleQuantityChange(item.productId, item.quantity + 1)
                    }
                  >
                    <Text>+</Text>
                  </View>
                </View>
                <Text
                  className="cart-remove"
                  onClick={() => !isUpdating && void handleRemove(item.itemId)}
                >
                  删除
                </Text>
              </View>
            </View>

            <View className="cart-item-subtotal">
              <Price value={item.subtotal} />
            </View>
          </View>
        ))}
        </View>
      </ScrollView>

      <View className="cart-footer">
        <View className="cart-total">
          <Text>合计</Text>
          <Price value={cart.totalAmount} size="lg" />
        </View>
        <Button variant="primary" block loading={checkingOut} onClick={() => void handleCheckout()}>
          去结算 ({cart.itemCount})
        </Button>
      </View>
    </View>
  );
}
