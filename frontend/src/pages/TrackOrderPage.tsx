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

    if (!cleanNum && !cleanPhone) {
      setError('Please enter either your Order Number or your Phone Number.');
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
          orderNumber: cleanNum || undefined,
          phone: cleanPhone || (cleanNum.startsWith('03') ? cleanNum : undefined),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No matching order found. Please verify your order number or phone number.');
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
          <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Top Glow Card */}
            <div
              className="track-order-hero-card"
              style={{
                position: 'relative',
                overflow: 'hidden',
                border: '2px solid #a7f3d0',
                borderRadius: '24px',
                padding: '3rem 2.5rem',
                boxShadow: '0 20px 40px -15px rgba(5, 150, 105, 0.12)',
                background: 'linear-gradient(180deg, #ffffff 0%, #fafffc 100%)',
                textAlign: 'center',
              }}
            >
              {/* Decorative top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, #10b981, #059669, #34d399)' }} />

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 14px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                <span>Live Rider & Order Tracking | Muzaffargarh</span>
              </div>

              <div className="track-order-hero-icon-wrap" aria-hidden="true" style={{ width: '76px', height: '76px', borderRadius: '20px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.18)' }}>
                <Truck size={38} className="track-order-hero-icon" />
              </div>

              <h1 className="track-order-hero-title" style={{ fontSize: '2rem', fontWeight: 800, color: '#064e3b', marginBottom: '0.5rem' }}>
                Track Your Vegetable Order
              </h1>
              <p className="track-order-hero-subtitle" style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '520px', margin: '0 auto 1.5rem auto' }}>
                Apna Order Number ya Phone Number darj karein aur rider ki live location aur delivery status check karein.
              </p>

              {/* Sample Order Quick Chip */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>💡 Quick Check:</span>
                <button
                  type="button"
                  onClick={() => { setOrderInput('1001'); setPhoneInput(''); }}
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '3px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#047857',
                    cursor: 'pointer',
                  }}
                >
                  Order #1001
                </button>
                <button
                  type="button"
                  onClick={() => { setPhoneInput('0342-7883728'); setOrderInput(''); }}
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    padding: '3px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    color: '#047857',
                    cursor: 'pointer',
                  }}
                >
                  Phone: 0342-7883728
                </button>
              </div>

              <form onSubmit={handleManualLookup} className="track-order-form">
                <div className="track-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', textAlign: 'left' }}>
                  <div className="form-group">
                    <label htmlFor="track-order-num" className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                      Order Number
                    </label>
                    <div className="track-input-with-icon" style={{ position: 'relative' }}>
                      <Search size={18} className="track-input-icon" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#059669' }} />
                      <input
                        id="track-order-num"
                        type="text"
                        className="form-input track-input"
                        placeholder="e.g. ORD-1001 or 1001"
                        value={orderInput}
                        onChange={(e) => setOrderInput(e.target.value)}
                        style={{ paddingLeft: '42px', height: '48px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="track-order-phone" className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                      Or Contact Phone Number
                    </label>
                    <div className="track-input-with-icon" style={{ position: 'relative' }}>
                      <Phone size={18} className="track-input-icon" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#059669' }} />
                      <input
                        id="track-order-phone"
                        type="tel"
                        className="form-input track-input"
                        placeholder="e.g. 0342-7883728"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        style={{ paddingLeft: '42px', height: '48px', borderRadius: '12px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'center' }}>
                  Aap Order Number ya apna Phone Number likh kar foran status check kar sakte hain.
                </div>

                {error && (
                  <div className="auth-alert auth-alert-danger" style={{ marginTop: '1.25rem', padding: '10px 16px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }} role="alert">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary track-submit-btn"
                  disabled={loading}
                  style={{
                    width: '100%',
                    marginTop: '1.5rem',
                    height: '50px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 8px 20px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={20} className="checkout-spinner" />
                      Status Check Ho Raha Hai…
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      Track Order Status
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ── 5 LIVE STAGES VISUAL TIMELINE PREVIEW ── */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '2rem 1.75rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: '#ecfdf5', padding: '3px 10px', borderRadius: '9999px' }}>
                  Step-by-Step Delivery Process
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                  Order Se Delivery Tak Ka Safar
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  Hum rozana har order par in 5 steps ke zariye mukammal taazgi ensure karte hain
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', textAlign: 'center' }}>
                {ORDER_STEPS.map((st, i) => (
                  <div key={st.key} style={{ padding: '0.75rem 0.5rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto', border: '1.5px solid #10b981' }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                      {st.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.3 }}>
                      {st.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 4 TRUST GUARANTEE CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1.25rem', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669', flexShrink: 0 }}>
                  <Truck size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 3px 0' }}>30-45 Min Drop</h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Muzaffargarh city aur bypass ilaaqon me express delivery.</p>
                </div>
              </div>

              <div style={{ padding: '1.25rem', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', flexShrink: 0 }}>
                  <Scale size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 3px 0' }}>Certified Digital Scale</h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>100% accurate computerised wazan print guarantee.</p>
                </div>
              </div>

              <div style={{ padding: '1.25rem', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', flexShrink: 0 }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 3px 0' }}>100% Cash on Delivery</h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Pehle sabzi ki taazgi check karein, phir payment karein.</p>
                </div>
              </div>

              <div style={{ padding: '1.25rem', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#fdf2f8', color: '#db2777', flexShrink: 0 }}>
                  <Phone size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 3px 0' }}>Live Help 0342-7883728</h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Order me masla ho to foran call ya WhatsApp karein.</p>
                </div>
              </div>
            </div>
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
