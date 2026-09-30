import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CheckoutModal } from './CheckoutModal';
import { Order } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { items, totalAmount, removeFromCart, clearCart, isLoading } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCheckoutOpen = () => {
    setIsCheckoutOpen(true);
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={20} color="var(--primary)" /> Your Cart ({items.length})
            </h3>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close Cart">
              <X size={20} />
            </button>
          </div>

          <div className="modal-body">
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                <ShoppingBag size={48} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>Your cart is empty</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                  Browse our academic notes catalog to add courses.
                </div>
                <button className="btn btn-secondary" onClick={onClose}>
                  Browse Courses
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {items.map((item) => (
                    <div
                      key={item.courseId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: 12 }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
                          {item.class} • {item.subject}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.3, margin: '2px 0 4px' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          Rs. {item.price}
                        </div>
                      </div>

                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeFromCart(item.courseId)}
                        disabled={isLoading}
                        title="Remove course"
                        style={{ padding: 8 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={clearCart}
                    disabled={isLoading}
                  >
                    Clear Cart
                  </button>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL AMOUNT</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                      Rs. {totalAmount}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Continue Browsing
              </button>
              <button className="btn btn-primary" onClick={handleCheckoutOpen}>
                Proceed to Checkout <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onOrderSuccess={(order) => {
            setIsCheckoutOpen(false);
            onClose();
            onOrderSuccess(order);
          }}
        />
      )}
    </>
  );
};
