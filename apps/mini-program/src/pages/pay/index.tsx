import { useCallback, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { Button, Loading, Price } from '@shiguang/ui-taro';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import './index.scss';

/**
 * 模拟支付页：演示小程序端下单支付流程。
 * 真实微信支付需接入 wx.requestPayment，详见 docs/mini-program.md
 */
export default function PayPage() {
  const router = useRouter();
  const productId = router.params.productId;
  const { isLoggedIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [productName, setProductName] = useState<string | null>(null);

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

      const product = await api.products.get(targetProductId);
      setProductName(product.name);

      const order = await api.orders.create({
        items: [{ productId: targetProductId, quantity: 1 }],
      });
      setOrderId(order.orderId);
      setTotalAmount(order.totalAmount);
      Taro.showToast({ title: '订单已创建', icon: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建订单失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, productId]);

  const mockPay = async () => {
    if (!orderId) return;
    setPaying(true);
    try {
      await api.orders.pay(orderId);
      Taro.showToast({ title: '模拟支付成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '支付失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setPaying(false);
    }
  };

  return (
    <View className="pay-page safe-bottom">
      <View className="pay-header">
        <Text className="pay-title">模拟支付</Text>
        <Text className="pay-desc">
          本页为练手 Mock 流程。真实环境需后端调用微信统一下单接口，前端使用 wx.requestPayment 唤起支付。
        </Text>
      </View>

      {orderId ? (
        <View className="pay-order">
          <Text className="pay-order-label">待支付订单</Text>
          {productName ? <Text className="pay-order-product">{productName}</Text> : null}
          <Text className="pay-order-id">{orderId}</Text>
          <Price value={totalAmount} size="lg" />
        </View>
      ) : (
        <View className="pay-placeholder">
          <Text>
            {productId ? '点击下方按钮为活动商品创建订单' : '点击下方按钮创建演示订单'}
          </Text>
        </View>
      )}

      <View className="pay-actions">
        {!orderId ? (
          <Button variant="primary" block loading={loading} onClick={() => void createDemoOrder()}>
            {productId ? '创建活动商品订单' : '创建演示订单'}
          </Button>
        ) : (
          <Button variant="primary" block loading={paying} onClick={() => void mockPay()}>
            模拟支付成功
          </Button>
        )}
      </View>
    </View>
  );
}
