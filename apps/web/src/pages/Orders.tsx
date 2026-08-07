import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@shiguang/api-client';
import type { OrderStatus } from '@shiguang/shared';
import { Button, Empty, Loading, Price } from '@shiguang/ui';
import { ordersQueryKey } from '../lib/queryClient';
import styles from './Orders.module.css';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '待支付',
  paid: '已支付',
  cancelled: '已取消',
};

export function OrdersPage() {
  const navigate = useNavigate();

  const ordersQuery = useQuery({
    queryKey: ordersQueryKey,
    queryFn: () => api.orders.list(),
  });

  if (ordersQuery.isLoading) {
    return <Loading tip="加载订单…" block />;
  }

  if (ordersQuery.isError || !ordersQuery.data || ordersQuery.data.items.length === 0) {
    return (
      <Empty
        title="暂无订单"
        description="去首页发现好物吧"
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            去逛逛
          </Button>
        }
      />
    );
  }

  return (
    <div className={styles.page}>
      <ul className={styles.list}>
        {ordersQuery.data.items.map((order) => (
          <li key={order.orderId}>
            <Link to={`/orders/${order.orderId}`} className={styles.card}>
              <div className={styles.header}>
                <span className={styles.id}>订单 {order.orderId.slice(-8)}</span>
                <span className={`${styles.status} ${styles[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <div className={styles.body}>
                <p className={styles.time}>
                  {new Date(order.createdAt).toLocaleString('zh-CN')}
                </p>
                <Price value={order.totalAmount} />
              </div>
              {order.status === 'pending' && (
                <div className={styles.actions}>
                  <span className={styles.payTip}>请尽快完成支付</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/orders/${order.orderId}/pay`);
                    }}
                  >
                    去支付
                  </Button>
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
