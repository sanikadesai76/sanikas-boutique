
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type CartItem = {
  id: number;
  productId: number;
  variantId: number | null;
  name: string;
  size: string | null;
  price: number;
  imageUrl?: string | null;
  quantity: number;
};

type AddToCartProduct = {
  id: number;
  name: string;
  price: number;
  imageUrl?: string | null;
  variantId?: number | null;
  size?: string | null;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (
    product: AddToCartProduct,
    quantity?: number,
  ) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  updateQuantity: (
    cartItemId: number,
    quantity: number,
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  syncCart: () => Promise<void>;
  isCartLoading: boolean;
};

type BackendCartItem = {
  id: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: string | number;
    imageUrl?: string | null;
  };
  variant: {
    id: number;
    size: string;
    stock: number;
  } | null;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(false);

  const syncCart = useCallback(async () => {
    const token = getToken();

    if (!token) return;

    setIsCartLoading(true);

    try {
      const response = await fetch(`${API_URL}/cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) return;
      if (!response.ok) throw new Error('Failed to load cart');

      const items: BackendCartItem[] = await response.json();

      setCart(
        items.map((item) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.product.name,
          size: item.variant?.size ?? null,
          price: Number(item.product.price),
          imageUrl: item.product.imageUrl,
          quantity: item.quantity,
        })),
      );
    } catch (error) {
      console.error('Could not sync cart:', error);
    } finally {
      setIsCartLoading(false);
    }
  }, []);

  useEffect(() => {
    void syncCart();
  }, [syncCart]);

  async function addToCart(
    product: AddToCartProduct,
    quantity = 1,
  ): Promise<void> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      console.error('Cart quantity must be a positive integer.');
      return;
    }

    const variantId = product.variantId ?? null;
    const size = product.size ?? null;
    const token = getToken();

    if (token) {
      try {
        const response = await fetch(`${API_URL}/cart/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: product.id,
            variantId,
            quantity,
          }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Could not add product to saved cart');
        }

        await syncCart();
        return;
      } catch (error) {
        console.error('Could not add product to cart:', error);
        return;
      }
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) =>
          item.productId === product.id &&
          item.variantId === variantId,
      );

      if (existing) {
        return currentCart.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      const guestItemId =
        -Date.now() - Math.floor(Math.random() * 1000);

      return [
        ...currentCart,
        {
          id: guestItemId,
          productId: product.id,
          variantId,
          name: product.name,
          size,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity,
        },
      ];
    });
  }

  async function removeFromCart(cartItemId: number): Promise<void> {
    const token = getToken();

    if (token) {
      try {
        const response = await fetch(
          `${API_URL}/cart/items/${cartItemId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error('Could not remove cart item');
        }

        await syncCart();
        return;
      } catch (error) {
        console.error('Could not remove cart item:', error);
        return;
      }
    }

    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== cartItemId),
    );
  }

  async function updateQuantity(
    cartItemId: number,
    quantity: number,
  ): Promise<void> {
    if (!Number.isInteger(quantity) || quantity < 1) return;

    const token = getToken();

    if (token) {
      try {
        const response = await fetch(
          `${API_URL}/cart/items/${cartItemId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ quantity }),
          },
        );

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Could not update cart quantity');
        }

        await syncCart();
        return;
      } catch (error) {
        console.error('Could not update cart quantity:', error);
        return;
      }
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === cartItemId ? { ...item, quantity } : item,
      ),
    );
  }

  async function clearCart(): Promise<void> {
    const token = getToken();

    if (token) {
      try {
        const response = await fetch(`${API_URL}/cart`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Could not clear saved cart');
        }
      } catch (error) {
        console.error('Could not clear cart:', error);
        return;
      }
    }

    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncCart,
        isCartLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
}
