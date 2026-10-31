import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  CheckCircle,
  Truck,
  ShoppingBag,
  MapPin,
  Phone,
  Scale,
  AlertCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export interface OrderItemSnapshot {
  id: string;
  vegetableName: string;
  vegetableImage: string | null;
  pricePerKg: number;
  weightDisplay: string;
  weightInKg: number;
  unitPrice: number;
  quantity: number;
  itemTotal: number;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export interface TrackedOrder {
  id?: number;
  orderNumber: string;
  uuid?: string;
  orderStatus: string;
  paymentStatus?: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  deliveryZone: string;
  deliveryAddress: string;
  deliveryNotes?: string | null;
  createdAt: string;
  statusHistory?: StatusHistoryItem[];
  items: OrderItemSnapshot[];
}

interface TrackOrderPageProps {
  initialOrderNumber?: string | null;
  initialUuid?: string | null;
  onNavigateShop: () => void;
  onNavigateHome: () => void;
  onNavigateAccount?: () => void;
}

const ORDER_STEPS = [
  { key: 'NEW', label: 'Order Received', desc: 'Received & queued for processing' },
  { key: 'CONFIRMED', label: 'Order Confirmed', desc: 'Verified and accepted by farm team' },
  { key: 'PREPARING', label: 'Preparing Your Vegetables', desc: 'Freshly weighed, sorted & packed' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Rider is on the way to your doorstep' },
  { key: 'DELIVERED', label: 'Delivered', desc: 'Safely handed over at your address' },
];

export const TrackOrderPage: React.FC<TrackOrderPageProps> = ({
  initialOrderNumber,
  initialUuid,
  onNavigateShop,
  onNavigateHome,
  onNavigateAccount,
}) => {
  const { user: authUser } = useAuthStore();

  const [orderInput, setOrderInput] = useState(initialOrderNumber || '');
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  // Auto-fetch if initialUuid or initialOrderNumber provided
  useEffect(() => {
    if (initialUuid) {
      fetchOrderByUuid(initialUuid);
    } else if (initialOrderNumber && authUser) {
      fetchOrderByOrderNumber(initialOrderNumber);
    }
  }, [initialUuid, initialOrderNumber, authUser]);

  const fetchOrderByUuid = async (uuid: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/orders/receipt/${encodeURIComponent(uuid)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to locate order receipt.');
      }
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Could not retrieve order details. Please check your order details.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderByOrderNumber = async (orderNum: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/orders/${encodeURIComponent(orderNum)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Order not found or access denied.');
      }
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Unable to load order details.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = orderInput.trim();
    const cleanPhone = phoneInput.trim();

    if (!cleanNum) {
      setError('Please enter your Order Number (e.g. ORD-1001).');
      return;
    }

    // If customer is authenticated, try fetching via ownership-protected endpoint first
    if (authUser && !cleanPhone) {
      fetchOrderByOrderNumber(cleanNum);
      return;
    }

    // Otherwise, perform verified guest lookup requiring phone verification
    if (!cleanPhone) {
      setError('Please provide the contact phone number used during checkout for security verification.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/orders/guest-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderNumber: cleanNum,
          phone: cleanPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No matching order found with the provided details.');
      }
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Failed to locate order.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepKey: string, currentStatus: string) => {
    if (currentStatus === 'CANCELLED') return 'cancelled';
    const statusOrder = ['NEW', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="badge badge-fresh">Order Received</span>;
      case 'CONFIRMED':
        return <span className="badge badge-category">Order Confirmed</span>;
      case 'PREPARING':
        return <span className="badge badge-featured">Preparing Vegetables</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="badge badge-sale">Out for Delivery</span>;
      case 'DELIVERED':
        return <span className="badge badge-fresh">Delivered</span>;
      case 'CANCELLED':
        return <span className="badge badge-sold-out">Cancelled</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <main className="track-order-page-wrapper" id="track-order-main">
      <div className="container track-order-container">
        {/* Header Breadcrumbs / Nav */}
        <div className="track-order-top-nav">
          <button
            type="button"
            className="cart-breadcrumb-btn"
            onClick={onNavigateHome}
          >
            <ArrowLeft size={16} />
            Home
          </button>
          {authUser && onNavigateAccount && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
              onClick={onNavigateAccount}
            >
              My Account Orders
            </button>
          )}
        </div>

        {/* Search Hero (visible when no order loaded or user wants to search another) */}
        {!order && (
          <div className="track-order-hero-card">
            <div className="track-order-hero-icon-wrap" aria-hidden="true">
              <Truck size={36} className="track-order-hero-icon" />
            </div>
            <h1 className="track-order-hero-title">Track Your Vegetable Order</h1>
            <p className="track-order-hero-subtitle">
              Enter your Order Number to check live preparation and delivery status in Muzaffargarh.
            </p>

            <form onSubmit={handleManualLookup} className="track-order-form">
              <div className="track-form-grid">
                <div className="form-group">
                  <label htmlFor="track-order-num" className="form-label">
                    Order Number <span className="required-star">*</span>
                  </label>
                  <div className="track-input-with-icon">
                    <Search size={18} className="track-input-icon" />
                    <input
                      id="track-order-num"
                      type="text"
                      className="form-input track-input"
                      placeholder="e.g. ORD-1001 or 1001"
                      value={orderInput}
                      onChange={(e) => setOrderInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="track-order-phone" className="form-label">
                    Contact Phone Number <span className="required-star">*</span>
                  </label>
                  <div className="track-input-with-icon">
                    <Phone size={18} className="track-input-icon" />
                    <input
                      id="track-order-phone"
                      type="tel"
                      className="form-input track-input"
                      placeholder="e.g. 0300-1234567"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      required={!authUser}
                    />
                  </div>
                  <span className="track-helper-text">
                    {authUser
                      ? 'Optional for your logged-in account orders.'
                      : 'Required for guest order verification.'}
                  </span>
                </div>
              </div>

              {error && (
                <div className="auth-alert auth-alert-danger" style={{ marginTop: '1rem' }} role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary track-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="checkout-spinner" />
                    Checking Status…
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Track Order
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Loading State when an initial fetch is running */}
        {loading && !order && (
          <div className="account-loading-box" style={{ margin: '3rem 0' }}>
            <Clock size={24} className="checkout-spinner" />
            <p>Locating your order information…</p>
          </div>
        )}

        {/* Order Details & Tracking Timeline Display */}
        {order && (
          <div className="track-order-result-wrap">
            {/* Top Bar with Status and New Search button */}
            <div className="track-order-summary-header">
              <div>
                <div className="track-order-number-row">
                  <h1 className="track-order-title">{order.orderNumber}</h1>
                  {getStatusBadge(order.orderStatus)}
                </div>
                <p className="track-order-date">
                  Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline track-search-another-btn"
                onClick={() => {
                  setOrder(null);
                  setError(null);
                }}
              >
                <Search size={16} />
                Track Another Order
              </button>
            </div>

            {/* Cancelled State Callout OR Normal 5-Step Progress Bar */}
            {order.orderStatus === 'CANCELLED' ? (
              <div className="track-cancelled-card" role="region" aria-label="Order Cancelled">
                <div className="track-cancelled-icon-wrap" aria-hidden="true">
                  <XCircle size={36} className="track-cancelled-icon" />
                </div>
                <div className="track-cancelled-content">
                  <h2 className="track-cancelled-title">This Order Was Cancelled</h2>
                  <p className="track-cancelled-text">
                    This order has been cancelled and is no longer being processed for delivery. If you have questions or need assistance, please contact our Muzaffargarh support team.
                  </p>
                </div>
              </div>
            ) : (
              <div className="track-stepper-card" role="region" aria-label="Delivery Progress">
                <h2 className="track-stepper-heading">Delivery Status Tracker</h2>
                <div className="track-stepper-grid" role="list">
                  {ORDER_STEPS.map((step, idx) => {
                    const stepStatus = getStepStatus(step.key, order.orderStatus);
                    return (
                      <div
                        key={step.key}
                        className={`track-step-item track-step-${stepStatus}`}
                        role="listitem"
                      >
                        <div className="track-step-circle-wrap">
                          <div className="track-step-circle">
                            {stepStatus === 'completed' ? (
                              <CheckCircle size={18} />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </div>
                          {idx < ORDER_STEPS.length - 1 && (
                            <div className="track-step-line" />
                          )}
                        </div>
                        <div className="track-step-content">
                          <span className="track-step-label">{step.label}</span>
                          <span className="track-step-desc">{step.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status Timeline History (if available) */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="track-history-card">
                <h3 className="track-card-section-title">
                  <Clock size={16} />
                  Status Update Log
                </h3>
                <div className="track-timeline-list">
                  {order.statusHistory.map((hist) => (
                    <div key={hist.id} className="track-timeline-item">
                      <div className="track-timeline-bullet" />
                      <div className="track-timeline-body">
                        <div className="track-timeline-header">
                          <span className="track-timeline-status">{hist.toStatus.replace(/_/g, ' ')}</span>
                          <span className="track-timeline-time">
                            {new Date(hist.createdAt).toLocaleDateString()} •{' '}
                            {new Date(hist.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {hist.note && <p className="track-timeline-note">{hist.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2-Column Grid: Ordered Items & Delivery/Payment Details */}
            <div className="track-order-details-grid">
              {/* Left Column: Items Snapshot & Bill Breakdown */}
              <div className="order-success-card">
                <h2 className="order-card-heading">
                  <ShoppingBag size={18} className="order-card-icon" />
                  Vegetables Ordered ({order.items.length})
                </h2>

                <div className="order-confirmed-items-list" role="list">
                  {order.items.map((it) => (
                    <div key={it.id} className="order-confirmed-item" role="listitem">
                      <div className="order-confirmed-item-img-wrap">
                        <img
                          src={
                            it.vegetableImage ||
                            'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80'
                          }
                          alt={it.vegetableName}
                          className="order-confirmed-item-img"
                        />
                      </div>
                      <div className="order-confirmed-item-info">
                        <span className="order-confirmed-item-name">{it.vegetableName}</span>
                        <div className="order-confirmed-item-meta">
                          <Scale size={13} />
                          <span>{it.weightDisplay}</span>
                          <span>•</span>
                          <span>Qty: {it.quantity}</span>
                          <span>•</span>
                          <span>Rs. {it.pricePerKg} / kg</span>
                        </div>
                      </div>
                      <div className="order-confirmed-item-total">
                        Rs. {it.itemTotal.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

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
                    <span>Grand Total</span>
                    <span className="order-bill-total-val" id="tracked-grand-total">
                      Rs. {order.grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Customer & Delivery Information */}
              <div className="order-success-card">
                <h2 className="order-card-heading">
                  <Truck size={18} className="order-card-icon" />
                  Delivery & Contact
                </h2>

                <div className="order-detail-group">
                  <span className="order-detail-label">Recipient</span>
                  <p className="order-detail-value">{order.customerName}</p>
                </div>

                <div className="order-detail-group">
                  <span className="order-detail-label">Phone</span>
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
                    <p className="order-detail-notes">&ldquo;{order.deliveryNotes}&rdquo;</p>
                  </div>
                )}

                <div className="order-detail-group">
                  <span className="order-detail-label">Payment Method</span>
                  <p className="order-detail-value">
                    Cash on Delivery (COD) • Status:{' '}
                    <span style={{ fontWeight: 600, color: order.paymentStatus === 'PAID' ? 'var(--status-success)' : 'var(--accent-600)' }}>
                      {order.paymentStatus || 'COD'}
                    </span>
                  </p>
                </div>

                <div className="order-delivery-trust-callout" style={{ marginTop: '1.25rem' }}>
                  <ShieldCheck size={20} className="order-trust-shield-icon" />
                  <div>
                    <p className="order-trust-callout-title">Cash on Delivery Verification</p>
                    <p className="order-trust-callout-text">
                      Payment is made in cash directly to our rider upon vegetable inspection.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="track-order-footer-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onNavigateShop}
              >
                <ShoppingBag size={18} />
                Shop More Fresh Vegetables
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
