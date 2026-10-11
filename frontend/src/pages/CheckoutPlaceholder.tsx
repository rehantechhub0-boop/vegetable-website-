import type React from 'react';
import { ArrowLeft, Clock, ShoppingBag } from 'lucide-react';

interface CheckoutPlaceholderProps {
  onNavigateCart: () => void;
  onNavigateShop: () => void;
}

export const CheckoutPlaceholder: React.FC<CheckoutPlaceholderProps> = ({
  onNavigateCart,
  onNavigateShop,
}) => {
  return (
    <main className="cart-page-wrapper" id="checkout-placeholder-main">
      <div className="container cart-empty-container">
        <div className="cart-empty-card" style={{ maxWidth: 540 }}>
          <div className="cart-empty-icon-wrap" style={{ backgroundColor: 'var(--accent-50)', color: 'var(--accent-600)' }}>
            <Clock size={44} />
          </div>
          <h1 className="cart-empty-title">Checkout coming next</h1>
          <p className="cart-empty-subtitle" style={{ maxWidth: 440, marginBottom: '2rem' }}>
            The checkout and delivery details step will be built in the next phase. Your cart selections are safe and preserved.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onNavigateCart}
            >
              <ArrowLeft size={16} />
              Return to Cart
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNavigateShop}
            >
              <ShoppingBag size={16} />
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
