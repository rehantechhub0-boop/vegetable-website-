import { MouseGlow } from './components/MouseGlow';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { HomeTrustAndReviews } from './components/HomeTrustAndReviews';
import { CustomerSupportModal } from './components/CustomerSupportModal';
import { useEffect, useState, useRef } from 'react';
import type React from 'react';
import {
  Leaf, ShoppingBag, Phone, Truck, ShieldCheck,
  CheckCircle, X, Search, Menu, User, ChevronDown,
  Scale, ArrowRight, MapPin, Clock, MessageCircle, LogIn, Mail, Headphones, Home
} from 'lucide-react';
import { VegetableCard, VegetableItem, CartEntry } from './components/VegetableCard';
import { Hero3D } from './components/Hero3D';
import { LiveTicker } from './components/LiveTicker';
import { MandiNewsAndDeals } from './components/MandiNewsAndDeals';
import { AboutAndServiceSection } from './components/AboutAndServiceSection';
import { SabziAIWidget } from './components/SabziAIWidget';
import { BackToTop } from './components/BackToTop';
import { VegetablesPage } from './pages/VegetablesPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage, ConfirmedOrder } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { AdminLayout, AdminSection } from './pages/admin/AdminLayout';
import { useAuthStore } from './store/authStore';

/* ────────────────────────────────────────────────────────────────── */

interface StoreSettings {
  brandName: string;
  brandTagline: string;
  logoUrl?: string | null;
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

/* ────────────────────────────────────────────────────────────────── */

const CART_STORAGE_KEY = 'muzaffargarh_vegetable_cart';
const LAST_ORDER_STORAGE_KEY = 'muzaffargarh_last_order';
const VEG_CACHE_KEY = 'muzaffargarh_cached_vegetables';
const SETTINGS_CACHE_KEY = 'muzaffargarh_cached_settings';

export default function App() {
  const [settings, setSettings] = useState<StoreSettings | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return null;
  });
  const [vegetables, setVegetables] = useState<VegetableItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(VEG_CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });
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

  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(VEG_CACHE_KEY);
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch (e) {}
    }
    return true;
  });
  const [toast, setToast]           = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  /* ── Routing state ──────────────────────────────────────────────
     Supports: '/' | '/vegetables' | '/vegetables/:slug' | '/cart' | '/checkout' | '/order-success' | '/track-order' | '/login' | '/register' | '/account'
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
    if (parts[0] === 'track-order') {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      return {
        path: '/track-order',
        slug: searchParams.get('uuid') || null,
        orderNumber: searchParams.get('orderNumber') || parts[1] || null,
      };
    }
    if (parts[0] === 'login') return { path: '/login', slug: null, orderNumber: null };
    if (parts[0] === 'register') return { path: '/register', slug: null, orderNumber: null };
    if (parts[0] === 'account') {
      if (parts[1] === 'orders' && parts[2]) {
        return { path: '/account/orders/:orderNumber', slug: null, orderNumber: parts[2] };
      }
      return { path: '/account', slug: null, orderNumber: null };
    }
    if (parts[0] === 'admin') {
      const section = (parts[1] || 'dashboard') as AdminSection;
      return { path: '/admin', slug: section, orderNumber: parts[2] || null };
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
  const heroImgRef      = useRef<HTMLDivElement>(null); // image wrapper — parallaxes independently
  const howSectionRef   = useRef<HTMLElement>(null);   // How It Works section
  const ctaSectionRef   = useRef<HTMLElement>(null);   // Delivery CTA section

  const navigate = (path: string, params?: { orderNumber?: string; uuid?: string }) => {
    let targetUrl = path;
    if (params) {
      const sp = new URLSearchParams();
      if (params.orderNumber) sp.set('orderNumber', params.orderNumber);
      if (params.uuid) sp.set('uuid', params.uuid);
      const q = sp.toString();
      if (q) targetUrl = `${path}?${q}`;
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetUrl);
    }

    const route = parseRoute(path);
    if (params?.orderNumber) route.orderNumber = params.orderNumber;
    if (params?.uuid) route.slug = params.uuid;

    setCurrentRoute(route);
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

  // Secret Admin Shortcut: Ctrl + Shift + A or Ctrl + Alt + A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a')
      ) {
        e.preventDefault();
        navigate('/admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* Auth state */
  const authUser = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const logout = useAuthStore((s) => s.logout);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        if (sData.success) {
          setSettings(sData.data);
          try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(sData.data)); } catch (e) {}
        }
        if (vData.success && Array.isArray(vData.data)) {
          setVegetables(vData.data);
          try { localStorage.setItem(VEG_CACHE_KEY, JSON.stringify(vData.data)); } catch (e) {}
        }
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

  // Universal Scroll Entrance Observer (WordPress / Framer style)
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    );

    const elements = document.querySelectorAll('.scroll-reveal-item');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [currentPath, vegetables.length]);

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

  const homeCategory = 'all';

  const matchesHomeCategory = (veg: VegetableItem, cat: string): boolean => {
    if (cat === 'all') return true;
    if (cat === 'offers') return veg.isOffer;
    const lower = (veg.name + ' ' + veg.slug).toLowerCase();
    if (cat === 'staples') return lower.includes('aloo') || lower.includes('pyaz') || lower.includes('tamatar') || lower.includes('potato') || lower.includes('onion') || lower.includes('tomato');
    if (cat === 'greens') return lower.includes('palak') || lower.includes('spinach') || lower.includes('dhaniya') || lower.includes('pudina') || lower.includes('mint') || lower.includes('coriander');
    if (cat === 'salad') return lower.includes('kheera') || lower.includes('cucumber') || lower.includes('mooli') || lower.includes('gajar') || lower.includes('carrot') || lower.includes('radish') || lower.includes('chukandar') || lower.includes('lemon') || lower.includes('nimbu');
    if (cat === 'spices') return lower.includes('mirch') || lower.includes('adrak') || lower.includes('lehsan') || lower.includes('chilli') || lower.includes('ginger') || lower.includes('garlic');
    return true;
  };

  /* Filtered vegetables */
  const filteredVeg = vegetables.filter(v => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && matchesHomeCategory(v, homeCategory);
  });

  const brandName = settings?.brandName || 'Veggie House';

  /* ── ADMIN PANEL ROUTE GUARD ──────────────────────────────────────── */
  if (currentPath === '/admin') {
    if (authLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', color: 'var(--text-muted)' }}>
          <Clock size={32} className="spin-icon" color="var(--primary-600)" />
          <p>Verifying administrative credentials...</p>
        </div>
      );
    }

    if (!authUser) {
      return (
        <LoginPage
          onNavigateHome={() => navigate('/')}
          onNavigateRegister={() => navigate('/register')}
          onSuccess={() => navigate('/admin')}
        />
      );
    }

    if (!['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'EDITOR', 'VIEWER'].includes(authUser.role)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-headline)', marginBottom: '0.5rem' }}>
            Access Denied (403 Forbidden)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Administrator credentials are required to access this portal. Your signed-in account is a customer account.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="admin-btn admin-btn--primary"
            >
              Back to Store
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="admin-btn admin-btn--secondary"
            >
              Sign in as Admin
            </button>
          </div>
        </div>
      );
    }

    return (
      <AdminLayout
        currentSection={(currentRoute.slug as AdminSection) || 'dashboard'}
        subParam={currentRoute.orderNumber}
        onNavigateSection={(sec, param) => {
          navigate(`/admin/${sec}`, param ? { orderNumber: param } : undefined);
        }}
        onNavigateStore={() => navigate('/')}
      />
    );
  }

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <MouseGlow />

      {/* ── 1. UNIFIED HEADER GROUP (LIVE TICKER + NAVBAR) ───────── */}
      <div className="site-sticky-header-group">
        <LiveTicker
          contactPhone={settings?.contactPhone && !settings.contactPhone.includes('0300') ? settings.contactPhone : '0342-7883728'}
        />

        {/* ── 2. NAVBAR ────────────────────────────────────────────── */}
        <header className="site-header">
        <div className="container nav-container">

          {/* Brand */}
          <a className="nav-brand" onClick={(e) => { e.preventDefault(); navigate('/'); }} href="/" aria-label="Home">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={brandName}
                className="nav-brand-custom-logo"
              />
            ) : (
              <div className="nav-logo-icon">
                <Leaf size={22} />
              </div>
            )}
            <div className="nav-brand-text-wrap">
              <span className="nav-brand-title">
                {brandName}
              </span>
              <span className="nav-brand-tagline">
                {settings?.brandTagline || 'Farm-to-doorstep delivery'}
              </span>
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
                  <Home size={15} />
                  <span>Home</span>
                </a>
              </li>
              <li>
                <a
                  href="/vegetables"
                  className={`nav-link${currentPath === '/vegetables' ? ' active' : ''}`}
                  onClick={(e) => { e.preventDefault(); navigate('/vegetables'); }}
                >
                  <Leaf size={15} />
                  <span>Vegetables</span>
                </a>
              </li>
              <li>
                <a
                  href="/track-order"
                  className={`nav-link${currentPath === '/track-order' ? ' active' : ''}`}
                  onClick={(e) => { e.preventDefault(); navigate('/track-order'); }}
                >
                  <Truck size={15} />
                  <span>Track Order</span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  className="nav-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                  onClick={() => setIsSupportOpen(true)}
                >
                  <Headphones size={15} />
                  <span>Support</span>
                </button>
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
                overflow: 'visible',
              }}
              onClick={() => {
                navigate('/cart');
              }}
              aria-label={`Cart — ${cartCount} items`}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={18} color={cartCount > 0 ? 'var(--primary-700)' : 'currentColor'} />
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -8,
                    right: -9,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    minWidth: '17px',
                    height: '17px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    border: '2px solid #ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    lineHeight: 1,
                  }}>
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="nav-btn-label" style={{ fontWeight: 700, marginLeft: cartCount > 0 ? '6px' : '0' }}>
                {cartCount > 0 ? `Rs. ${cartTotal.toLocaleString()}` : 'Cart'}
              </span>
            </button>

            {authUser ? (
              <div className="nav-user-dropdown-wrap nav-desktop-auth" ref={userMenuRef}>
                <button
                  type="button"
                  className={`nav-user-trigger-btn ${userMenuOpen ? 'active' : ''}`}
                  onClick={() => setUserMenuOpen((p) => !p)}
                  aria-expanded={userMenuOpen}
                  aria-label="User Account Menu"
                >
                  <User size={16} />
                  <span className="nav-user-name">{authUser.name.split(' ')[0]}</span>
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
                    {['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'EDITOR'].includes(authUser?.role || '') && (
                      <button
                        type="button"
                        className="nav-dropdown-item"
                        style={{ color: 'var(--primary-700)', fontWeight: 600 }}
                        role="menuitem"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/admin');
                        }}
                      >
                        <ShieldCheck size={15} />
                        <span>Admin Panel</span>
                      </button>
                    )}
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
                className="nav-icon-btn nav-desktop-auth"
                aria-label="Login"
                onClick={() => navigate('/login')}
              >
                <LogIn size={17} />
                <span className="nav-btn-label">Login</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="mobile-toggle-btn"
              onClick={() => setMobileNavOpen(p => !p)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
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
                  href="/track-order"
                  className="mobile-nav-link"
                  onClick={(e) => { e.preventDefault(); setMobileNavOpen(false); navigate('/track-order'); }}
                >
                  Track Order <ChevronDown size={15} />
                </a>
              </li>
              <li>
                <button
                  type="button"
                  className="mobile-nav-link"
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => { setMobileNavOpen(false); setIsSupportOpen(true); }}
                >
                  <span>Customer Support</span> <Headphones size={15} />
                </button>
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
                  {['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'EDITOR'].includes(authUser.role) && (
                    <li>
                      <a
                        href="/admin"
                        className="mobile-nav-link"
                        style={{ color: 'var(--primary-700)', fontWeight: 700 }}
                        onClick={(e) => {
                          e.preventDefault();
                          setMobileNavOpen(false);
                          navigate('/admin');
                        }}
                      >
                        Admin Panel <ChevronDown size={15} />
                      </a>
                    </li>
                  )}
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
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      {currentPath === '/login' ? (
        <LoginPage
          onNavigateHome={() => navigate('/')}
          onNavigateRegister={() => navigate('/register')}
          onSuccess={() => {
            const redirect = sessionStorage.getItem('redirect_after_auth');
            if (redirect) {
              sessionStorage.removeItem('redirect_after_auth');
              navigate(redirect);
            } else {
              navigate('/account');
            }
          }}
        />
      ) : currentPath === '/register' ? (
        <RegisterPage
          onNavigateHome={() => navigate('/')}
          onNavigateLogin={() => navigate('/login')}
          onSuccess={() => {
            const redirect = sessionStorage.getItem('redirect_after_auth');
            if (redirect) {
              sessionStorage.removeItem('redirect_after_auth');
              navigate(redirect);
            } else {
              navigate('/account');
            }
          }}
        />
      ) : currentPath === '/account' || currentPath === '/account/orders/:orderNumber' ? (
        authUser ? (
          <AccountPage
            onNavigateShop={() => navigate('/vegetables')}
            onNavigateHome={() => navigate('/')}
            onNavigateTrackOrder={(orderNumber) => navigate('/track-order', { orderNumber })}
            activeOrderNumber={currentRoute.orderNumber}
          />
        ) : (
          <LoginPage
            onNavigateHome={() => navigate('/')}
            onNavigateRegister={() => navigate('/register')}
            onSuccess={() => {
              const redirect = sessionStorage.getItem('redirect_after_auth');
              if (redirect) {
                sessionStorage.removeItem('redirect_after_auth');
                navigate(redirect);
              } else {
                navigate('/account');
              }
            }}
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
          onNavigateTracking={(orderNumber, uuid) => {
            navigate('/track-order', { orderNumber, uuid });
          }}
        />
      ) : currentPath === '/track-order' ? (
        <TrackOrderPage
          initialOrderNumber={currentRoute.orderNumber}
          initialUuid={currentRoute.slug}
          onNavigateShop={() => navigate('/vegetables')}
          onNavigateHome={() => navigate('/')}
          onNavigateAccount={() => navigate('/account')}
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

        {/* ── 3. HERO (3D MOUSE TILT & FARM-TO-TABLE SCROLL FRAMES) ── */}
        <Hero3D
          vegetableCount={vegetables.length}
          onShopClick={() => navigate('/vegetables')}
          onPricesClick={() => navigate('/vegetables')}
        />

        {/* ── 4. TODAY'S MANDI NEWS & FLASH SALES ────────────────── */}
        <MandiNewsAndDeals
          vegetables={vegetables}
          onNavigateVegetables={() => navigate('/vegetables')}
          onAddToCart={handleAddToCart}
        />

        {/* ── 5. ABOUT US & OUR SERVICE (HUM KAUN HAIN) ────────────── */}
        <AboutAndServiceSection
          contactPhone={settings?.contactPhone}
          whatsappNumber={settings?.whatsappNumber}
          onNavigateVegetables={() => navigate('/vegetables')}
        />

        {/* ── 6. TODAY'S FEATURED VEGETABLES (CURATED 4 PICKS) ─────── */}
        <section
          id="vegetables"
          ref={shopSectionRef}
          style={{ padding: '3.5rem 0 4.5rem' }}
          aria-label="Today's Featured Vegetables"
        >
          <div className="container">
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem',
              marginBottom: '2rem',
            }}>
              <div className="section-intro" style={{ marginBottom: 0 }}>
                <span className="section-eyebrow">Hand-Picked Daily</span>
                <h2 className="section-title">Today's Featured Vegetables</h2>
                <p className="section-subtitle">
                  Subah ki taaza tareen seasonal sabziyan — 250g se 10kg tak certified digital wazan ke sath.
                </p>
              </div>

              {/* View All link */}
              <button
                type="button"
                id="section-view-all-btn"
                onClick={() => navigate('/vegetables')}
                className="view-all-veg-btn"
              >
                <span>Browse All Vegetables ({vegetables.length})</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                Loading fresh vegetables…
              </div>
            ) : filteredVeg.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                No vegetables found. Please check back shortly.
              </div>
            ) : (
              <>
                <div className="product-grid featured-homepage-grid">
                  {filteredVeg.slice(0, isMobile ? 4 : 8).map(veg => (
                    <VegetableCard
                      key={veg.id}
                      vegetable={veg}
                      onAddToCart={handleAddToCart}
                      onNavigateToProduct={() => navigateToProduct(veg.slug)}
                    />
                  ))}
                </div>

                {/* Big View All Catalog CTA */}
                <div className="homepage-all-catalog-cta scroll-reveal-item">
                  <div className="catalog-cta-info">
                    <span className="catalog-cta-badge">Complete Fresh Market</span>
                    <h3 className="catalog-cta-title">Looking for something else?</h3>
                    <p className="catalog-cta-desc">
                      Explore our full inventory of {vegetables.length} fresh vegetables, daily herbs, aromatics, and salad produce.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary catalog-cta-btn"
                    onClick={() => navigate('/vegetables')}
                  >
                    <span>Open Full Vegetables Page</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── 5. HOW IT WORKS ──────────────────────────────────── */}
        <section id="how-it-works" ref={howSectionRef} className="how-it-works-section scroll-reveal-item" aria-label="How it works">
          <div className="container">
            <div className="section-intro" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <span className="section-eyebrow">Aasan Tareeqa</span>
              <h2 className="section-title">Kaise Order Karein?</h2>
              <p className="section-subtitle" style={{ margin: '0.5rem auto 0', textAlign: 'center' }}>
                Sirf 4 aasan marahil mein taaza sabzi aapke dastarkhwan par
              </p>
            </div>
            <div className="steps-grid">
              {HOW_STEPS.map((step) => (
                <div
                  key={step.n}
                  className="step-card"
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

        {/* ── 5.5 TRUST GUARANTEES, REVIEWS & FAQ ── */}
        <HomeTrustAndReviews contactPhone={settings?.contactPhone || '03427883728'} />

      </main>
      )}

      {/* ── 8. FOOTER ────────────────────────────────────────────── */}
      <footer id="site-footer" className="site-footer" aria-label="Site footer">
        <div className="container">
          <div className="footer-grid">

            {/* Brand column */}
            <div className="footer-brand-col">
              <a href="/" className="footer-brand" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                {settings?.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={brandName}
                    style={{ height: '36px', width: 'auto', maxHeight: '36px', objectFit: 'contain', borderRadius: '6px' }}
                  />
                ) : (
                  <div className="nav-logo-icon" aria-hidden="true">
                    <Leaf size={20} />
                  </div>
                )}
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
              <p className="footer-col-title">Contact & Customer Support</p>
              <ul className="footer-links">
                <li>
                  <a
                    href="tel:03427883728"
                    id="footer-contact-link"
                    className="footer-link"
                    title="Helpline Call"
                  >
                    <Phone size={14} />
                    <span>0342-7883728</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:rehan.techhub0@gmail.com"
                    id="footer-email-link"
                    className="footer-link"
                    title="Customer Support Gmail"
                  >
                    <Mail size={14} />
                    <span>rehan.techhub0@gmail.com</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/923427883728?text=Assalam-o-Alaikum%2C%20mujhe%20taaza%20sabzi%20order%20karni%20hai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                    aria-label="WhatsApp Contact"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp (0342-7883728)</span>
                  </a>
                </li>
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
            <span>
              © {new Date().getFullYear()} {brandName}. All rights reserved. ·{' '}
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/admin');
                }}
                className="footer-discreet-staff-link"
                title="Store Staff Portal (or press Ctrl + Shift + A)"
              >
                Staff Portal
              </a>
            </span>
            <span className="footer-bottom-location">
              <MapPin size={13} /> Muzaffargarh, Punjab, Pakistan
            </span>
          </div>
        </div>
      </footer>

      {/* ── 8. BACK TO TOP (INSTANT SCROLL ARROW) ────────────────── */}
      <BackToTop />
      <FloatingWhatsApp phone={settings?.whatsappNumber && !settings.whatsappNumber.includes('0300') ? settings.whatsappNumber : '03427883728'} />
      <CustomerSupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        contactPhone={settings?.contactPhone && !settings.contactPhone.includes('0300') ? settings.contactPhone : '0342-7883728'}
        supportEmail="rehan.techhub0@gmail.com"
      />

      {/* ── 9. KITCHEN & BUDGET ASSISTANT (AAJ KYA BANAYEIN?) ─────── */}
      <SabziAIWidget onAddToCart={handleAddToCart} vegetables={vegetables} />

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
