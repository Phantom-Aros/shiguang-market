import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Cart } from '@shiguang/shared';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  isUpdating: boolean;
  itemCount: number;
  refreshCart: () => Promise<void>;
  upsertItem: (productId: string, quantity: number) => Promise<Cart>;
  removeItem: (itemId: string) => Promise<Cart>;
}

const emptyCart: Cart = { items: [], totalAmount: 0, itemCount: 0 };

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(null);
      return;
    }

    setLoading(true);
    try {
      const data = await api.cart.get();
      setCart(data);
    } catch {
      setCart(emptyCart);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const upsertItem = useCallback(
    async (productId: string, quantity: number) => {
      setIsUpdating(true);
      try {
        const data = await api.cart.upsertItem(productId, quantity);
        setCart(data);
        return data;
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  const removeItem = useCallback(async (itemId: string) => {
    setIsUpdating(true);
    try {
      const data = await api.cart.removeItem(itemId);
      setCart(data);
      return data;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      cart,
      loading,
      isUpdating,
      itemCount: cart?.itemCount ?? 0,
      refreshCart,
      upsertItem,
      removeItem,
    }),
    [cart, loading, isUpdating, refreshCart, upsertItem, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
