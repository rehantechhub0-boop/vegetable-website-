import { useState, useRef, useEffect } from 'react';
import { ShoppingBag, Check, Plus, Minus, AlertCircle } from 'lucide-react';

export interface VegetableItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  pricePerKg: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isOffer: boolean;
  offerPrice?: number;
  images: Array<{ url: string; isPrimary: boolean }>;
}

export interface CartEntry {
  id: string;
  vegetable: VegetableItem;
  weightDisplay: string;
  weightInKg: number;
  unitPrice: number;
  quantity: number;
  itemTotal: number;
}

export interface VegetableCardProps {
  vegetable: VegetableItem;
  onAddToCart?: (entry: CartEntry) => void;
  onNavigateToProduct?: () => void;
}

const FIXED_WEIGHTS = [
  { label: '250g', kg: 0.25 },
  { label: '500g', kg: 0.50 },
  { label: '1kg',  kg: 1.00 },
  { label: '2kg',  kg: 2.00 },
  { label: '5kg',  kg: 5.00 },
  { label: '10kg', kg: 10.00 },
] as const;

export function VegetableCard({ vegetable, onAddToCart, onNavigateToProduct }: VegetableCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [weightMode, setWeightMode]         = useState<'fixed' | 'custom'>('fixed');
  const [selectedLabel, setSelectedLabel]   = useState<string>('1kg');
  const [customKgInput, setCustomKgInput]   = useState<string>('15');
  const [quantity, setQuantity]             = useState<number>(1);
  const [justAdded, setJustAdded]           = useState<boolean>(false);

  /* ─── Scroll-linked animation engine ─────────────────────────────── */
  useEffect(() => {
    const elem = wrapRef.current;
    if (!elem) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      elem.style.setProperty('--scroll-p', '1');
      return;
    }

    // If native CSS animation-timeline: view() is supported, leave it to CSS
    if (typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline', 'view()')) {
      return;
    }

    let ticking = false;
    const update = () => {
      if (!elem) return;
      const rect = elem.getBoundingClientRect();
      const vh   = window.innerHeight;
      const raw  = (vh - rect.top) / (vh * 0.35);
      elem.style.setProperty('--scroll-p', String(Math.min(1, Math.max(0, raw))));
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* ─── Pricing logic ───────────────────────────────────────────────── */
  const effectivePricePerKg = vegetable.isOffer && vegetable.offerPrice
    ? vegetable.offerPrice
    : vegetable.pricePerKg;

  const primaryImg =
    vegetable.images?.find(i => i.isPrimary)?.url ??
    vegetable.images?.[0]?.url ??
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80';

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
      validationMsg = 'Must be greater than 10kg';
      weightInKg = 0;
      weightDisplay = 'Custom';
    } else {
      weightInKg    = Math.round(parsed * 100) / 100;
      weightDisplay = `${weightInKg}kg`;
    }
  }

  const unitPrice      = isValid ? Math.round(effectivePricePerKg * weightInKg * 100) / 100 : 0;
  const calculatedTotal = isValid ? Math.round(unitPrice * quantity * 100) / 100 : 0;

  const handleAddToCart = () => {
    if (!isValid || !vegetable.isAvailable) return;
    onAddToCart?.({
      id: `${vegetable.id}-${weightDisplay}`,
      vegetable,
      weightDisplay,
      weightInKg,
      unitPrice,
      quantity,
      itemTotal: calculatedTotal,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="product-card-scroll-wrap" ref={wrapRef}>
      <article className={`product-card${!vegetable.isAvailable ? ' is-unavailable' : ''}`}>

        {/* Image */}
        <div
          className={`product-card-img-wrap${onNavigateToProduct ? ' clickable' : ''}`}
          onClick={onNavigateToProduct}
          role={onNavigateToProduct ? 'button' : undefined}
          tabIndex={onNavigateToProduct ? 0 : undefined}
          onKeyDown={onNavigateToProduct ? (e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToProduct(); } : undefined}
          aria-label={onNavigateToProduct ? `View details for ${vegetable.name}` : undefined}
        >
          <img
            src={primaryImg}
            alt={vegetable.name}
            className="product-card-img"
            loading="lazy"
          />
          {!vegetable.isAvailable ? (
            <span className="badge badge-unavailable product-card-badge">Currently unavailable</span>
          ) : vegetable.isOffer ? (
            <span className="badge badge-offer product-card-badge">Offer</span>
          ) : null}
        </div>

        {/* Body */}
        <div className="product-card-body">

          {/* Name + description */}
          {onNavigateToProduct ? (
            <button
              type="button"
              className="product-card-title-link"
              onClick={onNavigateToProduct}
              aria-label={`View details for ${vegetable.name}`}
            >
              <h3 className="product-card-title">{vegetable.name}</h3>
            </button>
          ) : (
            <h3 className="product-card-title">{vegetable.name}</h3>
          )}
          <p className="product-card-desc">{vegetable.description}</p>

          {/* Price per kg */}
          <div className="product-card-rate-row">
            <span className="product-rate-label">Rate</span>
            <div>
              <span className="product-rate-value">Rs. {effectivePricePerKg}</span>
              <span className="product-rate-unit"> / kg</span>
            </div>
          </div>

          {/* Weight selector */}
          <div className="weight-selector-box">
            <span className="weight-selector-label">How much do you need?</span>

            <div className="weight-chips-grid">
              {FIXED_WEIGHTS.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  disabled={!vegetable.isAvailable}
                  className={`weight-chip-btn${weightMode === 'fixed' && selectedLabel === opt.label ? ' active' : ''}`}
                  onClick={() => { setWeightMode('fixed'); setSelectedLabel(opt.label); }}
                  aria-label={`Select ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}

              <button
                type="button"
                disabled={!vegetable.isAvailable}
                className={`weight-chip-btn custom-chip${weightMode === 'custom' ? ' active' : ''}`}
                onClick={() => setWeightMode('custom')}
                aria-label="Select custom weight above 10kg"
              >
                Custom (&gt; 10kg)
              </button>
            </div>

            {/* Custom input — only when custom selected */}
            {weightMode === 'custom' && (
              <div className="custom-input-wrap">
                <label htmlFor={`cw-${vegetable.id}`} className="custom-input-label">
                  Enter kilograms (above 10kg):
                </label>
                <div className="custom-input-group">
                  <input
                    id={`cw-${vegetable.id}`}
                    type="number"
                    step="0.1"
                    min="10.1"
                    placeholder="e.g. 15.5"
                    value={customKgInput}
                    disabled={!vegetable.isAvailable}
                    onChange={e => setCustomKgInput(e.target.value)}
                    className="custom-weight-input"
                  />
                  <span className="custom-input-suffix">KG</span>
                </div>
                {!isValid && (
                  <div className="custom-input-error">
                    <AlertCircle size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />
                    {validationMsg}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calculated price bar */}
          <div className="product-calculated-price-bar">
            <span className="calculated-weight-tag">
              {!vegetable.isAvailable
                ? 'Unavailable'
                : isValid
                ? `${weightDisplay}${quantity > 1 ? ` × ${quantity}` : ''}`
                : '—'}
            </span>
            <span className="calculated-amount-tag">
              {!vegetable.isAvailable
                ? '—'
                : isValid
                ? `Rs. ${calculatedTotal.toLocaleString()}`
                : 'Invalid'}
            </span>
          </div>

          {/* Quantity + add to cart */}
          <div className="product-actions-row">
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
              <span className="qty-value">{quantity}</span>
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

            <button
              type="button"
              className={`btn-add-cart${!vegetable.isAvailable ? ' btn-unavailable' : justAdded ? ' added' : ''}`}
              onClick={handleAddToCart}
              disabled={!isValid || !vegetable.isAvailable}
            >
              {!vegetable.isAvailable ? (
                'Currently unavailable'
              ) : justAdded ? (
                <><Check size={16} /> Added</>
              ) : (
                <><ShoppingBag size={16} /> Add to Cart</>
              )}
            </button>
          </div>

        </div>
      </article>
    </div>
  );
}
