import React, { useState, useEffect } from 'react';
import { ShoppingBag, Check, AlertCircle, Sparkles, Scale, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

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

export const VegetableCard: React.FC<VegetableCardProps> = ({
  vegetable,
  onAddToCart,
  onNavigateToProduct,
}) => {
  const [weightMode, setWeightMode] = useState<'fixed' | 'custom'>('fixed');
  const [selectedLabel, setSelectedLabel] = useState<string>('1kg');
  const [customKgInput, setCustomKgInput] = useState<string>('15');
  const [justAdded, setJustAdded] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const quantity = 1;

  /* Pricing calculations */
  const effectivePricePerKg = vegetable.isOffer && vegetable.offerPrice
    ? vegetable.offerPrice
    : vegetable.pricePerKg;

  const originalPrice = vegetable.isOffer && vegetable.offerPrice ? vegetable.pricePerKg : null;
  const savingsPerKg = originalPrice ? originalPrice - effectivePricePerKg : 0;

  const rawDefaultImg =
    vegetable.images?.find((i) => i.isPrimary)?.url ??
    vegetable.images?.[0]?.url ??
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=75';

  const imagesList = vegetable.images && vegetable.images.length > 0
    ? vegetable.images
    : [{ url: rawDefaultImg, isPrimary: true }];

  const [activeImgIndex, setActiveImgIndex] = useState(() => {
    const pIdx = imagesList.findIndex((i) => i.isPrimary);
    return pIdx >= 0 ? pIdx : 0;
  });

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  const activeRawImg = imagesList[activeImgIndex]?.url || rawDefaultImg;
  let primaryImg = activeRawImg.startsWith('http') || !apiBase ? activeRawImg : `${apiBase}${activeRawImg}`;

  // Optimize Unsplash images for lightweight, 10x faster card loading
  if (primaryImg.includes('images.unsplash.com')) {
    primaryImg = primaryImg.replace(/w=\d+/, 'w=400').replace(/q=\d+/, 'q=75');
    if (!primaryImg.includes('w=400')) primaryImg += '&w=400';
    if (!primaryImg.includes('q=75')) primaryImg += '&q=75';
    if (!primaryImg.includes('auto=format')) primaryImg += '&auto=format';
  }

  // Automatic gentle image rotation if multiple photos exist in gallery
  useEffect(() => {
    if (imagesList.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImgIndex((prev) => (prev + 1) % imagesList.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [imagesList.length]);

  const handleNextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % imagesList.length);
  };

  const handlePrevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };

  let weightInKg = 1.0;
  let weightDisplay = '1kg';
  let isValid = true;
  let validationMsg = '';

  if (weightMode === 'fixed') {
    const match = FIXED_WEIGHTS.find((o) => o.label === selectedLabel);
    if (match) {
      weightInKg = match.kg;
      weightDisplay = match.label;
    }
  } else {
    const parsed = parseFloat(customKgInput);
    if (isNaN(parsed) || parsed <= 10.0) {
      isValid = false;
      validationMsg = 'Must be greater than 10kg for bulk discount';
      weightInKg = 0;
      weightDisplay = 'Custom';
    } else {
      weightInKg = Math.round(parsed * 100) / 100;
      weightDisplay = `${weightInKg}kg`;
    }
  }

  const unitPrice = isValid ? Math.round(effectivePricePerKg * weightInKg * 100) / 100 : 0;
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
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <article
      className={`vip-vegetable-card ${!vegetable.isAvailable ? 'is-out-of-stock' : ''}`}
    >
      {/* ── IMAGE SECTION ── */}
      <div
        className="vip-card-media-wrap"
        onClick={onNavigateToProduct}
        role={onNavigateToProduct ? 'button' : undefined}
        tabIndex={onNavigateToProduct ? 0 : undefined}
        onKeyDown={
          onNavigateToProduct
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') onNavigateToProduct();
              }
            : undefined
        }
        aria-label={`View details for ${vegetable.name}`}
      >
        {/* Skeleton shimmer while loading */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-neutral-800/80 animate-pulse flex items-center justify-center">
            <span className="text-xs text-emerald-400/80 font-medium tracking-wide">Loading fresh image...</span>
          </div>
        )}

        <img
          src={primaryImg}
          alt={vegetable.name}
          className={`vip-card-img transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            setImgLoaded(true);
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=75';
          }}
        />

        {/* Ambient Gradient Scrim */}
        <div className="vip-card-img-scrim" />

        {/* Carousel Arrows & Dots if multiple photos in gallery */}
        {imagesList.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImg}
              style={{
                position: 'absolute',
                left: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s ease',
              }}
              title="Previous photo"
              aria-label="Previous photo"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={handleNextImg}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.2s ease',
              }}
              title="Next photo"
              aria-label="Next photo"
            >
              <ChevronRight size={16} />
            </button>

            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '0',
                right: '0',
                display: 'flex',
                justifyContent: 'center',
                gap: '4px',
                zIndex: 10,
              }}
            >
              {imagesList.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  onClick={(e) => { e.stopPropagation(); setActiveImgIndex(dotIdx); }}
                  style={{
                    width: activeImgIndex === dotIdx ? '16px' : '5px',
                    height: '5px',
                    borderRadius: '9999px',
                    backgroundColor: activeImgIndex === dotIdx ? '#10b981' : 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Floating Top Badges */}
        <div className="vip-card-badges-row">
          {!vegetable.isAvailable ? (
            <span className="vip-pill-badge badge-sold-out">
              <span className="badge-dot-sold-out" />
              Sold Out Today
            </span>
          ) : vegetable.isOffer ? (
            <span className="vip-pill-badge badge-deal">
              <Sparkles size={12} />
              Save Rs. {savingsPerKg}/kg
            </span>
          ) : (
            <span className="vip-pill-badge badge-fresh-stock">
              <span className="badge-dot-fresh" />
              Fresh Farm Pick
            </span>
          )}

          {vegetable.isFeatured && vegetable.isAvailable && (
            <span className="vip-pill-badge badge-bestseller">Top Seller</span>
          )}
        </div>

        {/* Quick View Floating Hint */}
        <div className="vip-card-quick-hint">
          <span>Tap for Details</span>
          <ArrowUpRight size={14} />
        </div>
      </div>

      {/* ── CARD BODY ── */}
      <div className="vip-card-body">
        {/* Title and Short Description */}
        <div className="vip-card-title-group">
          <h3
            className="vip-card-title"
            onClick={onNavigateToProduct}
            title={vegetable.name}
          >
            {vegetable.name}
          </h3>
          <p className="vip-card-description">{vegetable.description}</p>
        </div>

        {/* Rate Display Row */}
        <div className="vip-card-rate-row">
          <div className="vip-rate-left">
            <span className="vip-rate-label">Mandi Rate:</span>
            <div className="vip-rate-pricing">
              <strong className="vip-rate-current">Rs. {effectivePricePerKg}</strong>
              <span className="vip-rate-unit">/ kg</span>
              {originalPrice && (
                <span className="vip-rate-original">Rs. {originalPrice}</span>
              )}
            </div>
          </div>

          <div className="vip-rate-availability">
            <span className={`live-radar-container ${vegetable.isAvailable ? 'is-live' : 'is-off'}`}>
              {vegetable.isAvailable && <span className="live-radar-ping" />}
              {vegetable.isAvailable && <span className="live-radar-halo" />}
              <span className="live-radar-point" />
            </span>
            <span className="live-radar-label">
              {vegetable.isAvailable ? 'Live in Stock' : 'Out of Stock'}
            </span>
          </div>
        </div>

        {/* ── WEIGHT SELECTOR CHIPS ── */}
        <div className="vip-card-weight-section">
          <div className="vip-weight-header">
            <span className="vip-weight-title">
              <Scale size={13} className="text-emerald-500" />
              Select Weight:
            </span>
            <span className="vip-weight-active-tag">
              {isValid ? weightDisplay : 'Select valid weight'}
            </span>
          </div>

          <div className="vip-weight-chips-grid">
            {FIXED_WEIGHTS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                disabled={!vegetable.isAvailable}
                className={`vip-weight-chip ${
                  weightMode === 'fixed' && selectedLabel === opt.label ? 'is-active' : ''
                }`}
                onClick={() => {
                  setWeightMode('fixed');
                  setSelectedLabel(opt.label);
                }}
              >
                {opt.label}
              </button>
            ))}

            <button
              type="button"
              disabled={!vegetable.isAvailable}
              className={`vip-weight-chip vip-custom-chip ${
                weightMode === 'custom' ? 'is-active' : ''
              }`}
              onClick={() => setWeightMode('custom')}
            >
              Bulk (&gt;10kg)
            </button>
          </div>

          {/* Custom Weight Drawer */}
          {weightMode === 'custom' && (
            <div className="vip-custom-weight-drawer animate-slide-down">
              <div className="vip-custom-input-line">
                <label
                  htmlFor={`custom-kg-${vegetable.id}`}
                  className="vip-custom-label"
                >
                  Enter kg (&gt;10kg):
                </label>
                <div className="vip-custom-input-wrap">
                  <input
                    id={`custom-kg-${vegetable.id}`}
                    type="number"
                    step="0.5"
                    min="10.5"
                    placeholder="e.g. 15"
                    value={customKgInput}
                    disabled={!vegetable.isAvailable}
                    onChange={(e) => setCustomKgInput(e.target.value)}
                    className="vip-custom-num-input"
                  />
                  <span className="vip-custom-suffix">KG</span>
                </div>
              </div>
              {!isValid && (
                <div className="vip-custom-error">
                  <AlertCircle size={12} />
                  <span>{validationMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PRICE TOTAL SUMMARY BAR ── */}
        <div className="vip-card-price-bar">
          <div className="vip-total-breakdown">
            <span className="vip-breakdown-formula">
              {isValid
                ? `${weightDisplay} × ${quantity} item${quantity > 1 ? 's' : ''}`
                : 'Invalid weight'}
            </span>
            <div className="vip-total-price">
              Rs. {calculatedTotal.toLocaleString()}
            </div>
          </div>
        </div>

        {/* ── ACTION: ADD TO CART ── */}
        <div className="vip-card-action-row">
          <button
            type="button"
            className={`vip-btn-add-cart vip-btn-full-width ${
              !vegetable.isAvailable
                ? 'is-disabled'
                : justAdded
                ? 'is-success'
                : ''
            }`}
            onClick={handleAddToCart}
            disabled={!isValid || !vegetable.isAvailable}
          >
            {!vegetable.isAvailable ? (
              <span>Out of Stock</span>
            ) : justAdded ? (
              <>
                <Check size={16} className="animate-bounce" />
                <span>Added to Cart!</span>
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                <span>Add to Cart ({weightDisplay})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
