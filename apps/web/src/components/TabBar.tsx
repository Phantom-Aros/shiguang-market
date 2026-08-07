import { NavLink } from 'react-router-dom';
import { Icon } from '@shiguang/ui';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../hooks/useCart';
import styles from './TabBar.module.css';

export function TabBar() {
  const { isAuthenticated } = useAuth();
  const { itemCount } = useCart();

  return (
    <nav className={styles.bar} aria-label="主导航">
      <NavLink
        to="/"
        end
        className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
      >
        <Icon name="home" size={22} />
        <span className={styles.label}>首页</span>
      </NavLink>
      <NavLink
        to={isAuthenticated ? '/cart' : '/login'}
        className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
      >
        <span className={styles.iconWrap}>
          <Icon name="cart" size={22} />
          {isAuthenticated && itemCount > 0 && (
            <span className={styles.badge}>{itemCount > 99 ? '99+' : itemCount}</span>
          )}
        </span>
        <span className={styles.label}>购物车</span>
      </NavLink>
      <NavLink
        to={isAuthenticated ? '/profile' : '/login'}
        className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
      >
        <Icon name="user" size={22} />
        <span className={styles.label}>{isAuthenticated ? '我的' : '登录'}</span>
      </NavLink>
    </nav>
  );
}
