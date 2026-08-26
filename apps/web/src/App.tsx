import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, ToastProvider } from '@shiguang/ui';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { PageLoader } from './components/PageLoader';
import { ProtectedRoute } from './components/ProtectedRoute';
import { queryClient } from './lib/queryClient';
import './App.css';

const HomePage = lazy(() => import('./pages/Home').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('./pages/Login').then((m) => ({ default: m.LoginPage })));
const PostDetailPage = lazy(() =>
  import('./pages/PostDetail').then((m) => ({ default: m.PostDetailPage })),
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetail').then((m) => ({ default: m.ProductDetailPage })),
);
const CartPage = lazy(() => import('./pages/Cart').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() =>
  import('./pages/Checkout').then((m) => ({ default: m.CheckoutPage })),
);
const PayOrderPage = lazy(() =>
  import('./pages/PayOrder').then((m) => ({ default: m.PayOrderPage })),
);
const OrdersPage = lazy(() => import('./pages/Orders').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() =>
  import('./pages/OrderDetail').then((m) => ({ default: m.OrderDetailPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/Profile').then((m) => ({ default: m.ProfilePage })),
);

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <Routes>
                  <Route element={<Layout />}>
                    <Route
                      index
                      element={
                        <Lazy>
                          <HomePage />
                        </Lazy>
                      }
                    />
                    <Route
                      path="posts/:postId"
                      element={
                        <Lazy>
                          <PostDetailPage />
                        </Lazy>
                      }
                    />
                    <Route
                      path="products/:productId"
                      element={
                        <Lazy>
                          <ProductDetailPage />
                        </Lazy>
                      }
                    />
                    <Route
                      path="login"
                      element={
                        <Lazy>
                          <LoginPage />
                        </Lazy>
                      }
                    />
                    <Route
                      path="cart"
                      element={
                        <ProtectedRoute>
                          <Lazy>
                            <CartPage />
                          </Lazy>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="checkout"
                      element={
                        <ProtectedRoute>
                          <Lazy>
                            <CheckoutPage />
                          </Lazy>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="orders"
                      element={
                        <ProtectedRoute>
                          <Lazy>
                            <OrdersPage />
                          </Lazy>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="orders/:orderId"
                      element={
                        <ProtectedRoute>
                          <Lazy>
                            <OrderDetailPage />
                          </Lazy>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="orders/:orderId/pay"
                      element={
                        <ProtectedRoute>
                          <Lazy>
                            <PayOrderPage />
                          </Lazy>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="profile"
                      element={
                        <ProtectedRoute>
                          <Lazy>
                            <ProfilePage />
                          </Lazy>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
