import type React from 'react';
import {
  CheckCircle,
  ShoppingBag,
  ArrowRight,
  Truck,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import type { ConfirmedOrder } from './CheckoutPage';

interface OrderSuccessPageProps {
  order: ConfirmedOrder | null;
  onNavigateShop: () => void;
  onNavigateTracking?: (orderNumber: string, uuid?: string) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  order,
  onNavigateShop,
  onNavigateTracking,
}) => {
  if (!order) {
    return (
      <main className="cart-page-wrapper" id="order-success-main">
        <div className="container cart-empty-container">
          <div className="cart-empty-card">
            <div className="cart-empty-icon-wrap">
              <CheckCircle size={44} />
            </div>
            <h1 className="cart-empty-title">Order Received</h1>
            <p className="cart-empty-subtitle">
              Your order information is being processed. If you just placed an order, please review your recent orders.
            </p>
            <button
              type="button"
              className="btn btn-primary cart-browse-btn"
              onClick={onNavigateShop}
            >
              Continue Shopping
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="order-success-page-wrapper" id="order-success-main">
      <div className="container order-success-container">
        {/* Success Banner */}
        <div className="order-success-hero-card">
          <div className="order-success-icon-badge" aria-hidden="true">
            <CheckCircle size={56} className="order-success-check-icon" />
          </div>
          <h1 className="order-success-title">Order Confirmed!</h1>
          <p className="order-success-subtitle">
            Thank you, <strong>{order.customerName}</strong>! Your fresh vegetable order has been placed successfully and is being prepared for doorstep delivery in Muzaffargarh.
          </p>

          <div className="order-success-meta-chips">
            <div className="order-meta-chip">
              <span className="order-meta-chip-label">Order Number</span>
              <span className="order-meta-chip-value" id="confirmed-order-number">{order.orderNumber}</span>
            </div>
            <div className="order-meta-chip">
              <span className="order-meta-chip-label">Payment</span>
              <span className="order-meta-chip-value">Cash on Delivery (COD)</span>
            </div>
            <div className="order-meta-chip">
              <span className="order-meta-chip-label">Status</span>
              <span className="badge badge-fresh">New Order</span>
            </div>
          </div>
        </div>

        {/* 2-Column Order Receipt Details */}
        <div className="order-success-grid">
          {/* LEFT: Items Ordered */}
          <div className="order-success-card">
            <h2 className="order-card-heading">
              <ShoppingBag size={18} className="order-card-icon" />
              Vegetables Ordered
            </h2>

            <div className="order-confirmed-items-list" role="list">
              {order.items.map((item) => (
                <div key={item.id} className="order-confirmed-item" role="listitem">
                  <div className="order-confirmed-item-img-wrap">
                    <img
                      src={
                        item.vegetableImage ||
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80'
                      }
                      alt={item.vegetableName}
                      className="order-confirmed-item-img"
                    />
                  </div>
                  <div className="order-confirmed-item-info">
                    <span className="order-confirmed-item-name">{item.vegetableName}</span>
                    <div className="order-confirmed-item-meta">
                      <Scale size={13} />
                      <span>{item.weightDisplay}</span>
                      <span>•</span>
                      <span>Qty: {item.quantity}</span>
                      <span>•</span>
                      <span>Rs. {item.pricePerKg} / kg</span>
                    </div>
                  </div>
                  <div className="order-confirmed-item-total">
                    Rs. {item.itemTotal.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Breakdown */}
            <div className="order-success-bill-summary">
              <div className="order-bill-row">
                <span>Subtotal</span>
                <span className="order-bill-val">Rs. {order.subtotal.toLocaleString()}</span>
              </div>
              <div className="order-bill-row">
                <span>Delivery ({order.deliveryZone})</span>
                <span className="order-bill-val">Rs. {order.deliveryFee.toLocaleString()}</span>
              </div>
              <div className="order-bill-divider" />
              <div className="order-bill-row order-bill-total-row">
                <span>Total Amount to Pay</span>
                <span className="order-bill-total-val" id="confirmed-grand-total">
                  Rs. {order.grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Delivery & Instructions Details */}
          <div className="order-success-card">
            <h2 className="order-card-heading">
              <Truck size={18} className="order-card-icon" />
              Delivery Details
            </h2>

            <div className="order-detail-group">
              <span className="order-detail-label">Customer Name</span>
              <p className="order-detail-value">{order.customerName}</p>
            </div>

            <div className="order-detail-group">
              <span className="order-detail-label">Contact Phone</span>
              <p className="order-detail-value">
                <Phone size={14} style={{ display: 'inline', marginRight: 6 }} />
                {order.customerPhone}
              </p>
            </div>

            <div className="order-detail-group">
              <span className="order-detail-label">Delivery Area</span>
              <p className="order-detail-value">
                <MapPin size={14} style={{ display: 'inline', marginRight: 6 }} />
                {order.deliveryZone}
              </p>
            </div>

            <div className="order-detail-group">
              <span className="order-detail-label">Street Address</span>
              <p className="order-detail-value">{order.deliveryAddress}</p>
            </div>

            {order.deliveryNotes && (
              <div className="order-detail-group">
                <span className="order-detail-label">Delivery Notes</span>
                <p className="order-detail-notes">
                  &ldquo;{order.deliveryNotes}&rdquo;
                </p>
              </div>
            )}

            <div className="order-delivery-trust-callout">
              <ShieldCheck size={20} className="order-trust-shield-icon" />
              <div>
                <p className="order-trust-callout-title">Cash on Delivery Verified</p>
                <p className="order-trust-callout-text">
                  Please keep exact cash ready (Rs. {order.grandTotal.toLocaleString()}). Our delivery partner will hand over your packed fresh vegetables.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="order-success-actions">
          <button
            type="button"
            className="btn btn-primary order-continue-shopping-btn"
            onClick={onNavigateShop}
          >
            <ShoppingBag size={18} />
            Continue Shopping
          </button>

          <button
            type="button"
            className="btn btn-outline"
            id="order-success-track-btn"
            onClick={() => {
              if (onNavigateTracking) {
                onNavigateTracking(order.orderNumber, order.uuid);
              }
            }}
          >
            <Clock size={16} />
            Track Order ({order.orderNumber})
          </button>
        </div>
      </div>
    </main>
  );
};
