import React, { useState, useMemo } from 'react';
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
  Copy,
  Check,
} from 'lucide-react';
import type { ConfirmedOrder } from './CheckoutPage';

interface OrderSuccessPageProps {
  order: ConfirmedOrder | null;
  onNavigateShop: () => void;
  onNavigateTracking?: (orderNumber: string, uuid?: string) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  order: propOrder,
  onNavigateShop,
  onNavigateTracking,
}) => {
  const [copied, setCopied] = useState(false);

  // Fallback to sessionStorage / localStorage so refreshing the page NEVER loses the order number!
  const order = useMemo(() => {
    if (propOrder) return propOrder;
    try {
      const sess = sessionStorage.getItem('veggie_last_order');
      if (sess) return JSON.parse(sess);
    } catch {}
    try {
      const stored = localStorage.getItem('veggie_customer_orders');
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.length > 0) return list[0];
      }
    } catch {}
    return null;
  }, [propOrder]);

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
              Your order information is being processed. You can review your orders and tracking in your account.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  window.history.pushState({}, '', '/account');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                View My Orders
              </button>
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
        </div>
      </main>
    );
  }

  const handleCopyOrderNumber = () => {
    try {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

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
            Shukriya, <strong>{order.customerName}</strong>! Aapka fresh vegetables ka order Muzaffargarh me dispatch ke liye receive ho chuka hai.
          </p>

          {/* Prominent High-Visibility Order Number Box */}
          <div className="order-success-number-hero">
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Aapka Order Number (Save / Note Karein)
            </div>
            <div className="order-success-big-num" id="confirmed-order-number">
              {order.orderNumber}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
              <button
                type="button"
                className="order-copy-btn"
                onClick={handleCopyOrderNumber}
                title="Click to copy order number"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Order Number'}</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 1.1rem', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '9999px' }}
                onClick={() => {
                  if (onNavigateTracking) {
                    onNavigateTracking(order.orderNumber, order.uuid);
                  } else {
                    window.history.pushState({}, '', `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
              >
                <Truck size={14} />
                <span>Track Live Order</span>
              </button>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#047857', marginTop: '10px', fontWeight: 600 }}>
              ✔ Yeh order aapke account ki <strong>Order History (/account)</strong> mein save ho chuka hai.
            </p>
          </div>

          <div className="order-success-meta-chips">
            <div className="order-meta-chip">
              <span className="order-meta-chip-label">Order Number</span>
              <span className="order-meta-chip-value">{order.orderNumber}</span>
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
              {order.items.map((item: any) => (
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
                  Please keep exact cash ready (Rs. {order.grandTotal.toLocaleString()}). Pehle sabzi check karein phir rider ko payment karein.
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
              } else {
                window.history.pushState({}, '', `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
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
