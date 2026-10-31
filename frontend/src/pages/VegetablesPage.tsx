import React, { useState, useMemo } from 'react';
import { Search, X, Leaf, ArrowUp, SlidersHorizontal } from 'lucide-react';
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

type CategoryType = 'all' | 'offers' | 'staples' | 'greens' | 'salad' | 'spices';
type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc';

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

  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Categories definition
  const categories: Array<{ id: CategoryType; label: string; icon: string }> = [
    { id: 'all', label: 'All Fresh Stock', icon: '🌱' },
    { id: 'offers', label: 'Super Deals & Offers', icon: '🔥' },
    { id: 'staples', label: 'Daily Staples (Aloo, Pyaz)', icon: '🥔' },
    { id: 'greens', label: 'Leafy Greens (Palak)', icon: '🥬' },
    { id: 'salad', label: 'Salad & Crisp', icon: '🥗' },
    { id: 'spices', label: 'Spices & Aromatics', icon: '🌶️' },
  ];

  // Match category
  const matchesCategory = (veg: VegetableItem, cat: CategoryType): boolean => {
    if (cat === 'all') return true;
    if (cat === 'offers') return veg.isOffer;

    const lower = veg.name.toLowerCase() + ' ' + veg.slug.toLowerCase();
    if (cat === 'staples') {
      return lower.includes('aloo') || lower.includes('pyaz') || lower.includes('tamatar') || lower.includes('onion') || lower.includes('potato') || lower.includes('tomato');
    }
    if (cat === 'greens') {
      return lower.includes('palak') || lower.includes('spinach') || lower.includes('dhaniya') || lower.includes('pudina') || lower.includes('coriander') || lower.includes('mint');
    }
    if (cat === 'salad') {
      return lower.includes('kheera') || lower.includes('cucumber') || lower.includes('mooli') || lower.includes('gajar') || lower.includes('carrot') || lower.includes('radish') || lower.includes('chukandar') || lower.includes('beetroot') || lower.includes('lemon') || lower.includes('nimbu');
    }
    if (cat === 'spices') {
      return lower.includes('mirch') || lower.includes('adrak') || lower.includes('lehsan') || lower.includes('ginger') || lower.includes('garlic') || lower.includes('chilli') || lower.includes('pepper');
    }
    return true;
  };

  // Filter & Sort
  const processedVegetables = useMemo(() => {
    let result = vegetables.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesSearch && matchesCategory(v, activeCategory);
    });

    if (sortBy === 'price-asc') {
      result.sort((a, b) => {
        const pA = a.isOffer && a.offerPrice ? a.offerPrice : a.pricePerKg;
        const pB = b.isOffer && b.offerPrice ? b.offerPrice : b.pricePerKg;
        return pA - pB;
      });
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => {
        const pA = a.isOffer && a.offerPrice ? a.offerPrice : a.pricePerKg;
        const pB = b.isOffer && b.offerPrice ? b.offerPrice : b.pricePerKg;
        return pB - pA;
      });
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Featured first
      result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    return result;
  }, [vegetables, searchQuery, activeCategory, sortBy]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="shop-page-main">
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
            <span className="breadcrumb-current">Fresh Vegetables Catalog</span>
          </nav>

          {/* Page Heading Banner */}
          <header className="shop-header">
            <div className="shop-header-badge">
              <Leaf size={14} className="text-emerald-500" />
              <span>Muzaffargarh Fresh Mandi Stock</span>
            </div>
            <h1 className="shop-title">Farm-Fresh Vegetables</h1>
            <p className="shop-subtitle">
              Sourced fresh daily. Order by exact weight — from 250g trial to 10kg+ bulk quantities.
            </p>
          </header>

          {/* ── SEARCH & CONTROLS BAR ── */}
          <div className="shop-controls-bar">
            {/* Search Input */}
            <div className="shop-search-input-group">
              <Search size={18} className="shop-search-icon" aria-hidden="true" />
              <input
                type="search"
                id="shop-search-input"
                className="shop-search-input"
                placeholder="Search vegetables (e.g. Tamatar, Aloo, Palak)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Sort Dropdown */}
            <div className="shop-sort-wrap">
              <SlidersHorizontal size={15} className="shop-sort-icon" />
              <select
                className="shop-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort vegetables"
              >
                <option value="featured">Sort by: Featured & Popular</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* ── CATEGORY FILTER TABS ── */}
          <div className="shop-categories-scroll-wrapper" role="tablist">
            <div className="shop-categories-pill-row">
              {categories.map((cat) => {
                const count =
                  cat.id === 'all'
                    ? vegetables.length
                    : vegetables.filter((v) => matchesCategory(v, cat.id)).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    className={`shop-category-pill ${activeCategory === cat.id ? 'is-active' : ''}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span className="cat-pill-icon">{cat.icon}</span>
                    <span className="cat-pill-label">{cat.label}</span>
                    <span className="cat-pill-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results count meta */}
          <div className="shop-results-meta" aria-live="polite">
            <span>
              Showing <strong>{processedVegetables.length}</strong> of {vegetables.length} fresh vegetables
              {searchQuery.trim() && ` matching "${searchQuery}"`}
              {activeCategory !== 'all' && ` in selected category`}
            </span>
            {(searchQuery.trim() || activeCategory !== 'all') && (
              <button
                type="button"
                className="shop-reset-filters-btn"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                Reset all filters
              </button>
            )}
          </div>

          {/* Catalog State & Grid */}
          {loading ? (
            <div className="shop-loading-state">
              <div className="shop-loading-spinner" />
              <p>Loading fresh vegetables from local farms…</p>
            </div>
          ) : processedVegetables.length === 0 ? (
            /* Clean Empty State */
            <div className="shop-empty-state" role="status">
              <div className="shop-empty-icon" aria-hidden="true">
                <Search size={36} />
              </div>
              <h3 className="shop-empty-title">No vegetables found</h3>
              <p className="shop-empty-desc">
                We couldn't find any fresh vegetables matching your search or filter. Try a different
                name or reset your filters.
              </p>
              <button
                type="button"
                id="shop-empty-clear-btn"
                className="btn btn-primary"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
              >
                Show All {vegetables.length} Vegetables
              </button>
            </div>
          ) : (
            /* Product Grid */
            <div className="product-grid" id="shop-product-grid">
              {processedVegetables.map((veg) => (
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

      {/* ── Closing Delivery CTA ── */}
      <section id="delivery-cta" ref={ctaSectionRef} className="delivery-cta-section" aria-label="Call to action">
        <div className="container">
          <div className="delivery-cta-banner">
            <div className="delivery-cta-content">
              <span className="delivery-cta-eyebrow">
                <Leaf size={14} style={{ display: 'inline', marginRight: 6 }} />
                Muzaffargarh Doorstep Service
              </span>
              <h2 className="delivery-cta-title">
                Fresh, Clean Vegetables Delivered in 30-45 Minutes.
              </h2>
              <p className="delivery-cta-subtext">
                Select your vegetables, specify exact weights, and pay Cash on Delivery.
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
