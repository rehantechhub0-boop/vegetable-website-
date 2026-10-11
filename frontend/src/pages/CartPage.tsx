import type React from 'react';
import { ShoppingBag, ArrowLeft, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Truck, Sparkles, Scale } from 'lucide-react';
import type { CartEntry } from '../components/VegetableCard';

interface CartPageProps {
  cart: CartEntry[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onNavigateShop: () => void;
  onNavigateCheckout: () => void;
  onNavigateProduct?: (slug: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onNavigateShop,
  onNavigateCheckout,
  onNavigateProduct,
}) => {
  const subtotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <main className="cart-page-wrapper" id="cart-main">
        <div className="container cart-empty-container">
          <div className="cart-empty-card">
            <div className="cart-empty-icon-wrap" aria-hidden="true">
              <ShoppingBag size={48} className="cart-empty-icon" />
            </div>
            <h1 className="cart-empty-title">Your cart is empty</h1>
            <p className="cart-empty-subtitle">
              Add fresh vegetables to your cart and they&apos;ll appear here.
            </p>
            <button
              type="button"
              id="cart-browse-btn"
              className="btn btn-primary cart-browse-btn"
              onClick={onNavigateShop}
            >
              Browse Vegetables
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page-wrapper" id="cart-main">
      <div className="container cart-container">
        {/* Header Breadcrumb & Titles */}
        <header className="cart-header">
          <nav aria-label="Breadcrumb" className="cart-breadcrumb">
            <button
              type="button"
              className="cart-breadcrumb-btn"
              onClick={onNavigateShop}
            >
              <ArrowLeft size={16} />
              Continue Shopping
            </button>
          </nav>
          <div className="cart-title-row">
            <div>
              <h1 className="cart-main-heading">Your Cart</h1>
              <p className="cart-subheading">Review your vegetables before checkout.</p>
            </div>
            <div className="cart-badge-count">
              <span className="badge badge-fresh">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
        </header>

        {/* 2-Column Grid Layout */}
        <div className="cart-grid-layout">
          {/* LEFT: Cart Items Column */}
          <section className="cart-items-column" aria-label="Cart Items">
            <div className="cart-items-list" role="list">
              {cart.map((item) => {
                const veg = item.vegetable;
                const effectivePricePerKg = veg.isOffer && veg.offerPrice ? veg.offerPrice : veg.pricePerKg;
                
                // Fallback image handling
                const imageUrl =
                  veg?.images?.find((img) => img.isPrimary)?.url ||
                  veg?.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';

                return (
                  <article
                    key={item.id}
                    className="cart-item-card"
                    role="listitem"
                    aria-label={`${veg.name} (${item.weightDisplay})`}
                  >
                    {/* Item Image */}
                    <div
                      className="cart-item-image-wrapper"
                      onClick={() => onNavigateProduct && veg.slug && onNavigateProduct(veg.slug)}
                      role={onNavigateProduct ? 'button' : undefined}
                      tabIndex={onNavigateProduct ? 0 : undefined}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && onNavigateProduct && veg.slug) {
                          e.preventDefault();
                          onNavigateProduct(veg.slug);
                        }
                      }}
                      title={onNavigateProduct ? `View ${veg.name}` : undefined}
                    >
                      <img
                        src={imageUrl}
                        alt={veg.name || 'Vegetable'}
                        className="cart-item-img"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>

                    {/* Item Details Info */}
                    <div className="cart-item-content">
                      <div className="cart-item-top-row">
                        <div>
                          <h2
                            className="cart-item-title"
                            onClick={() => onNavigateProduct && veg.slug && onNavigateProduct(veg.slug)}
                            style={{ cursor: onNavigateProduct ? 'pointer' : 'default' }}
                          >
                            {veg.name}
                          </h2>
                          <div className="cart-item-weight-badge">
                            <Scale size={13} className="cart-item-scale-icon" />
                            <span>{item.weightDisplay}</span>
                          </div>
                        </div>

                        {/* Remove Action */}
                        <button
                          type="button"
                          className="cart-item-remove-btn"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${veg.name} from cart`}
                        >
                          <Trash2 size={16} />
                          <span className="cart-remove-text">Remove</span>
                        </button>
                      </div>

                      {/* Pricing Specs */}
                      <div className="cart-item-pricing-meta">
                        <span className="cart-meta-pill">
                          Rs. {effectivePricePerKg.toLocaleString()} / kg
                        </span>
                        <span className="cart-meta-separator">•</span>
                        <span className="cart-meta-pill">
                          Unit: Rs. {item.unitPrice.toLocaleString()}
                        </span>
                      </div>

                      {/* Bottom Controls: Quantity + Line Total */}
                      <div className="cart-item-bottom-row">
                        {/* Quantity Counter */}
                        <div className="cart-qty-counter" aria-label={`Quantity for ${veg.name}`}>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            disabled={item.quantity <= 1}
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            aria-label={`Decrease quantity of ${veg.name}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="cart-qty-value" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            aria-label={`Increase quantity of ${veg.name}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="cart-item-line-total-wrap">
                          <span className="cart-line-total-label">Total:</span>
                          <span className="cart-line-total-price">
                            Rs. {item.itemTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Under items: Continue shopping banner */}
            <div className="cart-continue-banner">
              <button
                type="button"
                className="btn btn-outline cart-continue-btn"
                onClick={onNavigateShop}
              >
                <ArrowLeft size={16} />
                Continue Shopping
              </button>
              <span className="cart-freshness-note">
                <Sparkles size={14} color="var(--accent-500)" />
                All vegetables handpicked fresh before delivery
              </span>
            </div>
          </section>

          {/* RIGHT: Order Summary Card */}
          <aside className="cart-summary-column" aria-label="Order Summary">
            <div className="cart-summary-card">
              <h2 className="cart-summary-title">Order Summary</h2>

              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span className="cart-summary-label">Subtotal</span>
                  <span className="cart-summary-val" id="cart-subtotal-val">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="cart-summary-row">
                  <span className="cart-summary-label">Delivery</span>
                  <span className="cart-summary-delivery-val">
                    Calculated at checkout
                  </span>
                </div>

                <div className="cart-summary-divider" role="separator" />

                <div className="cart-summary-row cart-summary-total-row">
                  <span className="cart-summary-total-label">Total</span>
                  <span className="cart-summary-total-val" id="cart-total-val">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                type="button"
                id="cart-proceed-checkout-btn"
                className="btn btn-primary cart-checkout-btn"
                onClick={onNavigateCheckout}
              >
                Proceed to Checkout
                <ArrowRight size={18} />
              </button>

              {/* Trust Badges in Summary */}
              <div className="cart-trust-badges">
                <div className="cart-trust-item">
                  <Truck size={16} className="cart-trust-icon" />
                  <span>Doorstep delivery in Muzaffargarh</span>
                </div>
                <div className="cart-trust-item">
                  <ShieldCheck size={16} className="cart-trust-icon" />
                  <span>Cash on delivery available</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};
