import { useCallback, useEffect, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import type { OrderDetail } from '@shiguang/shared';
import { Button, Loading, Price } from '@shiguang/ui-taro';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import './index.scss';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

/**
 * 模拟支付页：演示小程序端下单支付流程。
 * 真实微信支付需接入 wx.requestPayment，详见 docs/mini-program.md
 */
export default function PayPage() {
  const router = useRouter();
  const productId = router.params.productId;
  const orderIdParam = router.params.orderId;
  const { isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(Boolean(orderIdParam));
  const [paying, setPaying] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const loadOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    try {
      const data = await api.orders.get(orderId);
      setOrder(data);
    } catch (err) {
      Taro.showToast({ title: getErrorMessage(err, '订单加载失败'), icon: 'none' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!orderIdParam) return;
    void loadOrder(orderIdParam);
  }, [loadOrder, orderIdParam]);

  const createDemoOrder = useCallback(async () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      Taro.switchTab({ url: '/pages/profile/index' });
      return;
    }

    setLoading(true);
    try {
      let targetProductId = productId;
      if (!targetProductId) {
        const samples = await api.products.samples(1);
        targetProductId = samples.items[0]?.productId;
      }

      if (!targetProductId) {
        Taro.showToast({ title: '暂无商品', icon: 'none' });
        return;
      }

      const created = await api.orders.create({
        items: [{ productId: targetProductId, quantity: 1 }],
      });
      setOrder(created);
      Taro.showToast({ title: '订单已创建', icon: 'success' });
    } catch (err) {
      Taro.showToast({ title: getErrorMessage(err, '创建订单失败'), icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, productId]);

  const mockPay = async () => {
    if (!order) return;
    setPaying(true);
    try {
      await api.orders.pay(order.orderId);
      Taro.showToast({ title: '模拟支付成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (err) {
      Taro.showToast({ title: getErrorMessage(err, '支付失败'), icon: 'none' });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <Loading tip="加载订单…" block />;
  }

  const productName = order?.items[0]?.productName ?? null;
  const showCreateButton = !order && !orderIdParam;

  return (
    <View className="pay-page safe-bottom">
      <View className="pay-header">
        <Text className="pay-title">模拟支付</Text>
        <Text className="pay-desc">
          本页为练手 Mock 流程。真实环境需后端调用微信统一下单接口，前端使用 wx.requestPayment 唤起支付。
        </Text>
      </View>

      {order ? (
        <View className="pay-order">
          <Text className="pay-order-label">待支付订单</Text>
          {productName ? <Text className="pay-order-product">{productName}</Text> : null}
          {order.items.length > 1 ? (
            <Text className="pay-order-meta">共 {order.items.length} 件商品</Text>
          ) : null}
          <Text className="pay-order-id">{order.orderId}</Text>
          <Price value={order.totalAmount} size="lg" />
        </View>
      ) : (
        <View className="pay-placeholder">
          <Text>
            {productId ? '点击下方按钮为活动商品创建订单' : '点击下方按钮创建演示订单'}
          </Text>
        </View>
      )}

      <View className="pay-actions">
        {showCreateButton ? (
          <Button variant="primary" block loading={loading} onClick={() => void createDemoOrder()}>
            {productId ? '创建活动商品订单' : '创建演示订单'}
          </Button>
        ) : order ? (
          <Button variant="primary" block loading={paying} onClick={() => void mockPay()}>
            模拟支付成功
          </Button>
        ) : null}
      </View>
    </View>
  );
}
