import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Truck,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Building2,
  Lock as LockIcon,
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

export interface PriceChangeItem {
  vegetableId: string;
  vegetableName: string;
  submittedPricePerKg: number;
  currentPricePerKg: number;
}

import { useAuthStore } from '../store/authStore';
import { GenuineGoogleButton } from '../components/GenuineGoogleButton';
import { GoogleSignInModal } from '../components/GoogleSignInModal';

/** Generate a cryptographically random idempotency key. */
function generateIdempotencyKey(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  onOrderSuccess,
  onNavigateCart,
}) => {
  const { user } = useAuthStore();
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Form State (Pre-filled if logged in)
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Idempotency key — one key per logical checkout attempt.
  // Retries reuse the same key; only a new attempt generates a new one.
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());

  // Payment Method & Advance Online details
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CARD' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER'>('COD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [walletPhone, setWalletPhone] = useState('');
  const [walletTxnId, setWalletTxnId] = useState('');
  const [bankTxnId, setBankTxnId] = useState('');

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; description: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Expiry MM/YY
  const handleExpiryChange = (val: string) => {
    let raw = val.replace(/[^0-9]/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setCardExpiry(raw);
  };

  // Price-change review state
  const [priceChanges, setPriceChanges] = useState<PriceChangeItem[]>([]);
  const [priceReviewPending, setPriceReviewPending] = useState(false);

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
  const discountAmount = appliedPromo ? appliedPromo.discount : 0;
  const grandTotal = Math.max(0, (deliveryFee !== null ? subtotal + deliveryFee : subtotal) - discountAmount);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/v1/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          subtotal,
          deliveryFee: deliveryFee ?? 100,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid promo code');
      }
      setAppliedPromo({
        code: data.code,
        discount: data.discount,
        description: data.description,
      });
    } catch (err: any) {
      setPromoError(err.message || 'Promo code could not be applied.');
    } finally {
      setPromoLoading(false);
    }
  };

  // Phone validator: Pakistan formats (e.g. 03XXXXXXXXX, +923XXXXXXXXX, 0300-1234567)
  const isValidPkPhone = (val: string) => {
    const cleaned = val.replace(/[\s\-\(\)]/g, '');
    return /^((\+92)|(0092)|(92)|0)?3[0-9]{9}$/.test(cleaned);
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
    setPriceReviewPending(false);

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
      // Build trusted request payload — include expectedPricePerKg for stale-price detection.
      // Client-submitted totals are ignored by the server; only these fields matter.
      const payload = {
        idempotencyKey: idempotencyKeyRef.current,
        customer: {
          name: name.trim(),
          phone: phone.trim(),
        },
        delivery: {
          zoneId: selectedZone.id,
          address: address.trim(),
          notes: notes.trim() ? notes.trim() : null,
        },
        paymentMethod,
        paymentTxnRef: paymentMethod === 'CARD'
          ? `CARD_${cardNumber.replace(/\s/g, '').slice(-4)}_${Date.now()}`
          : paymentMethod === 'JAZZCASH'
          ? (walletTxnId.trim() || `JC_${walletPhone.trim() || Date.now()}`)
          : paymentMethod === 'EASYPAISA'
          ? (walletTxnId.trim() || `EP_${walletPhone.trim() || Date.now()}`)
          : paymentMethod === 'BANK_TRANSFER'
          ? (bankTxnId.trim() || `IBFT_${Date.now()}`)
          : null,
        cardDetails: paymentMethod === 'CARD' ? {
          cardholderName: cardName.trim(),
          cardLast4: cardNumber.replace(/\s/g, '').slice(-4),
          cardBrand: cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
        } : null,
        walletNumber: (paymentMethod === 'JAZZCASH' || paymentMethod === 'EASYPAISA') ? (walletPhone.trim() || null) : null,
        promoCode: appliedPromo ? appliedPromo.code : null,
        discountAmount: appliedPromo ? appliedPromo.discount : null,
        items: cart.map((item) => ({
          vegetableId: item.vegetable.id,
          weightInKg: item.weightInKg,
          weightDisplay: item.weightDisplay,
          quantity: item.quantity,
          // Send the price the customer saw — server detects mismatches.
          expectedPricePerKg: item.vegetable.isOffer && item.vegetable.offerPrice
            ? item.vegetable.offerPrice
            : item.vegetable.pricePerKg,
        })),
      };

      if (!user) {
        setErrorMessage('Order place karne se pehle Login ya Register karna zaroori hai.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Stale-price rejection — show price-change review panel
        if (res.status === 409 && data.code === 'PRICE_CHANGED' && Array.isArray(data.priceChanges)) {
          setPriceChanges(data.priceChanges);
          setPriceReviewPending(true);
          setErrorMessage(null);
          return;
        }

        if (data.details && Array.isArray(data.details)) {
          const firstErr = data.details[0]?.message || data.error;
          setErrorMessage(firstErr);
        } else {
          setErrorMessage(data.error || 'Failed to place order. Please verify your details.');
        }
        return;
      }

      // Order created or replayed successfully - cache locally to guarantee order number visibility
      try {
        const stored = localStorage.getItem('veggie_customer_orders');
        const list = stored ? JSON.parse(stored) : [];
        const merged = [data.order, ...list.filter((o: any) => o.orderNumber !== data.order.orderNumber)];
        localStorage.setItem('veggie_customer_orders', JSON.stringify(merged.slice(0, 25)));
      } catch (cacheErr) {
        console.warn('Order cache warning:', cacheErr);
      }
      onOrderSuccess(data.order);
    } catch (err: any) {
      setErrorMessage('Unable to place your order right now. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Confirm price changes — generate a fresh idempotency key and resubmit. */
  const handleConfirmPriceChange = () => {
    // New key signals a new checkout attempt with the reviewed (current) prices.
    idempotencyKeyRef.current = generateIdempotencyKey();
    setPriceChanges([]);
    setPriceReviewPending(false);
    // Trigger submit programmatically via form button click simulation
    document.getElementById('place-order-btn')?.click();
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

        {/* Global Error Notice */}
        {errorMessage && (
          <div className="checkout-error-banner" role="alert">
            <AlertCircle size={20} className="checkout-error-icon" />
            <div className="checkout-error-text">
              <p className="checkout-error-title">Order Submission Failed</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Price-Change Review Panel */}
        {priceReviewPending && priceChanges.length > 0 && (
          <div className="checkout-price-review-banner" role="alert">
            <div className="checkout-price-review-header">
              <RefreshCw size={20} className="checkout-price-review-icon" />
              <div>
                <p className="checkout-price-review-title">Prices have changed</p>
                <p className="checkout-price-review-desc">
                  The following items have new prices since you added them to your cart.
                  Please review and confirm to continue.
                </p>
              </div>
            </div>
            <ul className="checkout-price-change-list">
              {priceChanges.map((c) => (
                <li key={c.vegetableId} className="checkout-price-change-item">
                  <span className="checkout-price-change-name">{c.vegetableName}</span>
                  <span className="checkout-price-change-prices">
                    <span className="checkout-price-old">Rs. {c.submittedPricePerKg}/kg</span>
                    <span className="checkout-price-arrow">→</span>
                    <span className="checkout-price-new">Rs. {c.currentPricePerKg}/kg</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="checkout-price-review-actions">
              <button
                type="button"
                id="confirm-price-change-btn"
                className="btn btn-primary checkout-confirm-price-btn"
                onClick={handleConfirmPriceChange}
                disabled={submitting}
              >
                <RefreshCw size={15} />
                Confirm New Prices &amp; Place Order
              </button>
              <button
                type="button"
                className="btn checkout-cancel-price-btn"
                onClick={() => { setPriceReviewPending(false); setPriceChanges([]); }}
              >
                Review Cart First
              </button>
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

              {/* Section 3: Payment Method (Advance & COD) */}
              <div className="checkout-form-section">
                <div className="checkout-section-header">
                  <span className="checkout-section-number">3</span>
                  <div>
                    <h2 className="checkout-section-title">Payment Method (ادائیگی کا طریقہ)</h2>
                    <p className="checkout-section-desc">Apni sahulat ke mutabiq Cash on Delivery ya Advance Card/Wallet muntakhab karein.</p>
                  </div>
                </div>

                {fieldErrors.card && (
                  <div className="checkout-alert checkout-alert-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{fieldErrors.card}</span>
                  </div>
                )}

                {fieldErrors.wallet && (
                  <div className="checkout-alert checkout-alert-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} />
                    <span>{fieldErrors.wallet}</span>
                  </div>
                )}

                {/* Payment Option Tabs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '1.25rem' }}>
                  {/* Option 1: COD */}
                  <div
                    onClick={() => setPaymentMethod('COD')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: paymentMethod === 'COD' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                      backgroundColor: paymentMethod === 'COD' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: paymentMethod === 'COD' ? '0 4px 12px rgba(5,150,105,0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#064e3b', fontSize: '0.9rem' }}>
                        <span>💵 Cash on Delivery</span>
                      </div>
                      {paymentMethod === 'COD' && <CheckCircle2 size={16} color="#059669" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Ghar par sabzi check karne ke baad rider ko cash ada karein.
                    </p>
                  </div>

                  {/* Option 2: Card */}
                  <div
                    onClick={() => setPaymentMethod('CARD')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: paymentMethod === 'CARD' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                      backgroundColor: paymentMethod === 'CARD' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: paymentMethod === 'CARD' ? '0 4px 12px rgba(5,150,105,0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#064e3b', fontSize: '0.9rem' }}>
                        <span>💳 Debit / Credit Card</span>
                      </div>
                      {paymentMethod === 'CARD' && <CheckCircle2 size={16} color="#059669" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Visa, Mastercard ya PayPak card se direct advance payment.
                    </p>
                  </div>

                  {/* Option 3: JazzCash */}
                  <div
                    onClick={() => setPaymentMethod('JAZZCASH')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: paymentMethod === 'JAZZCASH' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                      backgroundColor: paymentMethod === 'JAZZCASH' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: paymentMethod === 'JAZZCASH' ? '0 4px 12px rgba(5,150,105,0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#064e3b', fontSize: '0.9rem' }}>
                        <span>📱 JazzCash Mobile</span>
                      </div>
                      {paymentMethod === 'JAZZCASH' && <CheckCircle2 size={16} color="#059669" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      JazzCash Mobile Account ya QR se instant transfer.
                    </p>
                  </div>

                  {/* Option 4: EasyPaisa */}
                  <div
                    onClick={() => setPaymentMethod('EASYPAISA')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: paymentMethod === 'EASYPAISA' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                      backgroundColor: paymentMethod === 'EASYPAISA' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: paymentMethod === 'EASYPAISA' ? '0 4px 12px rgba(5,150,105,0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#064e3b', fontSize: '0.9rem' }}>
                        <span>📱 EasyPaisa Mobile</span>
                      </div>
                      {paymentMethod === 'EASYPAISA' && <CheckCircle2 size={16} color="#059669" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      EasyPaisa App ya account se ba-sahulat advance adaegi.
                    </p>
                  </div>

                  {/* Option 5: Bank Transfer */}
                  <div
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: paymentMethod === 'BANK_TRANSFER' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                      backgroundColor: paymentMethod === 'BANK_TRANSFER' ? '#ecfdf5' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: paymentMethod === 'BANK_TRANSFER' ? '0 4px 12px rgba(5,150,105,0.1)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#064e3b', fontSize: '0.9rem' }}>
                        <span>🏦 Bank Transfer (IBFT)</span>
                      </div>
                      {paymentMethod === 'BANK_TRANSFER' && <CheckCircle2 size={16} color="#059669" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Direct online banking / Raast se store account me bheinjein.
                    </p>
                  </div>
                </div>

                {/* Sub-Panel: Card Details Input */}
                {paymentMethod === 'CARD' && (
                  <div style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        <CreditCard size={18} color="#059669" />
                        <span>Card Details (Visa / Mastercard)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>
                        <LockIcon size={13} />
                        <span>256-Bit Encrypted</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Cardholder Name (Card Par Mojood Naam)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Asad Ali"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        required={paymentMethod === 'CARD'}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Card Number (16 Digits)
                      </label>
                      <input
                        type="text"
                        placeholder="4214 •••• •••• ••••"
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        maxLength={19}
                        required={paymentMethod === 'CARD'}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'monospace', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Expiry Date (MM/YY)
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          maxLength={5}
                          required={paymentMethod === 'CARD'}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Security Code (CVV / 3 Digits)
                        </label>
                        <input
                          type="password"
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                          maxLength={4}
                          required={paymentMethod === 'CARD'}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Panel: JazzCash / EasyPaisa Details */}
                {(paymentMethod === 'JAZZCASH' || paymentMethod === 'EASYPAISA') && (
                  <div style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 700, fontSize: '0.875rem' }}>
                      <Smartphone size={18} />
                      <span>{paymentMethod === 'JAZZCASH' ? 'JazzCash' : 'EasyPaisa'} Store Receiver Account</span>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                      <div style={{ fontSize: '0.8rem', color: '#78350f' }}>Account Title: <strong>Rehan Qadri (Store Owner)</strong></div>
                      <div style={{ fontSize: '0.8rem', color: '#78350f', marginTop: '2px' }}>
                        Receiver Mobile Number: <strong style={{ fontSize: '1rem', color: '#065f46' }}>0342-7883728</strong>
                      </div>
                      <p style={{ fontSize: '0.73rem', color: '#92400e', marginTop: '4px', margin: 0 }}>
                        Apne {paymentMethod === 'JAZZCASH' ? 'JazzCash' : 'EasyPaisa'} app se Rs. {grandTotal.toLocaleString()} is number par bheinjein aur neeche apna phone/TID darj karein.
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                          Aap Ka Mobile Account Number
                        </label>
                        <input
                          type="tel"
                          placeholder="03XXXXXXXXX"
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                          Transaction ID (TID optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 02938172931"
                          value={walletTxnId}
                          onChange={(e) => setWalletTxnId(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Panel: Direct Bank Transfer */}
                {paymentMethod === 'BANK_TRANSFER' && (
                  <div style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontWeight: 700, fontSize: '0.875rem' }}>
                      <Building2 size={18} />
                      <span>Store Bank Account Details (IBFT)</span>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                      <div style={{ fontSize: '0.8rem', color: '#1e3a8a' }}>Bank Name: <strong>Meezan Bank / HBL</strong></div>
                      <div style={{ fontSize: '0.8rem', color: '#1e3a8a', marginTop: '2px' }}>Account Title: <strong>Rehan Qadri</strong></div>
                      <div style={{ fontSize: '0.8rem', color: '#1e3a8a', marginTop: '2px' }}>Account / Raast ID: <strong style={{ color: '#059669', fontSize: '0.95rem' }}>03427883728</strong></div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>IBAN: <strong>PK74MEZN000342788372801</strong></div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', marginBottom: '4px' }}>
                        Bank Transaction Reference / Sender Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Paid from Meezan App / Ref# 982173"
                        value={bankTxnId}
                        onChange={(e) => setBankTxnId(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Logged in status or Mandatory Auth CTA */}
              {!user ? (
                <div className="checkout-auth-required-box" role="region" aria-label="Login Required">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 800, fontSize: '0.95rem', marginBottom: '6px' }}>
                    <LockIcon size={20} className="text-amber-600" />
                    <span>Order Place Karne Ke Liye Login / Register Laazmi Hai</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: '14px', lineHeight: 1.45 }}>
                    Apne Google account ya Gmail se sign in karein taake aapka <strong>Order Number</strong> aapke account me mehfooz rahe aur aap usko live track kar sakein.
                  </p>
                  
                  <div style={{ marginBottom: '10px' }}>
                    <GenuineGoogleButton
                      onSuccess={() => {}}
                      onOpenFallbackModal={() => setShowGoogleModal(true)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem', background: '#fff' }}
                      onClick={() => {
                        window.sessionStorage.setItem('redirect_after_auth', '/checkout');
                        window.history.pushState({}, '', '/login');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                    >
                      Email Login
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
                      onClick={() => {
                        window.sessionStorage.setItem('redirect_after_auth', '/checkout');
                        window.history.pushState({}, '', '/register');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                    >
                      Naya Account Banayein
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="checkout-user-verified-badge">
                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                    <span>Logged in as <strong>{user.name}</strong> ({user.email}) • Order history will be saved to your account.</span>
                  </div>

                  {/* Place Order CTA */}
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
                </>
              )}
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

              {/* Promo / Voucher Code Input Box */}
              <div style={{ marginTop: '1rem', marginBottom: '1rem', padding: '12px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  🎟️ Have a Promo / Discount Code?
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="e.g. TAAZA10, FREESHIP"
                    value={promoCodeInput}
                    onChange={(e) => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(null); }}
                    disabled={Boolean(appliedPromo) || promoLoading}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                  />
                  {appliedPromo ? (
                    <button
                      type="button"
                      onClick={() => { setAppliedPromo(null); setPromoCodeInput(''); }}
                      className="btn"
                      style={{ padding: '7px 12px', fontSize: '0.78rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCodeInput.trim()}
                      className="btn btn-primary"
                      style={{ padding: '7px 14px', fontSize: '0.78rem', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {promoLoading ? 'Checking…' : 'Apply'}
                    </button>
                  )}
                </div>
                {promoError && (
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '6px', fontWeight: 500 }}>
                    ⚠️ {promoError}
                  </div>
                )}
                {appliedPromo && (
                  <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} color="#059669" /> {appliedPromo.description} (-Rs. {appliedPromo.discount})
                  </div>
                )}
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

                {appliedPromo && (
                  <div className="checkout-breakdown-row" style={{ color: '#059669', fontWeight: 600 }}>
                    <span>Promo Discount ({appliedPromo.code})</span>
                    <span className="checkout-breakdown-val">-Rs. {appliedPromo.discount.toLocaleString()}</span>
                  </div>
                )}

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
      <GoogleSignInModal isOpen={showGoogleModal} onClose={() => setShowGoogleModal(false)} onSuccess={() => setShowGoogleModal(false)} />
    </main>
  );
};
