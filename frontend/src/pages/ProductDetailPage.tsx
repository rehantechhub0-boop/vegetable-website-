import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ShoppingBag, Check, Minus, Plus,
  AlertCircle, Leaf, ChevronRight, Truck, ShieldCheck,
} from 'lucide-react';
import type { VegetableItem, CartEntry } from '../components/VegetableCard';

/* ── Weight config — single source of truth (mirrors VegetableCard) ── */
const FIXED_WEIGHTS = [
  { label: '250g', kg: 0.25 },
  { label: '500g', kg: 0.50 },
  { label: '1kg',  kg: 1.00 },
  { label: '2kg',  kg: 2.00 },
  { label: '5kg',  kg: 5.00 },
  { label: '10kg', kg: 10.00 },
] as const;

/* ── Props ─────────────────────────────────────────────────────────── */
interface ProductDetailPageProps {
  slug: string;
  vegetables: VegetableItem[];
  loading: boolean;
  onAddToCart: (entry: CartEntry) => void;
  onNavigateHome: () => void;
  onNavigateShop: () => void;
}

/* ── Component ──────────────────────────────────────────────────────── */
export function ProductDetailPage({
  slug,
  vegetables,
  loading,
  onAddToCart,
  onNavigateHome,
  onNavigateShop,
}: ProductDetailPageProps) {

  const vegetable = vegetables.find(v => v.slug === slug) ?? null;

  /* ── Gallery state ─────────────────────────────────────────────── */
  const allImages: string[] = vegetable
    ? (vegetable.images?.length
        ? vegetable.images.map(i => i.url)
        : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=80'])
    : [];

  const [activeImg, setActiveImg] = useState(0);

  /* ── Weight / pricing state ────────────────────────────────────── */
  const [weightMode, setWeightMode]       = useState<'fixed' | 'custom'>('fixed');
  const [selectedLabel, setSelectedLabel] = useState<string>('1kg');
  const [customKgInput, setCustomKgInput] = useState<string>('15');
  const [quantity, setQuantity]           = useState<number>(1);
  const [justAdded, setJustAdded]         = useState<boolean>(false);

  /* Reset all state when slug changes */
  useEffect(() => {
    setActiveImg(0);
    setWeightMode('fixed');
    setSelectedLabel('1kg');
    setCustomKgInput('15');
    setQuantity(1);
    setJustAdded(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  /* ── Scroll-linked info panel animation ────────────────────────── */
  const infoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elem = infoRef.current;
    if (!elem) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) { elem.style.setProperty('--pdp-p', '1'); return; }
    if (typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline', 'view()')) return;

    let ticking = false;
    const update = () => {
      if (!elem) return;
      const rect = elem.getBoundingClientRect();
      const vh = window.innerHeight;
      const raw = (vh - rect.top) / (vh * 0.55);
      elem.style.setProperty('--pdp-p', String(Math.min(1, Math.max(0, raw))));
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [vegetable]);

  /* ── Loading state ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <main className="pdp-loading-state">
        <div className="container">
          <div className="pdp-loading-inner">
            <div className="pdp-loading-spinner" aria-hidden="true" />
            <p>Loading product…</p>
          </div>
        </div>
      </main>
    );
  }

  /* ── Not found state ───────────────────────────────────────────── */
  if (!vegetable) {
    return (
      <main className="pdp-not-found-section">
        <div className="container">
          <div className="pdp-not-found-inner">
            <div className="pdp-not-found-icon" aria-hidden="true">
              <Leaf size={36} />
            </div>
            <h1 className="pdp-not-found-title">Vegetable Not Found</h1>
            <p className="pdp-not-found-desc">
              We couldn&apos;t find a vegetable matching &ldquo;<strong>{slug}</strong>&rdquo;.
              It may have been removed or the link may be incorrect.
            </p>
            <button
              type="button"
              className="pdp-back-btn"
              onClick={onNavigateShop}
            >
              <ArrowLeft size={16} />
              Back to Vegetables
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ── Pricing logic — mirrors VegetableCard exactly ─────────────── */
  const effectivePricePerKg = vegetable.isOffer && vegetable.offerPrice
    ? vegetable.offerPrice
    : vegetable.pricePerKg;

  let weightInKg    = 1.0;
  let weightDisplay = '1kg';
  let isValid       = true;
  let validationMsg = '';

  if (weightMode === 'fixed') {
    const match = FIXED_WEIGHTS.find(o => o.label === selectedLabel);
    if (match) { weightInKg = match.kg; weightDisplay = match.label; }
  } else {
    const parsed = parseFloat(customKgInput);
    if (isNaN(parsed) || parsed <= 10.0) {
      isValid = false;
      validationMsg = 'Custom weight must be greater than 10kg.';
      weightInKg = 0;
      weightDisplay = 'Custom';
    } else {
      weightInKg    = Math.round(parsed * 100) / 100;
      weightDisplay = `${weightInKg}kg`;
    }
  }

  const unitPrice       = isValid ? Math.round(effectivePricePerKg * weightInKg * 100) / 100 : 0;
  const calculatedTotal = isValid ? Math.round(unitPrice * quantity * 100) / 100 : 0;

  const handleAddToCart = () => {
    if (!isValid || !vegetable.isAvailable) return;
    onAddToCart({
      id: `${vegetable.id}-${weightDisplay}`,
      vegetable,
      weightDisplay,
      weightInKg,
      unitPrice,
      quantity,
      itemTotal: calculatedTotal,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const primaryImg = allImages[activeImg]
    ?? 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=80';

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <main>
      <section className="pdp-section">
        <div className="container">

          {/* ── Breadcrumb ──────────────────────────────────────── */}
          <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
            <button
              type="button"
              className="pdp-breadcrumb-btn"
              onClick={onNavigateHome}
            >
              Home
            </button>
            <ChevronRight size={13} className="pdp-breadcrumb-sep" aria-hidden="true" />
            <button
              type="button"
              className="pdp-breadcrumb-btn"
              onClick={onNavigateShop}
            >
              Vegetables
            </button>
            <ChevronRight size={13} className="pdp-breadcrumb-sep" aria-hidden="true" />
            <span className="pdp-breadcrumb-current" aria-current="page">
              {vegetable.name}
            </span>
          </nav>

          {/* ── Product Layout (2-col desktop / 1-col mobile) ─── */}
          <div className="pdp-layout">

            {/* ── LEFT: Gallery ────────────────────────────────── */}
            <div className="pdp-gallery">

              {/* Main image */}
              <div className="pdp-main-img-wrap">
                <img
                  src={primaryImg}
                  alt={vegetable.name}
                  className="pdp-main-img"
                  loading="eager"
                  width="800"
                  height="600"
                />
                {/* Unavailability overlay */}
                {!vegetable.isAvailable && (
                  <div className="pdp-unavail-overlay" aria-hidden="true">
                    <span>Currently Unavailable</span>
                  </div>
                )}
                {/* Offer badge */}
                {vegetable.isAvailable && vegetable.isOffer && (
                  <span className="badge badge-offer pdp-offer-badge">Offer</span>
                )}
              </div>

              {/* Thumbnail strip — only shown when multiple images */}
              {allImages.length > 1 && (
                <div className="pdp-thumb-strip" role="tablist" aria-label="Product images">
                  {allImages.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={activeImg === idx}
                      aria-label={`View image ${idx + 1}`}
                      className={`pdp-thumb-btn${activeImg === idx ? ' active' : ''}`}
                      onClick={() => setActiveImg(idx)}
                    >
                      <img
                        src={url}
                        alt=""
                        className="pdp-thumb-img"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: Info + selector ───────────────────────── */}
            <div className="pdp-info" ref={infoRef}>

              {/* Vegetable name */}
              <h1 className="pdp-name">{vegetable.name}</h1>

              {/* Short description */}
              {vegetable.description && (
                <p className="pdp-description">{vegetable.description}</p>
              )}

              {/* Price per kg row */}
              <div className="pdp-price-row">
                <div className="pdp-price-block">
                  {vegetable.isOffer && vegetable.offerPrice ? (
                    <>
                      <span className="pdp-price-original">
                        Rs. {vegetable.pricePerKg.toLocaleString()}
                      </span>
                      <span className="pdp-price-main">
                        Rs. {vegetable.offerPrice.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="pdp-price-main">
                      Rs. {vegetable.pricePerKg.toLocaleString()}
                    </span>
                  )}
                  <span className="pdp-price-unit">/ kg</span>
                </div>

                {/* Availability pill */}
                <span
                  className={`pdp-avail-pill${vegetable.isAvailable ? ' available' : ' unavailable'}`}
                >
                  {vegetable.isAvailable ? 'Available' : 'Currently Unavailable'}
                </span>
              </div>

              {/* Divider */}
              <div className="pdp-divider" />

              {/* ── Weight Selector ──────────────────────────── */}
              <div className="pdp-weight-section">
                <p className="pdp-field-label">Select Weight</p>

                <div className="pdp-weight-grid">
                  {FIXED_WEIGHTS.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      disabled={!vegetable.isAvailable}
                      className={`pdp-weight-btn${weightMode === 'fixed' && selectedLabel === opt.label ? ' active' : ''}`}
                      onClick={() => { setWeightMode('fixed'); setSelectedLabel(opt.label); }}
                      aria-label={`Select ${opt.label}`}
                      aria-pressed={weightMode === 'fixed' && selectedLabel === opt.label}
                    >
                      {opt.label}
                    </button>
                  ))}

                  {/* Custom weight button — full width */}
                  <button
                    type="button"
                    disabled={!vegetable.isAvailable}
                    className={`pdp-weight-btn pdp-custom-btn${weightMode === 'custom' ? ' active' : ''}`}
                    onClick={() => setWeightMode('custom')}
                    aria-label="Select custom weight above 10kg"
                    aria-pressed={weightMode === 'custom'}
                  >
                    Custom (&gt; 10kg)
                  </button>
                </div>

                {/* Custom weight input */}
                {weightMode === 'custom' && (
                  <div className="pdp-custom-wrap">
                    <label htmlFor={`pdp-cw-${vegetable.id}`} className="pdp-custom-label">
                      Enter weight above 10kg
                    </label>
                    <div className="pdp-custom-input-group">
                      <input
                        id={`pdp-cw-${vegetable.id}`}
                        type="number"
                        step="0.1"
                        min="10.1"
                        placeholder="e.g. 15.5"
                        value={customKgInput}
                        disabled={!vegetable.isAvailable}
                        onChange={e => setCustomKgInput(e.target.value)}
                        className={`pdp-custom-input${!isValid ? ' error' : ''}`}
                        aria-describedby={!isValid ? 'pdp-custom-err' : undefined}
                      />
                      <span className="pdp-custom-suffix">KG</span>
                    </div>
                    {!isValid && (
                      <p id="pdp-custom-err" className="pdp-custom-error" role="alert">
                        <AlertCircle size={13} aria-hidden="true" />
                        {validationMsg}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Price Summary ────────────────────────────── */}
              <div className="pdp-price-summary" aria-live="polite">
                <div className="pdp-price-summary-row">
                  <span className="pdp-summary-label">Price per kg</span>
                  <span className="pdp-summary-value">Rs. {effectivePricePerKg.toLocaleString()}</span>
                </div>
                <div className="pdp-price-summary-row">
                  <span className="pdp-summary-label">Selected weight</span>
                  <span className="pdp-summary-value">
                    {isValid ? `${weightInKg} kg` : '—'}
                  </span>
                </div>
                <div className="pdp-price-summary-divider" />
                <div className="pdp-price-summary-row pdp-price-total-row">
                  <span className="pdp-summary-total-label">
                    {quantity > 1 ? `Total (×${quantity})` : 'Total'}
                  </span>
                  <span className="pdp-summary-total-value">
                    {!vegetable.isAvailable
                      ? '—'
                      : isValid
                        ? `Rs. ${calculatedTotal.toLocaleString()}`
                        : 'Invalid weight'}
                  </span>
                </div>
              </div>

              {/* ── Quantity + Add to Cart ───────────────────── */}
              <div className="pdp-actions">

                <div className="pdp-qty-group">
                  <p className="pdp-field-label">Quantity</p>
                  <div className="qty-stepper">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => setQuantity(p => Math.max(1, p - 1))}
                      disabled={!vegetable.isAvailable || quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="qty-value" aria-label={`Quantity: ${quantity}`}>{quantity}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => setQuantity(p => p + 1)}
                      disabled={!vegetable.isAvailable}
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  id="pdp-add-to-cart-btn"
                  className={`pdp-add-cart-btn${!vegetable.isAvailable ? ' unavailable' : justAdded ? ' added' : ''}`}
                  onClick={handleAddToCart}
                  disabled={!isValid || !vegetable.isAvailable}
                >
                  {!vegetable.isAvailable ? (
                    'Currently Unavailable'
                  ) : justAdded ? (
                    <><Check size={18} aria-hidden="true" /> Added to Cart</>
                  ) : (
                    <><ShoppingBag size={18} aria-hidden="true" /> Add to Cart</>
                  )}
                </button>
              </div>

              {/* ── Trust strip ─────────────────────────────── */}
              <div className="pdp-trust-strip">
                <div className="pdp-trust-item">
                  <Truck size={14} aria-hidden="true" />
                  <span>Local delivery — Muzaffargarh</span>
                </div>
                <div className="pdp-trust-item">
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Cash on Delivery</span>
                </div>
                <div className="pdp-trust-item">
                  <Leaf size={14} aria-hidden="true" />
                  <span>Daily fresh stock</span>
                </div>
              </div>

            </div>
            {/* end pdp-info */}
          </div>
          {/* end pdp-layout */}

        </div>
      </section>
    </main>
  );
}
