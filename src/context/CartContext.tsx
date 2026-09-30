import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { CartItemDetail } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface CartContextType {
  items: CartItemDetail[];
  totalAmount: number;
  totalItems: number;
  isLoading: boolean;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (courseId: string) => Promise<void>;
  removeFromCart: (courseId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, clerkUserId, openGoogleSignIn, pendingCourseToAdd, setPendingCourseToAdd } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<CartItemDetail[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || !clerkUserId) {
      setItems([]);
      setTotalAmount(0);
      return;
    }
    try {
      setIsLoading(true);
      const data = await api.getCart();
      setItems(data.items || []);
      setTotalAmount(data.totalAmount || 0);
    } catch (err: any) {
      console.error('Error loading cart:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, clerkUserId]);

  // Load cart whenever authentication status or user changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setItems([]);
      setTotalAmount(0);
    }
  }, [isAuthenticated, clerkUserId, refreshCart]);

  // Handle auto-adding pending course after user signs in with Google
  useEffect(() => {
    if (isAuthenticated && pendingCourseToAdd) {
      const courseId = pendingCourseToAdd;
      setPendingCourseToAdd(null);
      api
        .addToCart(courseId)
        .then(() => {
          showToast('Course added to your cart!', 'success');
          refreshCart();
          setIsCartOpen(true);
        })
        .catch((err) => {
          showToast(err.message || 'Failed to add course to cart', 'error');
        });
    }
  }, [isAuthenticated, pendingCourseToAdd, setPendingCourseToAdd, showToast, refreshCart]);

  const addToCart = async (courseId: string) => {
    if (!isAuthenticated) {
      // Trigger Clerk Google sign-in
      showToast('Please continue with Google to add to your cart', 'info');
      openGoogleSignIn(courseId);
      return;
    }

    try {
      setIsLoading(true);
      await api.addToCart(courseId);
      await refreshCart();
      showToast('Course added to your cart', 'success');
      setIsCartOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Could not add item to cart', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (courseId: string) => {
    try {
      setIsLoading(true);
      await api.removeFromCart(courseId);
      await refreshCart();
      showToast('Item removed from cart', 'info');
    } catch (err: any) {
      showToast(err.message || 'Could not remove item', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setIsLoading(true);
      await api.clearCart();
      await refreshCart();
    } catch (err: any) {
      showToast(err.message || 'Could not clear cart', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalAmount,
        totalItems: items.length,
        isLoading,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        addToCart,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
