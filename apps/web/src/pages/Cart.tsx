import { useNavigate } from 'react-router-dom';
import { Button, Empty, Loading, Price } from '@shiguang/ui';
import { useCart } from '../hooks/useCart';
import styles from './Cart.module.css';

export function CartPage() {
  const navigate = useNavigate();
  const { cart, isLoading, upsertItem, removeItem, isUpdating } = useCart();

  if (isLoading) {
    return <Loading tip="加载购物车…" block />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Empty
        title="购物车是空的"
        description="去首页逛逛好物吧"
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
        {cart.items.map((item) => (
          <li key={item.itemId} className={styles.item}>
            {item.product.coverUrl && (
              <img src={item.product.coverUrl} alt="" className={styles.cover} />
            )}
            <div className={styles.info}>
              <p className={styles.name}>{item.product.name}</p>
              <Price value={item.product.price} />
              <div className={styles.actions}>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() =>
                      upsertItem({ productId: item.productId, quantity: item.quantity - 1 })
                    }
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    disabled={isUpdating || item.quantity >= item.product.stock}
                    onClick={() =>
                      upsertItem({ productId: item.productId, quantity: item.quantity + 1 })
                    }
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.remove}
                  disabled={isUpdating}
                  onClick={() => removeItem(item.itemId)}
                >
                  删除
                </button>
              </div>
            </div>
            <p className={styles.subtotal}>
              <Price value={item.subtotal} />
            </p>
          </li>
        ))}
      </ul>

      <footer className={styles.footer}>
        <div className={styles.total}>
          <span>合计</span>
          <Price value={cart.totalAmount} size="lg" />
        </div>
        <Button variant="primary" block onClick={() => navigate('/checkout')}>
          去结算 ({cart.itemCount})
        </Button>
      </footer>
    </div>
  );
}
