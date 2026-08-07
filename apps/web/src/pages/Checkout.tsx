import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@shiguang/api-client';
import { AnalyticsEvents, track } from '@shiguang/shared/analytics';
import { Button, Loading, Price, useToast } from '@shiguang/ui';
import { useCart } from '../hooks/useCart';
import { cartQueryKey } from '../lib/queryClient';
import styles from './Checkout.module.css';

export function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { cart, isLoading } = useCart();

  const createOrderMutation = useMutation({
    mutationFn: () => api.orders.create({ fromCart: true }),
    onSuccess: (order) => {
      track(AnalyticsEvents.ORDER_SUBMIT, {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
      });
      navigate(`/orders/${order.orderId}/pay`, { replace: true });
      queryClient.setQueryData(cartQueryKey, { items: [], totalAmount: 0, itemCount: 0 });
    },
    onError: (err: Error) => {
      toast.show(err.message || '下单失败', 'error');
    },
  });

  useEffect(() => {
    if (isLoading || createOrderMutation.isPending || createOrderMutation.isSuccess) return;
    if (!cart || cart.items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [cart, isLoading, createOrderMutation.isPending, createOrderMutation.isSuccess, navigate]);

  if (isLoading || createOrderMutation.isPending) {
    return <Loading tip={createOrderMutation.isPending ? '提交订单中…' : '加载订单信息…'} block />;
  }

  if (!cart || cart.items.length === 0) {
    return null;
  }

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2>商品清单</h2>
        <ul className={styles.list}>
          {cart.items.map((item) => (
            <li key={item.itemId} className={styles.item}>
              {item.product.coverUrl && (
                <img src={item.product.coverUrl} alt="" className={styles.cover} />
              )}
              <div className={styles.info}>
                <p className={styles.name}>{item.product.name}</p>
                <p className={styles.meta}>x{item.quantity}</p>
              </div>
              <Price value={item.subtotal} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>金额明细</h2>
        <div className={styles.row}>
          <span>商品总额</span>
          <Price value={cart.totalAmount} />
        </div>
        <div className={styles.row}>
          <span>运费</span>
          <span className={styles.free}>免运费</span>
        </div>
        <div className={`${styles.row} ${styles.total}`}>
          <span>应付合计</span>
          <Price value={cart.totalAmount} size="lg" />
        </div>
      </section>

      <footer className={styles.footer}>
        <Button
          variant="primary"
          block
          loading={createOrderMutation.isPending}
          onClick={() => createOrderMutation.mutate()}
        >
          提交订单
        </Button>
      </footer>
    </div>
  );
}
