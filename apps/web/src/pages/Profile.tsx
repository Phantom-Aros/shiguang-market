import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon, ThemeSwitcher } from '@shiguang/ui';
import { useAuth } from '../contexts/AuthContext';
import styles from './Profile.module.css';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  if (!user) return null;

  return (
    <section className={styles.card}>
      <h2>个人中心</h2>
      <div className={styles.info}>
        <div className={styles.avatar}>{user.nickname?.[0] ?? '用'}</div>
        <div>
          <p className={styles.nickname}>{user.nickname ?? '未设置昵称'}</p>
          <p className={styles.meta}>ID：{user.userId}</p>
          {user.phone && <p className={styles.meta}>手机：{user.phone}</p>}
          <p className={styles.meta}>
            注册：{new Date(user.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>常用功能</p>
        <div className={styles.menuGroup}>
          <Link to="/orders" className={styles.menuItem}>
            <span className={styles.menuIcon} aria-hidden>
              <Icon name="order" size={20} />
            </span>
            <span className={styles.menuContent}>
              <span className={styles.menuLabel}>我的订单</span>
              <span className={styles.menuDesc}>查看全部订单与物流状态</span>
            </span>
            <Icon name="chevronRight" size={20} className={styles.menuArrow} />
          </Link>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>外观</p>
        <ThemeSwitcher />
      </div>

      <Button variant="danger" block loading={loggingOut} onClick={handleLogout}>
        退出登录
      </Button>
    </section>
  );
}
