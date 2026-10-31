import React, { useState, useRef, useEffect } from 'react';
import {
  Leaf, Truck, Scale, ShieldCheck, ArrowRight, Sparkles,
  CheckCircle2, Clock, MapPin, Award, Flame,
  Sun, Droplets, PackageCheck, Zap
} from 'lucide-react';

interface Hero3DProps {
  vegetableCount: number;
  onShopClick: () => void;
  onPricesClick: () => void;
}

export const Hero3D: React.FC<Hero3DProps> = ({
  vegetableCount,
  onShopClick,
  onPricesClick,
}) => {
  // 3D Card Tilt State using direct RAF for ultra-high FPS and zero re-render lag
  const cardRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  // Frame Showcase State (Farm to Kitchen Journey)
  const [activeFrame, setActiveFrame] = useState(0);
  const frameContainerRef = useRef<HTMLDivElement>(null);

  const frames = [
    {
      id: '01',
      time: '05:00 AM',
      title: 'Dawn Mandi & Local Farm Pick',
      subtitle: 'Taza Sabzi Harvest',
      desc: 'Selected at sunrise directly from growers in Muzaffargarh. Zero cold-storage delay, hand-picked dew-fresh produce.',
      badge: '100% Farm Fresh',
      icon: <Sun size={20} className="text-amber-400" />,
      image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=600&auto=format&fit=crop&q=75',
      stat: 'Sunrise Harvest',
      accentColor: '#10b981',
    },
    {
      id: '02',
      time: '07:00 AM',
      title: 'Triple-Washed & Quality Graded',
      subtitle: 'Pure Organic Hygiene',
      desc: 'Each vegetable is thoroughly inspected, cleaned with pure water, and graded for zero rot or blemishes.',
      badge: 'Zero Chemical Rinse',
      icon: <Droplets size={20} className="text-cyan-400" />,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=75',
      stat: '100% Inspected',
      accentColor: '#06b6d4',
    },
    {
      id: '03',
      time: '08:00 AM',
      title: 'Precision Weight Packaging',
      subtitle: 'Exact Grams to Kilograms',
      desc: 'Certified digital weighing scales ensure you receive exact weights (250g, 500g, 1kg - 10kg+) in ventilated food-grade bags.',
      badge: 'Certified Scale Weight',
      icon: <PackageCheck size={20} className="text-emerald-400" />,
      image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=75',
      stat: 'Exact Weight',
      accentColor: '#10b981',
    },
    {
      id: '04',
      time: '09:00 AM',
      title: '30-45 Min Doorstep Express',
      subtitle: 'Cash on Delivery (COD)',
      desc: 'Fast local delivery riders bring farm-fresh sabzi directly to your home in Muzaffargarh. Inspect your order and pay on delivery.',
      badge: 'Express Local Drop-off',
      icon: <Zap size={20} className="text-yellow-400" />,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=75',
      stat: '30-45 Min Delivery',
      accentColor: '#f59e0b',
    },
  ];

  // Gentle auto-rotation every 6 seconds when not hovered
  const [isFramePaused, setIsFramePaused] = useState(false);
  useEffect(() => {
    if (isFramePaused) return;
    const interval = setInterval(() => {
      setActiveFrame((prev) => (prev + 1) % frames.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isFramePaused, frames.length]);

  // High-performance 3D Mouse Tilt without React state re-renders
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return; // Disable on mobile/touch to eliminate lag
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1)`;
      }
    });
  };

  const handleMouseLeave = () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }
  };

  return (
    <section className="hero-vip-wrapper" aria-label="Hero Introduction">
      {/* Dynamic Ambient Background Glows */}
      <div className="hero-glow-orb hero-glow-orb--1" aria-hidden="true" />
      <div className="hero-glow-orb hero-glow-orb--2" aria-hidden="true" />
      <div className="hero-glow-orb hero-glow-orb--3" aria-hidden="true" />

      <div className="container hero-vip-container">
        {/* ── LEFT COLUMN: Modern Headline & Value Props ── */}
        <div className="hero-vip-left">
          {/* Eyebrow Pill */}
          <div className="hero-vip-badge animate-fade-in">
            <span className="hero-badge-pulse" />
            <Leaf size={14} className="hero-badge-icon" />
            <span>Muzaffargarh's #1 Fresh Vegetable Delivery</span>
            <span className="hero-badge-pill">Daily Mandi Rates</span>
          </div>

          {/* Headline */}
          <h1 className="hero-vip-title">
            Taaza Sabziyan,<br />
            <span className="hero-title-gradient">Farm-Fresh Delivered</span><br />
            To Your Doorstep.
          </h1>

          {/* Subtext */}
          <p className="hero-vip-description">
            Subah ki taaza sabzi seedha mandiyon aur local farms se. Har vegetable ko apni marzi ke
            wazan ke mutabiq mangwayen — <strong>250g se lekar 10kg+ bulk tak</strong>.
            Cash on Delivery aur guaranteed taazgi ke sath.
          </p>

          {/* CTA Buttons */}
          <div className="hero-vip-cta-row">
            <button
              type="button"
              id="hero-order-now-btn"
              onClick={onShopClick}
              className="vip-btn vip-btn-primary"
            >
              <Leaf size={18} />
              <span>Order Fresh Vegetables</span>
              <ArrowRight size={18} className="vip-btn-arrow" />
            </button>

            <button
              type="button"
              id="hero-mandi-rates-btn"
              onClick={onPricesClick}
              className="vip-btn vip-btn-secondary"
            >
              <span>View Today's Rates</span>
              <Flame size={16} className="text-amber-500" />
            </button>
          </div>

          {/* Highlights & Trust Badges */}
          <div className="hero-vip-metrics">
            <div className="vip-metric-item">
              <div className="vip-metric-icon-wrap bg-emerald-50 text-emerald-600">
                <Truck size={18} />
              </div>
              <div>
                <strong className="vip-metric-value">30-45 Mins</strong>
                <span className="vip-metric-label">Fast Local Delivery</span>
              </div>
            </div>

            <div className="vip-metric-divider" />

            <div className="vip-metric-item">
              <div className="vip-metric-icon-wrap bg-amber-50 text-amber-600">
                <Scale size={18} />
              </div>
              <div>
                <strong className="vip-metric-value">250g - 10kg+</strong>
                <span className="vip-metric-label">Custom & Fixed Weights</span>
              </div>
            </div>

            <div className="vip-metric-divider" />

            <div className="vip-metric-item">
              <div className="vip-metric-icon-wrap bg-cyan-50 text-cyan-600">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong className="vip-metric-value">100% COD</strong>
                <span className="vip-metric-label">Pay on Delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Interactive 3D Card Tilt Showcase ── */}
        <div className="hero-vip-right">
          <div
            ref={cardRef}
            className="hero-3d-card-stage"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Main Showcase Card Frame */}
            <div className="hero-3d-card-inner">
              {/* Glassmorphic border glow overlay */}
              <div className="hero-card-glow-border" aria-hidden="true" />

              {/* Card Image Banner */}
              <div className="hero-3d-image-wrap">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=640&auto=format&fit=crop&q=75"
                  alt="Vibrant Fresh Vegetables Display"
                  className="hero-3d-main-img"
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="hero-3d-scrim" />

                {/* Floating 3D Depth Layer 1: Rating Badge (Top Right) */}
                <div className="hero-float-badge hero-float-badge--top-right">
                  <div className="hero-rating-stars">★★★★★</div>
                  <div className="hero-rating-text">
                    <strong>4.9 / 5</strong> · 3,400+ Orders
                  </div>
                </div>

                {/* Floating 3D Depth Layer 2: Live Stock Count (Top Left) */}
                <div className="hero-float-badge hero-float-badge--top-left">
                  <span className="live-stock-pulse" />
                  <span>
                    <strong>{vegetableCount || '26'} Varieties</strong> In Stock Today
                  </span>
                </div>

                {/* Floating 3D Depth Layer 3: Direct Mandi Guarantee (Bottom Left) */}
                <div className="hero-float-badge hero-float-badge--bottom-left">
                  <Award size={18} className="text-amber-400" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      Direct Farm Sourced
                    </div>
                    <div className="text-sm font-semibold text-white">
                      Muzaffargarh Wholesale Rates
                    </div>
                  </div>
                </div>

                {/* Floating 3D Depth Layer 4: Speed Pill (Bottom Right) */}
                <div className="hero-float-badge hero-float-badge--bottom-right">
                  <Zap size={16} className="text-yellow-400" />
                  <span>Doorstep in 30 Mins</span>
                </div>
              </div>

              {/* Bottom Card Summary Pill */}
              <div className="hero-3d-card-footer">
                <div className="hero-footer-item">
                  <MapPin size={15} className="text-emerald-500" />
                  <span>Serving All Muzaffargarh Sectors</span>
                </div>
                <div className="hero-footer-item">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  <span>Hand-Sorted Quality</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3D FRAME-BY-FRAME SCROLL EXPERIENCE: Farm to Doorstep Journey ── */}
      <div
        className="container hero-frames-section"
        ref={frameContainerRef}
        onMouseEnter={() => setIsFramePaused(true)}
        onMouseLeave={() => setIsFramePaused(false)}
      >
        <div className="hero-frames-header">
          <div className="hero-frames-eyebrow">
            <Sparkles size={14} className="text-emerald-500" />
            <span>Interactive 4-Stage Process</span>
          </div>
          <h2 className="hero-frames-title">
            Khet Se Aapke Dastarkhwan Tak Ka Safar
          </h2>
          <p className="hero-frames-subtitle">
            Dekhiye kis tarah har subah aap tak behtareen aur khalis sabzi pohnchai jaati hai.
          </p>

          {/* Frame Progress Stepper Buttons */}
          <div className="hero-frame-stepper-tabs" role="tablist">
            {frames.map((frame, index) => (
              <button
                key={frame.id}
                type="button"
                role="tab"
                aria-selected={activeFrame === index}
                className={`frame-step-tab ${activeFrame === index ? 'active' : ''}`}
                onClick={() => setActiveFrame(index)}
              >
                <span className="step-tab-num">{frame.id}</span>
                <span className="step-tab-time">{frame.time}</span>
                <span className="step-tab-label">{frame.subtitle}</span>
                {activeFrame === index && <div className="step-tab-active-bar" />}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Frame Display Card with 3D Flip */}
        <div className="hero-frame-card-wrap">
          <div className="hero-frame-card">
            {/* Visual Frame Image */}
            <div className="frame-card-visual">
              <img
                src={frames[activeFrame].image}
                alt={frames[activeFrame].title}
                className="frame-card-img"
              />
              <div className="frame-card-badge">
                {frames[activeFrame].icon}
                <span>{frames[activeFrame].badge}</span>
              </div>
              <div className="frame-card-stat-pill">
                <span>{frames[activeFrame].stat}</span>
              </div>
            </div>

            {/* Frame Card Content */}
            <div className="frame-card-content">
              <div className="frame-card-step-tag">
                <span>Stage {frames[activeFrame].id}</span>
                <span className="frame-card-clock">
                  <Clock size={13} />
                  {frames[activeFrame].time}
                </span>
              </div>

              <h3 className="frame-card-heading">
                {frames[activeFrame].title}
              </h3>

              <p className="frame-card-desc">
                {frames[activeFrame].desc}
              </p>

              <div className="frame-card-perks">
                <div className="frame-perk-item">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Certified Freshness Guarantee</span>
                </div>
                <div className="frame-perk-item">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>No Artificial Preservatives</span>
                </div>
              </div>

              <div className="frame-card-nav">
                <button
                  type="button"
                  className="frame-nav-btn"
                  onClick={() => setActiveFrame((prev) => (prev > 0 ? prev - 1 : frames.length - 1))}
                  aria-label="Previous Stage"
                >
                  ← Previous
                </button>
                <div className="frame-dots-indicator">
                  {frames.map((_, i) => (
                    <span
                      key={i}
                      className={`frame-dot ${activeFrame === i ? 'active' : ''}`}
                      onClick={() => setActiveFrame(i)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="frame-nav-btn frame-nav-btn--next"
                  onClick={() => setActiveFrame((prev) => (prev + 1) % frames.length)}
                  aria-label="Next Stage"
                >
                  Next Step →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
