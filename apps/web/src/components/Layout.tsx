import { Outlet, useLocation, useMatch } from 'react-router-dom';
import { TabBar } from './TabBar';
import styles from './Layout.module.css';

const PAGE_TITLES: Record<string, string> = {
  '/': '发现好物',
  '/cart': '购物车',
  '/checkout': '确认订单',
  '/orders': '我的订单',
  '/profile': '我的',
  '/login': '登录',
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith('/posts/')) return '';
  if (pathname.startsWith('/products/')) return '';
  if (pathname.match(/^\/orders\/[^/]+\/pay$/)) return '支付订单';
  if (pathname.startsWith('/orders/')) return '订单详情';
  return PAGE_TITLES[pathname] ?? '拾光市集';
}

export function Layout() {
  const { pathname } = useLocation();
  const isPostDetail = Boolean(useMatch('/posts/:postId'));
  const isProductDetail = Boolean(useMatch('/products/:productId'));
  const isLogin = pathname === '/login';
  const isCheckout = pathname === '/checkout';
  const isPayOrder = Boolean(useMatch('/orders/:orderId/pay'));
  const isOrderDetail = Boolean(useMatch('/orders/:orderId')) && !isPayOrder;
  const hideChrome = isPostDetail || isProductDetail || isLogin || isCheckout || isPayOrder || isOrderDetail;
  const showTabBar = !hideChrome;
  const showTopBar = !isPostDetail && !isProductDetail;
  const title = getPageTitle(pathname);

  return (
    <div className={styles.shell}>
      {showTopBar && (
        <header className={styles.topBar}>
          <h1 className={styles.title}>{title}</h1>
        </header>
      )}
      <main
        className={`${styles.main} ${showTabBar ? styles.mainWithTab : styles.mainFullBleed}`}
      >
        <Outlet />
      </main>
      {showTabBar && <TabBar />}
    </div>
  );
}
