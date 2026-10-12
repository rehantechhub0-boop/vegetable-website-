import { useEffect, useState, useRef } from 'react';
import type React from 'react';
import {
  Leaf, ShoppingBag, Phone, Sparkles, Truck, ShieldCheck,
  CheckCircle, X, Search, Menu, User, ChevronDown,
  Scale, ArrowRight, MapPin, Clock, MessageCircle, LogIn
} from 'lucide-react';
import { VegetableCard, VegetableItem, CartEntry } from './components/VegetableCard';
import { VegetablesPage } from './pages/VegetablesPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage, ConfirmedOrder } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { useAuthStore } from './store/authStore';

/* ────────────────────────────────────────────────────────────────── */

interface StoreSettings {
  brandName: string;
  brandTagline: string;
  contactPhone: string;
  currency: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  defaultDeliveryFee: number;
  minOrderAmount: number;
}

/* ────────────────────────────────────────────────────────────────── */

interface HowStep {
  n: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  weightOptions?: string[];
}

const HOW_STEPS: HowStep[] = [
  {
    n: '01',
    title: 'Choose Vegetables',
    desc: 'Customer browses fresh vegetables.',
    icon: <Search size={20} />,
  },
  {
    n: '02',
    title: 'Select Your Weight',
    desc: 'Choose:',
    weightOptions: ['250g', '500g', '1kg', '2kg', '5kg', '10kg', 'or Custom above 10kg'],
    icon: <Scale size={20} />,
  },
  {
    n: '03',
    title: 'Place Your Order',
    desc: 'Review the cart and submit delivery details.',
    icon: <CheckCircle size={20} />,
  },
  {
    n: '04',
    title: 'Get It Delivered',
    desc: 'Receive the order at the selected delivery location.',
    icon: <Truck size={20} />,
  },
];

const BENEFITS: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: <Leaf size={18} />,
    title: 'Fresh Vegetables',
    desc: 'Sourced daily and prepared fresh for your home cooking needs.',
  },
  {
    icon: <Scale size={18} />,
    title: 'Buy Exactly by Weight',
    desc: 'Choose fixed weights from 250g to 10kg, or enter custom bulk quantities.',
  },
  {
    icon: <Truck size={18} />,
    title: 'Local Delivery',
    desc: 'Direct doorstep delivery across Muzaffargarh addresses.',
  },
  {
    icon: <ShieldCheck size={18} />,
    title: 'Simple Ordering',
    desc: 'Straightforward cart review with payment on delivery.',
  },
];

/* ────────────────────────────────────────────────────────────────── */

const CART_STORAGE_KEY = 'muzaffargarh_vegetable_cart';
const LAST_ORDER_STORAGE_KEY = 'muzaffargarh_last_order';

export default function App() {
  const [settings, setSettings]     = useState<StoreSettings | null>(null);
  const [vegetables, setVegetables] = useState<VegetableItem[]>([]);
  const [cart, setCart]             = useState<CartEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse cart from localStorage:', e);
      }
    }
    return [];
  });

  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse last order from sessionStorage:', e);
      }
    }
    return null;
  });

  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  /* ── Routing state ──────────────────────────────────────────────
     Supports: '/' | '/vegetables' | '/vegetables/:slug' | '/cart' | '/checkout' | '/order-success' | '/login' | '/register' | '/account'
  ─────────────────────────────────────────────────────────────── */
  const parseRoute = (pathname: string): { path: string; slug: string | null; orderNumber: string | null } => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] === 'vegetables' && parts[1]) {
      return { path: '/vegetables/:slug', slug: parts[1], orderNumber: null };
    }
    if (parts[0] === 'vegetables') return { path: '/vegetables', slug: null, orderNumber: null };
    if (parts[0] === 'cart') return { path: '/cart', slug: null, orderNumber: null };
    if (parts[0] === 'checkout') return { path: '/checkout', slug: null, orderNumber: null };
    if (parts[0] === 'order-success') return { path: '/order-success', slug: null, orderNumber: null };
    if (parts[0] === 'login') return { path: '/login', slug: null, orderNumber: null };
    if (parts[0] === 'register') return { path: '/register', slug: null, orderNumber: null };
    if (parts[0] === 'account') {
      if (parts[1] === 'orders' && parts[2]) {
        return { path: '/account/orders/:orderNumber', slug: null, orderNumber: parts[2] };
      }
      return { path: '/account', slug: null, orderNumber: null };
    }
    return { path: '/', slug: null, orderNumber: null };
  };

  const [currentRoute, setCurrentRoute] = useState<{ path: string; slug: string | null; orderNumber: string | null }>(() => {
    if (typeof window !== 'undefined') return parseRoute(window.location.pathname);
    return { path: '/', slug: null, orderNumber: null };
  });

  const currentPath = currentRoute.path;

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [cart]);

  const shopSectionRef  = useRef<HTMLElement>(null);
  const heroRef         = useRef<HTMLElement>(null);   // hero section
  const heroImgRef      = useRef<HTMLDivElement>(null); // image wrapper — parallaxes independently
  const howSectionRef   = useRef<HTMLElement>(null);   // How It Works section
  const ctaSectionRef   = useRef<HTMLElement>(null);   // Delivery CTA section

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(parseRoute(path));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToProduct = (slug: string) => {
    const path = `/vegetables/${slug}`;
    window.history.pushState({}, '', path);
    setCurrentRoute({ path: '/vegetables/:slug', slug, orderNumber: null });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parseRoute(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  /* Auth state */
  const authUser = useAuthStore((s) => s.user);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const logout = useAuthStore((s) => s.logout);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* Load store data + check auth on mount */
  useEffect(() => {
    async function load() {
      try {
        const [sRes, vRes] = await Promise.all([
          fetch('/api/v1/settings'),
          fetch('/api/v1/vegetables'),
        ]);
        const [sData, vData] = await Promise.all([sRes.json(), vRes.json()]);
        if (sData.success) setSettings(sData.data);
        if (vData.success) setVegetables(vData.data);
      } catch (e) {
        console.error('Failed to load store data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
    checkAuth();
  }, []);

  /* ── Scroll-linked Animations ─────────────────────────────────────
     - Hero image parallax
     - How It Works 4-step natural scroll progression (reverses on scroll up)
     - Delivery CTA background motif subtle movement
     All values are CSS custom properties updated via rAF — no layout thrashing.
     Respects prefers-reduced-motion.
  ────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    let tick = false;

    const update = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;

      // 1. Hero Image parallax: moves up slower than page scroll
      if (heroImgRef.current) {
        const rate = Math.min(y * 0.18, 80);
        heroImgRef.current.style.setProperty('--hero-img-offset', `${rate}px`);
      }

      // 2. How It Works: subtle scroll-linked animation per step
      if (howSectionRef.current) {
        const rect = howSectionRef.current.getBoundingClientRect();
        const rawProgress = (vh - rect.top) / (vh * 0.75);
        for (let i = 0; i < 4; i++) {
          const stepProgress = Math.max(0, Math.min(1, (rawProgress - i * 0.1) / 0.6));
          const offsetY = (1 - stepProgress) * 20; // 20px -> 0px
          const opacity = 0.4 + stepProgress * 0.6; // 0.4 -> 1.0
          howSectionRef.current.style.setProperty(`--step-y-${i}`, `${offsetY.toFixed(1)}px`);
          howSectionRef.current.style.setProperty(`--step-op-${i}`, `${opacity.toFixed(2)}`);
        }
      }

      // 3. Delivery CTA: subtle scroll-linked motif shift
      if (ctaSectionRef.current) {
        const rect = ctaSectionRef.current.getBoundingClientRect();
        const rawProgress = (vh - rect.top) / (vh * 0.8);
        const progress = Math.max(0, Math.min(1, rawProgress));
        const ctaOffset = (1 - progress) * 16;
        ctaSectionRef.current.style.setProperty('--cta-offset', `${ctaOffset.toFixed(1)}px`);
      }

      tick = false;
    };

    const onScroll = () => {
      if (!tick) {
        requestAnimationFrame(update);
        tick = true;
      }
    };

    update(); // initial call
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Cart helpers */
  const handleAddToCart = (entry: CartEntry) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === entry.id);
      if (idx > -1) {
        const updated = [...prev];
        const cur = updated[idx];
        const newQty = cur.quantity + entry.quantity;
        updated[idx] = { ...cur, quantity: newQty, itemTotal: Math.round(cur.unitPrice * newQty * 100) / 100 };
        return updated;
      }
      return [...prev, entry];
    });
    setToast(`${entry.vegetable.name} (${entry.weightDisplay}) added to cart`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQty,
            itemTotal: Math.round(item.unitPrice * newQty * 100) / 100,
          };
        }
        return item;
      });
    });
  };

  const handleRemoveItem = (id: string) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        setToast(`Removed ${item.vegetable.name} from cart`);
        setTimeout(() => setToast(null), 2500);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const cartCount  = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal  = cart.reduce((s, c) => s + c.itemTotal, 0);

  /* Filtered vegetables */
  const filteredVeg = vegetables.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const brandName = settings?.brandName || 'Fresh Vegetables Muzaffargarh';

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── 1. ANNOUNCEMENT BAR ─────────────────────────────────── */}
      <aside className="announcement-bar" aria-label="Store announcement">
        <div className="container announcement-inner">
          <span className="announcement-text">
            <Sparkles size={14} color="var(--accent-500)" />
            Fresh vegetables&nbsp;·&nbsp;Local delivery&nbsp;·&nbsp;Simple ordering
          </span>
          <a
            href={`tel:${settings?.contactPhone || ''}`}
            className="announcement-contact"
          >
            <Phone size={13} />
            {settings?.contactPhone || '0300-1234567'}
          </a>
        </div>
      </aside>

      {/* ── 2. NAVBAR ────────────────────────────────────────────── */}
      <header className="site-header">
        <div className="container nav-container">

          {/* Brand */}
          <a className="nav-brand" onClick={(e) => { e.preventDefault(); navigate('/'); }} href="/" aria-label="Home">
            <div className="nav-logo-icon">
              <Leaf size={24} />
            </div>
            <div>
              <p className="nav-brand-title">{brandName}</p>
              <p className="nav-brand-tagline">
                {settings?.brandTagline || 'Farm-to-doorstep delivery'}
              </p>
            </div>
          </a>

          {/* Desktop nav links */}
          <nav aria-label="Primary navigation">
            <ul className="nav-menu">
              <li>
                <a
                  href="/"
                  className={`nav-link${currentPath === '/' ? ' active' : ''}`}
                  onClick={(e) => { e.preventDefault(); navigate('/'); }}
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/vegetables"
                  className={`nav-link${currentPath === '/vegetables' ? ' active' : ''}`}
                  onClick={(e) => { e.preventDefault(); navigate('/vegetables'); }}
                >
                  Vegetables
                </a>
              </li>
            </ul>
          </nav>

          {/* Desktop search + cart + account */}
          <div className="nav-actions">
            <div className="nav-search-box">
              <Search size={15} className="nav-search-icon" />
              <input
                type="search"
                placeholder="Search vegetables…"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (currentPath !== '/vegetables' && e.target.value.trim().length > 0) {
                    navigate('/vegetables');
                  }
                }}
                className="nav-search-input"
                aria-label="Search vegetables"
              />
            </div>

            <button
              type="button"
              className="nav-icon-btn"
              style={{
                borderColor: cartCount > 0 ? 'var(--primary-500)' : undefined,
                backgroundColor: cartCount > 0 ? 'var(--primary-50)' : undefined,
              }}
              onClick={() => {
                navigate('/cart');
              }}
              aria-label={`Cart — ${cartCount} items`}
            >
              <div style={{ position: 'relative' }}>
                <ShoppingBag size={17} />
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -8, right: -10,
                    background: 'var(--primary-700)', color: '#fff',
                    fontSize: '0.65rem', fontWeight: 800,
                    width: 17, height: 17, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {cartCount}
                  </span>
                )}
              </div>
              {cartCount > 0 ? `Rs. ${cartTotal.toLocaleString()}` : 'Cart'}
            </button>

            {authUser ? (
              <div className="nav-user-dropdown-wrap" ref={userMenuRef}>
                <button
                  type="button"
                  className={`nav-user-trigger-btn ${userMenuOpen ? 'active' : ''}`}
                  onClick={() => setUserMenuOpen((p) => !p)}
                  aria-expanded={userMenuOpen}
                  aria-label="User Account Menu"
                >
                  <User size={16} />
                  <span>{authUser.name.split(' ')[0]}</span>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>

                {userMenuOpen && (
                  <div className="nav-user-dropdown-menu" role="menu">
                    <button
                      type="button"
                      className="nav-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/account');
                      }}
                    >
                      <User size={15} />
                      <span>My Account</span>
                    </button>
                    <button
                      type="button"
                      className="nav-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/account');
                      }}
                    >
                      <ShoppingBag size={15} />
                      <span>My Orders</span>
                    </button>
                    <div className="nav-dropdown-divider" />
                    <button
                      type="button"
                      className="nav-dropdown-item danger-item"
                      role="menuitem"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await logout();
                        navigate('/');
                      }}
                    >
                      <LogIn size={15} style={{ transform: 'rotate(180deg)' }} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="nav-icon-btn"
                aria-label="Login"
                onClick={() => navigate('/login')}
              >
                <LogIn size={17} />
                <span>Login</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="mobile-toggle-btn"
              onClick={() => setMobileNavOpen(p => !p)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileNavOpen && (
          <div className="mobile-nav-drawer">
            <div className="mobile-search-wrap">
              <div className="nav-search-box" style={{ width: '100%' }}>
                <Search size={15} className="nav-search-icon" />
                <input
                  type="search"
                  placeholder="Search vegetables…"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    if (currentPath !== '/vegetables' && e.target.value.trim().length > 0) {
                      setMobileNavOpen(false);
                      navigate('/vegetables');
                    }
                  }}
                  className="nav-search-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <ul className="mobile-nav-list">
              <li>
                <a
                  href="/"
                  className="mobile-nav-link"
                  onClick={(e) => { e.preventDefault(); setMobileNavOpen(false); navigate('/'); }}
                >
                  Home <ChevronDown size={15} />
                </a>
              </li>
              <li>
                <a
                  href="/vegetables"
                  className="mobile-nav-link"
                  onClick={(e) => { e.preventDefault(); setMobileNavOpen(false); navigate('/vegetables'); }}
                >
                  Vegetables <ChevronDown size={15} />
                </a>
              </li>
              <li>
                <a
                  href="/cart"
                  className="mobile-nav-link"
                  onClick={(e) => { e.preventDefault(); setMobileNavOpen(false); navigate('/cart'); }}
                >
                  Cart ({cartCount}) <ChevronDown size={15} />
                </a>
              </li>
              {authUser ? (
                <>
                  <li>
                    <a
                      href="/account"
                      className="mobile-nav-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setMobileNavOpen(false);
                        navigate('/account');
                      }}
                    >
                      My Account ({authUser.name.split(' ')[0]}) <ChevronDown size={15} />
                    </a>
                  </li>
                  <li>
                    <a
                      href="/account"
                      className="mobile-nav-link"
                      onClick={(e) => {
                        e.preventDefault();
                        setMobileNavOpen(false);
                        navigate('/account');
                      }}
                    >
                      My Orders <ChevronDown size={15} />
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="mobile-nav-link"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        color: 'var(--status-danger)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onClick={async () => {
                        setMobileNavOpen(false);
                        await logout();
                        navigate('/');
                      }}
                    >
                      <span>Logout</span>
                      <LogIn size={15} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <a
                    href="/login"
                    className="mobile-nav-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileNavOpen(false);
                      navigate('/login');
                    }}
                  >
                    Login / Register <ChevronDown size={15} />
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      {currentPath === '/login' ? (
        <LoginPage
          onNavigateHome={() => navigate('/')}
          onNavigateRegister={() => navigate('/register')}
          onSuccess={() => navigate('/account')}
        />
      ) : currentPath === '/register' ? (
        <RegisterPage
          onNavigateHome={() => navigate('/')}
          onNavigateLogin={() => navigate('/login')}
          onSuccess={() => navigate('/account')}
        />
      ) : currentPath === '/account' || currentPath === '/account/orders/:orderNumber' ? (
        authUser ? (
          <AccountPage
            onNavigateShop={() => navigate('/vegetables')}
            onNavigateHome={() => navigate('/')}
            activeOrderNumber={currentRoute.orderNumber}
          />
        ) : (
          <LoginPage
            onNavigateHome={() => navigate('/')}
            onNavigateRegister={() => navigate('/register')}
            onSuccess={() => navigate('/account')}
          />
        )
      ) : currentPath === '/cart' ? (
        <CartPage
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onNavigateShop={() => navigate('/vegetables')}
          onNavigateCheckout={() => navigate('/checkout')}
          onNavigateProduct={navigateToProduct}
        />
      ) : currentPath === '/checkout' ? (
        cart.length === 0 ? (
          // Redirect empty cart automatically to /cart
          <CartPage
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onNavigateShop={() => navigate('/vegetables')}
            onNavigateCheckout={() => navigate('/checkout')}
            onNavigateProduct={navigateToProduct}
          />
        ) : (
          <CheckoutPage
            cart={cart}
            onNavigateCart={() => navigate('/cart')}
            onOrderSuccess={(order) => {
              setConfirmedOrder(order);
              try {
                sessionStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(order));
              } catch (e) {
                console.error('Failed to save confirmed order to sessionStorage:', e);
              }
              // CLEAR CART ONLY AFTER CONFIRMED SUCCESS
              setCart([]);
              try {
                localStorage.removeItem(CART_STORAGE_KEY);
              } catch (e) {
                console.error('Failed to clear cart in localStorage:', e);
              }
              navigate('/order-success');
            }}
          />
        )
      ) : currentPath === '/order-success' ? (
        <OrderSuccessPage
          order={confirmedOrder}
          onNavigateShop={() => navigate('/vegetables')}
          onNavigateTracking={(orderNumber) => {
            setToast(`Order ${orderNumber} is confirmed! Tracking system is coming in the next update.`);
            setTimeout(() => setToast(null), 4000);
          }}
        />
      ) : currentPath === '/vegetables/:slug' && currentRoute.slug ? (
        <ProductDetailPage
          slug={currentRoute.slug}
          vegetables={vegetables}
          loading={loading}
          onAddToCart={handleAddToCart}
          onNavigateHome={() => navigate('/')}
          onNavigateShop={() => navigate('/vegetables')}
        />
      ) : currentPath === '/vegetables' ? (
        <VegetablesPage
          vegetables={vegetables}
          loading={loading}
          onAddToCart={handleAddToCart}
          onNavigateHome={() => navigate('/')}
          onNavigateProduct={navigateToProduct}
          ctaSectionRef={ctaSectionRef}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      ) : (
        <main>

        {/* ── 3. HERO ──────────────────────────────────────────── */}
        <section id="home" ref={heroRef} className="hero-section" aria-label="Hero">

          {/* Decorative background blobs — pure CSS, no JS */}
          <div className="hero-bg-blob hero-bg-blob--1" aria-hidden="true" />
          <div className="hero-bg-blob hero-bg-blob--2" aria-hidden="true" />

          <div className="container hero-grid">

            {/* ── LEFT: Copy ─────────────────────────────────── */}
            <div className="hero-copy">

              {/* Eyebrow label */}
              <div className="hero-eyebrow">
                <Leaf size={13} />
                <span>Muzaffargarh Fresh Vegetable Delivery</span>
              </div>

              {/* Main headline */}
              <h1 className="hero-headline">
                Fresh Vegetables,<br />
                <span className="hero-headline-accent">Delivered</span> to<br />
                Your Doorstep
              </h1>

              {/* Supporting copy */}
              <p className="hero-subtext">
                Choose any vegetable by weight — 250g up to bulk quantities.
                Place your order and we deliver fresh to your home in Muzaffargarh.
              </p>

              {/* CTAs */}
              <div className="hero-actions">
                <button
                  type="button"
                  id="hero-cta-primary"
                  className="hero-btn hero-btn--primary"
                  onClick={() => navigate('/vegetables')}
                >
                  Shop Vegetables <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  id="hero-cta-secondary"
                  className="hero-btn hero-btn--secondary"
                  onClick={() => navigate('/vegetables')}
                >
                  See Today's Prices
                </button>
              </div>

              {/* Trust indicators */}
              <ul className="hero-trust-list" aria-label="Why order with us">
                <li className="hero-trust-item">
                  <CheckCircle size={15} className="hero-trust-icon" />
                  Cash on Delivery
                </li>
                <li className="hero-trust-item">
                  <Truck size={15} className="hero-trust-icon" />
                  Local Delivery
                </li>
                <li className="hero-trust-item">
                  <Scale size={15} className="hero-trust-icon" />
                  Buy by Weight
                </li>
              </ul>

            </div>

            {/* ── RIGHT: Visual ──────────────────────────────── */}
            <div className="hero-visual">

              {/* Image wrapper — this element is directly parallaxed via JS */}
              <div
                ref={heroImgRef}
                className="hero-img-frame"
                style={{ transform: 'translateY(var(--hero-img-offset, 0px))' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=85"
                  alt="A vibrant selection of fresh vegetables"
                  className="hero-img"
                  width="1000"
                  height="700"
                  loading="eager"
                  fetchPriority="high"
                />
                {/* Subtle green overlay at the bottom to blend into section bg */}
                <div className="hero-img-scrim" aria-hidden="true" />
              </div>

              {/* Floating info card — only shown on desktop */}
              <div className="hero-info-card" aria-hidden="true">
                <div className="hero-info-card__line">
                  <span className="hero-info-card__label">Available today</span>
                  <span className="hero-info-card__value">
                    {vegetables.length > 0 ? `${vegetables.length} varieties` : 'Fresh vegetables'}
                  </span>
                </div>
                <div className="hero-info-card__divider" />
                <div className="hero-info-card__line">
                  <MapPin size={13} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <span className="hero-info-card__value">Muzaffargarh delivery</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── 4. FRESH VEGETABLES ──────────────────────────────── */}
        <section
          id="vegetables"
          ref={shopSectionRef}
          style={{ padding: '4rem 0' }}
          aria-label="Vegetable catalog"
        >
          <div className="container">
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem',
              marginBottom: '2rem',
            }}>
              <div className="section-intro" style={{ marginBottom: 0 }}>
                <span className="section-eyebrow">Daily Fresh</span>
                <h2 className="section-title">Fresh Vegetables</h2>
                <p className="section-subtitle">
                  Select your weight — 250g to 10kg fixed, or custom bulk orders above 10kg.
                  {searchQuery && ` Showing results for "${searchQuery}".`}
                </p>
              </div>

              {/* Trust badges & View All link */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Truck size={15} color="var(--primary-600)" /> Fast Delivery
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={15} color="var(--primary-600)" /> COD Available
                  </span>
                </div>
                <button
                  type="button"
                  id="section-view-all-btn"
                  onClick={() => navigate('/vegetables')}
                  className="view-all-veg-btn"
                >
                  View All Vegetables ({vegetables.length}) <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                Loading fresh vegetables…
              </div>
            ) : filteredVeg.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
                No vegetables found for "{searchQuery}". Try a different search.
              </div>
            ) : (
              <div className="product-grid">
                {filteredVeg.map(veg => (
                  <VegetableCard key={veg.id} vegetable={veg} onAddToCart={handleAddToCart} onNavigateToProduct={() => navigateToProduct(veg.slug)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 5. HOW IT WORKS ──────────────────────────────────── */}
        <section id="how-it-works" ref={howSectionRef} className="how-it-works-section" aria-label="How it works">
          <div className="container">
            <div className="section-intro" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="section-eyebrow">Simple Ordering</span>
              <h2 className="section-title">How It Works</h2>
              <p className="section-subtitle" style={{ margin: '0.5rem auto 0', textAlign: 'center' }}>
                Order fresh vegetables in four simple steps
              </p>
            </div>
            <div className="steps-grid">
              {HOW_STEPS.map((step, index) => (
                <div
                  key={step.n}
                  className="step-card"
                  style={{
                    transform: `translateY(var(--step-y-${index}, 0px))`,
                    opacity: `var(--step-op-${index}, 1)`,
                  }}
                >
                  <div className="step-header">
                    <span className="step-number">{step.n}</span>
                    <div className="step-icon-wrap" aria-hidden="true">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                  {step.weightOptions && (
                    <div className="step-weight-chips" aria-label="Available weight options">
                      {step.weightOptions.map(w => (
                        <span key={w} className="step-weight-chip">{w}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. WHY CHOOSE US ─────────────────────────────────── */}
        <section id="why-choose-us" className="why-choose-us-section" aria-label="Why choose us">
          <div className="container">
            <div className="section-intro" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="section-eyebrow">Our Service</span>
              <h2 className="section-title">Why Choose Us</h2>
            </div>
            <div className="benefits-grid">
              {BENEFITS.map(b => (
                <div key={b.title} className="benefit-card">
                  <div className="benefit-icon-wrap" aria-hidden="true">{b.icon}</div>
                  <h3 className="benefit-title">{b.title}</h3>
                  <p className="benefit-desc">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. DELIVERY CTA ──────────────────────────────────── */}
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
                onClick={() => navigate('/vegetables')}
              >
                Shop Vegetables <ArrowRight size={16} style={{ display: 'inline', marginLeft: 4 }} />
              </button>
            </div>
          </div>
        </section>

      </main>
      )}

      {/* ── 8. FOOTER ────────────────────────────────────────────── */}
      <footer id="site-footer" className="site-footer" aria-label="Site footer">
        <div className="container">
          <div className="footer-grid">

            {/* Brand column */}
            <div className="footer-brand-col">
              <a href="/" className="footer-brand" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                <div className="nav-logo-icon" aria-hidden="true">
                  <Leaf size={20} />
                </div>
                <div>
                  <span className="footer-brand-name">{brandName}</span>
                  <p className="footer-brand-tagline">
                    {settings?.brandTagline || 'Farm-to-doorstep delivery'}
                  </p>
                </div>
              </a>
              <p className="footer-desc">
                Fresh vegetables delivered directly to homes across Muzaffargarh.
              </p>
            </div>

            {/* Shop link */}
            <div>
              <p className="footer-col-title">Shop</p>
              <ul className="footer-links">
                <li>
                  <a
                    href="/vegetables"
                    id="footer-shop-link"
                    className="footer-link"
                    onClick={(e) => { e.preventDefault(); navigate('/vegetables'); }}
                  >
                    Vegetables / Shop
                  </a>
                </li>
                <li>
                  <a
                    href="/#how-it-works"
                    className="footer-link"
                    onClick={(e) => {
                      if (currentPath !== '/') {
                        e.preventDefault();
                        navigate('/');
                        setTimeout(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }), 120);
                      }
                    }}
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a
                    href="/#why-choose-us"
                    className="footer-link"
                    onClick={(e) => {
                      if (currentPath !== '/') {
                        e.preventDefault();
                        navigate('/');
                        setTimeout(() => document.getElementById('why-choose-us')?.scrollIntoView({ behavior: 'smooth' }), 120);
                      }
                    }}
                  >
                    Why Choose Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Delivery column */}
            <div>
              <p className="footer-col-title">Delivery Info</p>
              <ul className="footer-links">
                <li className="footer-info-item">
                  <MapPin size={14} className="footer-info-icon" />
                  <span>Muzaffargarh Local Delivery</span>
                </li>
                <li className="footer-info-item">
                  <ShieldCheck size={14} className="footer-info-icon" />
                  <span>Cash on Delivery (COD)</span>
                </li>
                {settings?.minOrderAmount ? (
                  <li className="footer-info-item">
                    <Clock size={14} className="footer-info-icon" />
                    <span>Min. Order: Rs. {settings.minOrderAmount}</span>
                  </li>
                ) : null}
              </ul>
            </div>

            {/* Contact & Account column */}
            <div>
              <p className="footer-col-title">Contact & Account</p>
              <ul className="footer-links">
                <li>
                  <a
                    href={`tel:${settings?.contactPhone || '0300-1234567'}`}
                    id="footer-contact-link"
                    className="footer-link"
                  >
                    <Phone size={14} />
                    <span>{settings?.contactPhone || '0300-1234567'}</span>
                  </a>
                </li>
                {settings?.whatsappEnabled && settings?.whatsappNumber && (
                  <li>
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-link"
                      aria-label="WhatsApp Contact"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>
                  </li>
                )}
                <li>
                  <a
                    href={authUser ? '/account' : '/login'}
                    id="footer-account-link"
                    className="footer-link"
                    onClick={(e) => { e.preventDefault(); navigate(authUser ? '/account' : '/login'); }}
                  >
                    <User size={14} />
                    <span>{authUser ? 'My Account' : 'Sign In / Register'}</span>
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {brandName}. All rights reserved.</span>
            <span className="footer-bottom-location">
              <MapPin size={13} /> Muzaffargarh, Punjab, Pakistan
            </span>
          </div>
        </div>
      </footer>

      {/* ── FLOATING TOAST ────────────────────────────────────────── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', bottom: 24, right: 24,
            backgroundColor: 'var(--primary-900)', color: '#fff',
            padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex', alignItems: 'center', gap: '0.65rem',
            zIndex: 9999, fontSize: '0.85rem', fontWeight: 600,
            maxWidth: 340,
          }}
        >
          <CheckCircle size={18} color="var(--primary-100)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1 }}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

    </div>
  );
}
