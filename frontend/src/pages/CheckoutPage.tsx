import type React from 'react';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Truck,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { CartEntry } from '../components/VegetableCard';

export interface DeliveryZone {
  id: string;
  areaName: string;
  deliveryFee: number;
  minOrderAmount: number;
  estimatedDeliveryTime: string;
  isActive: boolean;
}

export interface ConfirmedOrderItem {
  id: string;
  vegetableId: string | null;
  vegetableName: string;
  vegetableImage: string | null;
  pricePerKg: number;
  weightDisplay: string;
  weightInKg: number;
  unitPrice: number;
  quantity: number;
  itemTotal: number;
}

export interface ConfirmedOrder {
  id: number;
  orderNumber: string;
  uuid: string;
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
  items: ConfirmedOrderItem[];
}

interface CheckoutPageProps {
  cart: CartEntry[];
  onOrderSuccess: (order: ConfirmedOrder) => void;
  onNavigateCart: () => void;
}

import { useAuthStore } from '../store/authStore';

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  onOrderSuccess,
  onNavigateCart,
}) => {
  const { user, token } = useAuthStore();

  // Form State (Pre-filled if logged in)
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Pre-fill default address if authenticated
  useEffect(() => {
    if (user) {
      if (user.name && !name) setName(user.name);
      if (user.phone && !phone) setPhone(user.phone);
      if (user.addresses && user.addresses.length > 0) {
        const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
        if (def.streetAddress && !address) setAddress(def.streetAddress);
        if (def.deliveryZoneId && !selectedZoneId) setSelectedZoneId(def.deliveryZoneId);
      }
    }
  }, [user]);

  // Zone Fetch State
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [zonesError, setZonesError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch Delivery Zones
  useEffect(() => {
    let isMounted = true;
    async function loadZones() {
      setLoadingZones(true);
      setZonesError(null);
      try {
        const res = await fetch('/api/v1/delivery-zones');
        const json = await res.json();
        if (isMounted) {
          if (json.success && Array.isArray(json.data)) {
            const activeOnly = json.data.filter((z: DeliveryZone) => z.isActive);
            setZones(activeOnly);
            if (activeOnly.length > 0 && !selectedZoneId) {
              setSelectedZoneId(activeOnly[0].id);
            }
          } else {
            setZonesError('Failed to load delivery zones. Please refresh.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setZonesError('Unable to connect to delivery service. Please check your internet connection.');
        }
      } finally {
        if (isMounted) {
          setLoadingZones(false);
        }
      }
    }

    loadZones();
    return () => {
      isMounted = false;
    };
  }, []);

  // Selected Zone Details
  const selectedZone = zones.find((z) => z.id === selectedZoneId) || null;
  const deliveryFee = selectedZone ? selectedZone.deliveryFee : null;

  // Cart Preview Totals
  const subtotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);
  const grandTotal = deliveryFee !== null ? subtotal + deliveryFee : subtotal;

  // Phone validator: Pakistan formats (e.g. 03XXXXXXXXX, +923XXXXXXXXX, 0300-1234567)
  const isValidPkPhone = (val: string) => {
    const cleaned = val.replace(/[\s\-\(\)]/g, '');
    return /^((\+92)|(0092)|(92))?3[0-9]{9}$/.test(cleaned);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Please enter your full name (at least 2 letters).';
    }

    if (!phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!isValidPkPhone(phone.trim())) {
      errors.phone = 'Please enter a valid Pakistan phone number (e.g., 03001234567).';
    }

    if (!selectedZoneId) {
      errors.zoneId = 'Please select your delivery area.';
    }

    if (!address.trim() || address.trim().length < 5) {
      errors.address = 'Please provide a complete street or house address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add vegetables before placing an order.');
      return;
    }

    if (!selectedZone) {
      setErrorMessage('Please select an active delivery area.');
      return;
    }

    if (selectedZone.minOrderAmount > 0 && subtotal < selectedZone.minOrderAmount) {
      setErrorMessage(`Minimum order subtotal for ${selectedZone.areaName} is Rs. ${selectedZone.minOrderAmount}.`);
      return;
    }

    setSubmitting(true);

    try {
      // Build trusted request payload
      const payload = {
        customer: {
          name: name.trim(),
          phone: phone.trim(),
        },
        delivery: {
          zoneId: selectedZone.id,
          address: address.trim(),
          notes: notes.trim() ? notes.trim() : null,
        },
        paymentMethod: 'COD',
        items: cart.map((item) => ({
          vegetableId: item.vegetable.id,
          weightInKg: item.weightInKg,
          weightDisplay: item.weightDisplay,
          quantity: item.quantity,
        })),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.details && Array.isArray(data.details)) {
          const firstErr = data.details[0]?.message || data.error;
          setErrorMessage(firstErr);
        } else {
          setErrorMessage(data.error || 'Failed to place order. Please verify your details.');
        }
        return;
      }

      // Order created successfully
      onOrderSuccess(data.order);
    } catch (err: any) {
      setErrorMessage('Unable to place your order right now. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="checkout-page-wrapper" id="checkout-main">
      <div className="container checkout-container">
        {/* Header Breadcrumb */}
        <header className="checkout-header">
          <button
            type="button"
            className="cart-breadcrumb-btn"
            onClick={onNavigateCart}
            aria-label="Back to Cart"
          >
            <ArrowLeft size={16} />
            Back to Cart
          </button>
          <div className="checkout-title-row">
            <div>
              <h1 className="checkout-main-heading">Checkout</h1>
              <p className="checkout-subheading">
                Enter your delivery details to place your fresh vegetable order.
              </p>
            </div>
            <div className="checkout-step-badge">
              <span className="badge badge-fresh">Step 2 of 2 · Final Review</span>
            </div>
          </div>
        </header>

        {/* Global Error Notice if any */}
        {errorMessage && (
          <div className="checkout-error-banner" role="alert">
            <AlertCircle size={20} className="checkout-error-icon" />
            <div className="checkout-error-text">
              <p className="checkout-error-title">Order Submission Failed</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="checkout-grid-layout">
          {/* LEFT: Customer & Delivery Details Form */}
          <section className="checkout-form-column" aria-label="Customer Delivery Details">
            <form onSubmit={handleSubmit} noValidate className="checkout-form-card">
              {/* Section 1: Customer Contact */}
              <div className="checkout-form-section">
                <div className="checkout-section-header">
                  <span className="checkout-section-number">1</span>
                  <div>
                    <h2 className="checkout-section-title">Customer Information</h2>
                    <p className="checkout-section-desc">Who should we contact when arriving?</p>
                  </div>
                </div>

                <div className="checkout-input-group">
                  <label htmlFor="customer-name" className="checkout-label">
                    Full Name <span className="checkout-required">*</span>
                  </label>
                  <input
                    type="text"
                    id="customer-name"
                    className={`checkout-input ${fieldErrors.name ? 'is-invalid' : ''}`}
                    placeholder="e.g. Muhammad Farooq"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                    }}
                    required
                  />
                  {fieldErrors.name && (
                    <span className="checkout-field-error" role="alert">{fieldErrors.name}</span>
                  )}
                </div>

                <div className="checkout-input-group">
                  <label htmlFor="customer-phone" className="checkout-label">
                    Phone Number <span className="checkout-required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="customer-phone"
                    inputMode="numeric"
                    className={`checkout-input ${fieldErrors.phone ? 'is-invalid' : ''}`}
                    placeholder="0300-1234567 or 03XXXXXXXXX"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
                    }}
                    required
                  />
                  {fieldErrors.phone && (
                    <span className="checkout-field-error" role="alert">{fieldErrors.phone}</span>
                  )}
                  <span className="checkout-hint">
                    Our rider will call this number upon delivery.
                  </span>
                </div>
              </div>

              {/* Section 2: Delivery Location */}
              <div className="checkout-form-section">
                <div className="checkout-section-header">
                  <span className="checkout-section-number">2</span>
                  <div>
                    <h2 className="checkout-section-title">Delivery Location</h2>
                    <p className="checkout-section-desc">Doorstep delivery across Muzaffargarh.</p>
                  </div>
                </div>

                <div className="checkout-input-group">
                  <label htmlFor="delivery-zone" className="checkout-label">
                    Delivery Area <span className="checkout-required">*</span>
                  </label>
                  {loadingZones ? (
                    <div className="checkout-zone-loading">
                      <Clock size={16} /> Loading available delivery zones…
                    </div>
                  ) : zonesError ? (
                    <div className="checkout-zone-error">
                      <AlertCircle size={16} /> {zonesError}
                    </div>
                  ) : (
                    <select
                      id="delivery-zone"
                      className={`checkout-select ${fieldErrors.zoneId ? 'is-invalid' : ''}`}
                      value={selectedZoneId}
                      onChange={(e) => {
                        setSelectedZoneId(e.target.value);
                        if (fieldErrors.zoneId) setFieldErrors((p) => ({ ...p, zoneId: '' }));
                      }}
                      required
                    >
                      <option value="" disabled>
                        Select your delivery area
                      </option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.areaName} — Rs. {zone.deliveryFee} delivery ({zone.estimatedDeliveryTime})
                        </option>
                      ))}
                    </select>
                  )}
                  {fieldErrors.zoneId && (
                    <span className="checkout-field-error" role="alert">{fieldErrors.zoneId}</span>
                  )}
                </div>

                <div className="checkout-input-group">
                  <label htmlFor="delivery-address" className="checkout-label">
                    Street Address / House Address <span className="checkout-required">*</span>
                  </label>
                  <textarea
                    id="delivery-address"
                    rows={3}
                    className={`checkout-textarea ${fieldErrors.address ? 'is-invalid' : ''}`}
                    placeholder="House / Flat number, street, mohalla, nearby landmark..."
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (fieldErrors.address) setFieldErrors((p) => ({ ...p, address: '' }));
                    }}
                    required
                  />
                  {fieldErrors.address && (
                    <span className="checkout-field-error" role="alert">{fieldErrors.address}</span>
                  )}
                </div>

                <div className="checkout-input-group">
                  <label htmlFor="delivery-notes" className="checkout-label">
                    Delivery Instructions <span className="checkout-optional">(optional)</span>
                  </label>
                  <textarea
                    id="delivery-notes"
                    rows={2}
                    maxLength={300}
                    className="checkout-textarea"
                    placeholder="e.g. Ring the bell twice, or leave with watchman..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <span className="checkout-hint">
                    Maximum 300 characters.
                  </span>
                </div>
              </div>

              {/* Section 3: Payment Method */}
              <div className="checkout-form-section">
                <div className="checkout-section-header">
                  <span className="checkout-section-number">3</span>
                  <div>
                    <h2 className="checkout-section-title">Payment Method</h2>
                    <p className="checkout-section-desc">Safe payment on delivery.</p>
                  </div>
                </div>

                <div className="checkout-payment-box">
                  <div className="checkout-payment-radio-wrap">
                    <input
                      type="radio"
                      id="payment-cod"
                      name="payment-method"
                      checked
                      readOnly
                      className="checkout-payment-radio"
                    />
                    <label htmlFor="payment-cod" className="checkout-payment-label">
                      <div className="checkout-payment-title-row">
                        <span className="checkout-payment-title">Cash on Delivery (COD)</span>
                        <span className="badge badge-offer">Pay at Doorstep</span>
                      </div>
                      <p className="checkout-payment-desc">
                        Pay with cash directly to our rider once your fresh vegetables arrive.
                      </p>
                    </label>
                  </div>
                </div>
              </div>

              {/* Place Order CTA on mobile/desktop form */}
              <button
                type="submit"
                id="place-order-btn"
                className="btn btn-primary checkout-submit-btn"
                disabled={submitting || loadingZones || Boolean(zonesError)}
              >
                {submitting ? (
                  <>
                    <div className="checkout-spinner" aria-hidden="true" />
                    Placing Order…
                  </>
                ) : (
                  <>
                    Place Order (Rs. {grandTotal.toLocaleString()})
                  </>
                )}
              </button>
            </form>
          </section>

          {/* RIGHT: Order Summary Sidebar */}
          <aside className="checkout-summary-column" aria-label="Order Summary Preview">
            <div className="checkout-summary-card">
              <h2 className="checkout-summary-title">Order Summary</h2>

              {/* Items List Snapshot */}
              <div className="checkout-items-preview-list">
                {cart.map((item) => {
                  const veg = item.vegetable;
                  const itemImg =
                    veg.images?.find((img) => img.isPrimary)?.url ||
                    veg.images?.[0]?.url ||
                    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80';

                  return (
                    <div key={item.id} className="checkout-preview-item">
                      <img
                        src={itemImg}
                        alt={veg.name}
                        className="checkout-preview-img"
                        loading="lazy"
                      />
                      <div className="checkout-preview-details">
                        <span className="checkout-preview-name">{veg.name}</span>
                        <span className="checkout-preview-meta">
                          {item.weightDisplay} × {item.quantity}
                        </span>
                      </div>
                      <span className="checkout-preview-price">
                        Rs. {item.itemTotal.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Subtotal, Delivery, Grand Total */}
              <div className="checkout-summary-breakdown">
                <div className="checkout-breakdown-row">
                  <span>Subtotal</span>
                  <span className="checkout-breakdown-val">Rs. {subtotal.toLocaleString()}</span>
                </div>

                <div className="checkout-breakdown-row">
                  <span>Delivery Fee</span>
                  <span className="checkout-breakdown-val">
                    {deliveryFee !== null ? (
                      `Rs. ${deliveryFee.toLocaleString()}`
                    ) : (
                      <span className="checkout-muted-note">Select delivery area</span>
                    )}
                  </span>
                </div>

                <div className="checkout-breakdown-divider" />

                <div className="checkout-breakdown-row checkout-grand-total-row">
                  <span>Total</span>
                  <span className="checkout-grand-total-val">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="checkout-trust-box">
                <div className="checkout-trust-point">
                  <Truck size={16} className="checkout-trust-icon" />
                  <span>
                    Estimated: {selectedZone?.estimatedDeliveryTime || '30-45 mins'}
                  </span>
                </div>
                <div className="checkout-trust-point">
                  <ShieldCheck size={16} className="checkout-trust-icon" />
                  <span>Verified fresh quality check before packing</span>
                </div>
                <div className="checkout-trust-point">
                  <Sparkles size={16} className="checkout-trust-icon" />
                  <span>Direct farm harvest</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};
