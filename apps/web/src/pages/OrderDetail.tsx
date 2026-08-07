import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@shiguang/api-client';
import type { OrderStatus } from '@shiguang/shared';
import { Button, Empty, Loading, Price, useToast } from '@shiguang/ui';
import { cartQueryKey, orderQueryKey, ordersQueryKey } from '../lib/queryClient';
import styles from './OrderDetail.module.css';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  cancelled: '已取消',
};

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: orderQueryKey(orderId),
    queryFn: () => api.orders.get(orderId),
    enabled: Boolean(orderId),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.orders.cancel(orderId),
    onSuccess: (order) => {
      queryClient.setQueryData(orderQueryKey(orderId), order);
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      toast.show('订单已取消', 'info');
    },
    onError: (err: Error) => {
      toast.show(err.message || '取消失败', 'error');
    },
  });

  if (orderQuery.isLoading) {
    return <Loading tip="加载订单…" block />;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <Empty
        title="订单不存在"
        action={
          <Button variant="primary" onClick={() => navigate('/orders')}>
            返回订单列表
          </Button>
        }
      />
    );
  }

  const order = orderQuery.data;

  return (
    <div className={styles.page}>
      <section className={styles.statusCard}>
        <p className={`${styles.status} ${styles[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </p>
        <p className={styles.orderId}>订单号 {order.orderId}</p>
        <p className={styles.time}>
          下单时间：{new Date(order.createdAt).toLocaleString('zh-CN')}
        </p>
        {order.paidAt && (
          <p className={styles.time}>
            支付时间：{new Date(order.paidAt).toLocaleString('zh-CN')}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2>商品信息</h2>
        <ul className={styles.list}>
          {order.items.map((item) => (
            <li key={item.itemId} className={styles.item}>
              {item.productCoverUrl && (
                <img src={item.productCoverUrl} alt="" className={styles.cover} />
              )}
              <div className={styles.info}>
                <p className={styles.name}>{item.productName}</p>
                <p className={styles.meta}>
                  <Price value={item.price} /> x {item.quantity}
                </p>
              </div>
              <Price value={item.subtotal} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <div className={styles.row}>
          <span>商品总额</span>
          <Price value={order.totalAmount} size="lg" />
        </div>
      </section>

      {order.status === 'pending' && (
        <footer className={styles.footer}>
          <Button variant="ghost" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>
            取消订单
          </Button>
          <Button variant="primary" onClick={() => navigate(`/orders/${orderId}/pay`)}>
            去支付
          </Button>
        </footer>
      )}
    </div>
  );
}
