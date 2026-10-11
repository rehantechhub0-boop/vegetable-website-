import React, { useState } from 'react';
import { Search, X, Leaf, ArrowUp } from 'lucide-react';
import { VegetableCard, VegetableItem, CartEntry } from '../components/VegetableCard';

interface VegetablesPageProps {
  vegetables: VegetableItem[];
  loading: boolean;
  onAddToCart: (entry: CartEntry) => void;
  onNavigateHome: () => void;
  onNavigateProduct: (slug: string) => void;
  ctaSectionRef: React.RefObject<HTMLElement>;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

export function VegetablesPage({
  vegetables,
  loading,
  onAddToCart,
  onNavigateHome,
  onNavigateProduct,
  ctaSectionRef,
  searchQuery: externalQuery,
  setSearchQuery: setExternalQuery,
}: VegetablesPageProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const searchQuery = externalQuery !== undefined ? externalQuery : internalQuery;
  const setSearchQuery = setExternalQuery !== undefined ? setExternalQuery : setInternalQuery;

  const filteredVegetables = vegetables.filter(v =>
    v.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main>
      <section className="shop-page-section" aria-label="Vegetable catalog">
        <div className="container">

          {/* Breadcrumb */}
          <nav className="shop-breadcrumb" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={onNavigateHome}
              className="breadcrumb-btn"
              id="breadcrumb-home-btn"
            >
              Home
            </button>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Fresh Vegetables</span>
          </nav>

          {/* Page Heading & Supporting Copy */}
          <header className="shop-header">
            <h1 className="shop-title">Fresh Vegetables</h1>
            <p className="shop-subtitle">
              Choose the vegetables you need and select exactly how much you want.
            </p>
          </header>

          {/* Search Field & Results Meta */}
          <div className="shop-controls-bar">
            <div className="shop-search-input-group">
              <Search size={18} className="shop-search-icon" aria-hidden="true" />
              <input
                type="search"
                id="shop-search-input"
                className="shop-search-input"
                placeholder="Search vegetables..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search vegetables by name"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="shop-search-clear-btn"
                  className="shop-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="shop-results-meta" aria-live="polite">
              {searchQuery.trim()
                ? `${filteredVegetables.length} ${filteredVegetables.length === 1 ? 'vegetable' : 'vegetables'} found`
                : `Showing all ${vegetables.length} vegetables`}
            </div>
          </div>

          {/* Catalog State & Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
              Loading fresh vegetables…
            </div>
          ) : filteredVegetables.length === 0 ? (
            /* Clean Empty State */
            <div className="shop-empty-state" role="status">
              <div className="shop-empty-icon" aria-hidden="true">
                <Search size={30} />
              </div>
              <h3 className="shop-empty-title">No vegetables found</h3>
              <p className="shop-empty-desc">
                We couldn't find any fresh vegetables matching "{searchQuery}". Try a different name or reset your search.
              </p>
              <button
                type="button"
                id="shop-empty-clear-btn"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* Product Grid */
            <div className="product-grid" id="shop-product-grid">
              {filteredVegetables.map(veg => (
                <VegetableCard
                  key={veg.id}
                  vegetable={veg}
                  onAddToCart={onAddToCart}
                  onNavigateToProduct={() => onNavigateProduct(veg.slug)}
                />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ── Closing Delivery CTA ──────────────────────────── */}
      <section id="delivery-cta" ref={ctaSectionRef} className="delivery-cta-section" aria-label="Call to action">
        <div className="container">
          <div className="delivery-cta-banner">
            {/* Subtle vegetable leaf motif background treatment */}
            <div
              className="delivery-cta-bg-motif"
              aria-hidden="true"
              style={{
                transform: 'translateY(var(--cta-offset, 0px))',
              }}
            >
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M100 15C100 15 145 45 160 95C175 145 145 185 100 185C55 185 25 145 40 95C55 45 100 15 100 15Z"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="#ffffff"
                  fillOpacity="0.08"
                />
                <path
                  d="M100 30V170M100 70L135 50M100 100L145 85M100 130L135 120M100 70L65 50M100 100L55 85M100 130L65 120"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="delivery-cta-content">
              <span className="delivery-cta-eyebrow">
                <Leaf size={14} style={{ display: 'inline', marginRight: 4 }} />
                Daily Delivery Service
              </span>
              <h2 className="delivery-cta-title">
                Fresh vegetables are just a few clicks away.
              </h2>
              <p className="delivery-cta-subtext">
                Choose your vegetables, select the quantity you need, and place your order.
              </p>
            </div>

            <button
              type="button"
              id="delivery-cta-btn"
              className="delivery-cta-btn"
              onClick={scrollToTop}
            >
              Back to Top <ArrowUp size={16} style={{ display: 'inline', marginLeft: 4 }} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
