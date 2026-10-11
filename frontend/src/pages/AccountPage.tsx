import type React from 'react';
import { useState, useEffect } from 'react';
import {
  User,
  ShoppingBag,
  Clock,
  LogOut,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Calendar,
  Scale,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export interface CustomerOrderSummary {
  id: number;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  deliveryZone: string;
  deliveryAddress: string;
  deliveryNotes: string | null;
  createdAt: string;
  itemsCount: number;
  items: Array<{
    id: string;
    vegetableName: string;
    vegetableImage: string | null;
    pricePerKg: number;
    weightDisplay: string;
    weightInKg: number;
    unitPrice: number;
    quantity: number;
    itemTotal: number;
  }>;
}

interface AccountPageProps {
  onNavigateShop: () => void;
  onNavigateHome: () => void;
  activeOrderNumber?: string | null;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  onNavigateShop,
  onNavigateHome,
  activeOrderNumber,
}) => {
  const { user, token, logout, setUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Selected Order for Modal/Detailed View
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrderSummary | null>(null);

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch customer's own orders
  useEffect(() => {
    let mounted = true;
    async function loadMyOrders() {
      if (!user) return;
      setLoadingOrders(true);
      setOrdersError(null);
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/v1/orders/my-orders', {
          headers,
          credentials: 'include',
        });

        const data = await res.json();
        if (mounted) {
          if (res.ok && data.success) {
            setOrders(data.data);
            if (activeOrderNumber) {
              const match = data.data.find(
                (o: CustomerOrderSummary) => o.orderNumber.toLowerCase() === activeOrderNumber.toLowerCase()
              );
              if (match) setSelectedOrder(match);
            }
          } else {
            setOrdersError(data.error || 'Failed to load order history.');
          }
        }
      } catch (e) {
        if (mounted) {
          setOrdersError('Unable to load orders right now. Please check your network.');
        }
      } finally {
        if (mounted) setLoadingOrders(false);
      }
    }

    loadMyOrders();
    return () => {
      mounted = false;
    };
  }, [user, token, activeOrderNumber]);

  // Load default address if available
  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      setAddress(def.streetAddress || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name, phone, address }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileMsg({ type: 'error', text: data.error || 'Failed to save changes.' });
        return;
      }

      setUser(data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (e) {
      setProfileMsg({ type: 'error', text: 'Failed to update profile due to network issue.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onNavigateHome();
  };

  return (
    <main className="account-page-wrapper">
      <div className="container account-container">
        {/* Top Header Card */}
        <header className="account-top-card">
          <div className="account-avatar-row">
            <div className="account-avatar-icon">
              <User size={32} />
            </div>
            <div>
              <h1 className="account-user-name">{user?.name || 'Customer'}</h1>
              <p className="account-user-email">{user?.email || 'Registered Customer'}</p>
              {user?.phone && <p className="account-user-phone">{user.phone}</p>}
            </div>
          </div>

          <div className="account-header-actions">
            <button
              type="button"
              className="btn btn-outline account-logout-btn"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="account-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'orders'}
            className={`account-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('orders');
              setSelectedOrder(null);
            }}
          >
            <ShoppingBag size={18} />
            My Orders ({orders.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={`account-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            Profile & Address
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === 'orders' && (
          <section className="account-content-section" aria-label="My Orders">
            {selectedOrder ? (
              /* Single Order Detailed View */
              <div className="account-order-detail-card">
                <button
                  type="button"
                  className="cart-breadcrumb-btn"
                  onClick={() => setSelectedOrder(null)}
                >
                  <ArrowLeft size={16} />
                  Back to All Orders
                </button>

                <div className="account-order-detail-header">
                  <div>
                    <h2 className="account-detail-title">{selectedOrder.orderNumber}</h2>
                    <p className="account-detail-date">
                      Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()} at{' '}
                      {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="account-detail-status-pill">
                    <span className="badge badge-fresh">{selectedOrder.orderStatus}</span>
                  </div>
                </div>

                <div className="order-confirmed-items-list" style={{ marginTop: '1.25rem' }}>
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="order-confirmed-item">
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
                          <span>Rs. {item.pricePerKg}/kg</span>
                        </div>
                      </div>
                      <div className="order-confirmed-item-total">
                        Rs. {item.itemTotal.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-success-bill-summary">
                  <div className="order-bill-row">
                    <span>Subtotal</span>
                    <span>Rs. {selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="order-bill-row">
                    <span>Delivery ({selectedOrder.deliveryZone})</span>
                    <span>Rs. {selectedOrder.deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="order-bill-divider" />
                  <div className="order-bill-row order-bill-total-row">
                    <span>Grand Total</span>
                    <span className="order-bill-total-val">
                      Rs. {selectedOrder.grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="account-detail-address-box">
                  <span className="order-detail-label">Delivery Location</span>
                  <p className="order-detail-value">{selectedOrder.deliveryAddress} ({selectedOrder.deliveryZone})</p>
                  {selectedOrder.deliveryNotes && (
                    <p className="order-detail-notes" style={{ marginTop: 8 }}>
                      &ldquo;{selectedOrder.deliveryNotes}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ) : loadingOrders ? (
              <div className="account-loading-box">
                <Clock size={20} className="checkout-spinner" />
                <p>Loading your orders…</p>
              </div>
            ) : ordersError ? (
              <div className="auth-alert auth-alert-danger">
                <AlertCircle size={18} />
                <span>{ordersError}</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="account-empty-orders">
                <ShoppingBag size={44} className="account-empty-icon" />
                <h3 className="account-empty-title">No orders yet</h3>
                <p className="account-empty-sub">Fresh vegetables ordered from your account will show up here.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onNavigateShop}
                >
                  Shop Fresh Vegetables
                </button>
              </div>
            ) : (
              <div className="account-orders-list">
                {orders.map((o) => (
                  <article
                    key={o.id}
                    className="account-order-card"
                    onClick={() => setSelectedOrder(o)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedOrder(o);
                      }
                    }}
                  >
                    <div className="account-order-row-top">
                      <div>
                        <span className="account-order-number">{o.orderNumber}</span>
                        <div className="account-order-date">
                          <Calendar size={13} />
                          <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className="badge badge-fresh">{o.orderStatus}</span>
                    </div>

                    <div className="account-order-row-bottom">
                      <div className="account-order-meta-info">
                        <span>{o.itemsCount} {o.itemsCount === 1 ? 'item' : 'items'}</span>
                        <span>•</span>
                        <span>{o.deliveryZone}</span>
                        <span>•</span>
                        <span>{o.paymentMethod}</span>
                      </div>
                      <div className="account-order-action-wrap">
                        <span className="account-order-price">Rs. {o.grandTotal.toLocaleString()}</span>
                        <ChevronRight size={18} className="account-order-arrow" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Profile & Saved Address */}
        {activeTab === 'profile' && (
          <section className="account-content-section" aria-label="Profile Settings">
            <div className="account-profile-card">
              <h2 className="checkout-section-title" style={{ marginBottom: '1.25rem' }}>
                Profile & Delivery Defaults
              </h2>

              {profileMsg && (
                <div
                  className={`auth-alert ${
                    profileMsg.type === 'success' ? 'auth-alert-success' : 'auth-alert-danger'
                  }`}
                  role="alert"
                >
                  {profileMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="auth-form" noValidate>
                <div className="checkout-input-group">
                  <label htmlFor="prof-name" className="checkout-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="prof-name"
                    className="checkout-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="checkout-input-group">
                  <label htmlFor="prof-email" className="checkout-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="prof-email"
                    className="checkout-input"
                    value={user?.email || ''}
                    disabled
                    style={{ backgroundColor: 'var(--surface-bg)', cursor: 'not-allowed' }}
                  />
                  <span className="checkout-hint">Email address cannot be changed directly.</span>
                </div>

                <div className="checkout-input-group">
                  <label htmlFor="prof-phone" className="checkout-label">
                    Default Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="prof-phone"
                    className="checkout-input"
                    placeholder="0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="checkout-input-group">
                  <label htmlFor="prof-address" className="checkout-label">
                    Default Street / House Address
                  </label>
                  <textarea
                    id="prof-address"
                    rows={3}
                    className="checkout-textarea"
                    placeholder="House number, street, mohalla..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  <span className="checkout-hint">
                    This address will automatically pre-fill your checkout for faster orders.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                  style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                >
                  {savingProfile ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
