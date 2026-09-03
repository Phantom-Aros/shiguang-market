import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import './app.scss';

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    console.log('拾光市集小程序启动');
  });

  return (
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  );
}

export default App;
