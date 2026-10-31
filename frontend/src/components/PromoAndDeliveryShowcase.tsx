import React, { useState } from 'react';
import {
  Flame, CheckCircle2, Truck, MapPin, Scale,
  ShieldCheck, ArrowRight, ShoppingBag, Gift
} from 'lucide-react';
import { CartEntry, VegetableItem } from './VegetableCard';

interface PromoAndDeliveryShowcaseProps {
  vegetables: VegetableItem[];
  onAddToCart: (entry: CartEntry) => void;
  onNavigateShop: () => void;
}

export const PromoAndDeliveryShowcase: React.FC<PromoAndDeliveryShowcaseProps> = ({
  vegetables,
  onAddToCart,
  onNavigateShop,
}) => {
  const [comboAdded, setComboAdded] = useState(false);
  const [selectedZone, setSelectedZone] = useState('city-center');

  const zones = [
    {
      id: 'city-center',
      name: 'City Center Sector',
      fee: 80,
      minOrder: 300,
      time: '30-40 mins',
      popular: true,
    },
    {
      id: 'alipur-road',
      name: 'Alipur Road Area',
      fee: 120,
      minOrder: 400,
      time: '40-50 mins',
      popular: false,
    },
    {
      id: 'jhang-road',
      name: 'Jhang Road Area',
      fee: 120,
      minOrder: 400,
      time: '40-50 mins',
      popular: false,
    },
    {
      id: 'khangarh-bypass',
      name: 'Khangarh Bypass Sector',
      fee: 150,
      minOrder: 500,
      time: '50-60 mins',
      popular: false,
    },
    {
      id: 'dg-khan-road',
      name: 'D.G. Khan Road Zone',
      fee: 150,
      minOrder: 500,
      time: '50-60 mins',
      popular: false,
    },
  ];

  const handleAddCombo = () => {
    // Find representative items or add combo pack entry
    const potato = vegetables.find((v) => v.slug.includes('potato')) || vegetables[0];
    if (potato) {
      onAddToCart({
        id: `combo-family-box-${Date.now()}`,
        vegetable: {
          ...potato,
          name: '🥘 Family Kitchen Combo Basket (12kg Fresh Assorted)',
          description: '5kg Aloo + 3kg Tamatar + 2kg Pyaz + 1kg Palak + 1kg Kheera + Free Dhaniya/Mirch pack',
        },
        weightDisplay: '12kg Combo Basket',
        weightInKg: 12,
        unitPrice: 1190,
        quantity: 1,
        itemTotal: 1190,
      });
      setComboAdded(true);
      setTimeout(() => setComboAdded(false), 2000);
    }
  };

  return (
    <section className="promo-delivery-section" aria-label="Promotional Deals and Delivery Guide">
      <div className="container">
        {/* ── 1. PROMOTIONAL ADVERTISING BANNER: Family Combo Basket ── */}
        <div className="promo-ad-banner">
          <div className="promo-ad-glow" aria-hidden="true" />

          <div className="promo-ad-content">
            <div className="promo-ad-tag">
              <Flame size={14} className="text-amber-400" />
              <span>Special Promotional Deal</span>
              <span className="promo-ad-discount-pill">Save Rs. 290</span>
            </div>

            <h3 className="promo-ad-heading">
              Shahi Family Kitchen Combo Basket (12kg)
            </h3>

            <p className="promo-ad-subtext">
              Ek hi order me poore hafte ki zaroori sabziyan: <strong>5kg Aloo + 3kg Tamatar + 2kg Pyaz + 1kg Palak + 1kg Kheera</strong> aur sath me <strong>Free Dhaniya & Mirch Garnish Pack</strong>!
            </p>

            <div className="promo-ad-features">
              <div className="promo-feat-item">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Zero Bruised Produce</span>
              </div>
              <div className="promo-feat-item">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Sanitized Food-Grade Crate</span>
              </div>
              <div className="promo-feat-item">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>Free Express Doorstep Delivery</span>
              </div>
            </div>

            <div className="promo-ad-price-row">
              <div className="promo-price-group">
                <span className="promo-old-price">Rs. 1,480</span>
                <strong className="promo-new-price">Rs. 1,190</strong>
                <span className="promo-saving-badge">20% Flat OFF</span>
              </div>

              <button
                type="button"
                className={`promo-buy-btn ${comboAdded ? 'added' : ''}`}
                onClick={handleAddCombo}
              >
                <ShoppingBag size={17} />
                <span>{comboAdded ? '✓ Combo Added to Cart!' : 'Add Combo to Cart (Rs. 1,190)'}</span>
              </button>

              <button
                type="button"
                className="promo-explore-btn"
                onClick={onNavigateShop}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#ffffff',
                  padding: '0.85rem 1.4rem',
                  borderRadius: '9999px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>View Full Catalog</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="promo-ad-visual">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80"
              alt="Assorted Fresh Vegetables Combo Basket"
              className="promo-ad-img"
            />
            <div className="promo-visual-badge">
              <Gift size={16} />
              <span>Includes Free Dhaniya & Mirch</span>
            </div>
          </div>
        </div>

        {/* ── 2. HOW DELIVERY WORKS & INTERACTIVE SECTOR GUIDE ── */}
        <div className="delivery-guide-wrapper">
          <div className="delivery-guide-header">
            <span className="delivery-guide-eyebrow">
              <Truck size={14} className="text-emerald-500" />
              Express Local Logistics
            </span>
            <h3 className="delivery-guide-title">
              Muzaffargarh Me Delivery Kaise Hoti Hai?
            </h3>
            <p className="delivery-guide-subtext">
              Mandi se lekar aapke darwaze tak, har order ko ahtiyat aur taazgi ke sath deliver kiya jata hai.
            </p>
          </div>

          {/* 4 Interactive Process Steps */}
          <div className="delivery-process-grid">
            <div className="delivery-process-card">
              <div className="process-card-num">01</div>
              <div className="process-card-icon-wrap bg-emerald-50 text-emerald-600">
                <Scale size={20} />
              </div>
              <h4 className="process-card-title">Select Your Weight</h4>
              <p className="process-card-desc">
                Website par 250g se lekar 10kg+ tak kisi bhi sabzi ka wazan chun kar Cart me daalein.
              </p>
            </div>

            <div className="delivery-process-card">
              <div className="process-card-num">02</div>
              <div className="process-card-icon-wrap bg-amber-50 text-amber-600">
                <MapPin size={20} />
              </div>
              <h4 className="process-card-title">Choose Delivery Area</h4>
              <p className="process-card-desc">
                Muzaffargarh me apna ilaaqa select karein. System foran exact delivery fee calculate kar deta hai.
              </p>
            </div>

            <div className="delivery-process-card">
              <div className="process-card-num">03</div>
              <div className="process-card-icon-wrap bg-cyan-50 text-cyan-600">
                <Truck size={20} />
              </div>
              <h4 className="process-card-title">30-45 Min Dispatch</h4>
              <p className="process-card-desc">
                Subah ki taaza sabzi food-grade aerated bags me pack ho kar rider ke hawale hoti hai.
              </p>
            </div>

            <div className="delivery-process-card">
              <div className="process-card-num">04</div>
              <div className="process-card-icon-wrap bg-purple-50 text-purple-600">
                <ShieldCheck size={20} />
              </div>
              <h4 className="process-card-title">Inspect & Pay (COD)</h4>
              <p className="process-card-desc">
                Doorstep par sabzi ka wazan aur taazgi check karein, aur cash rider ko ada karein.
              </p>
            </div>
          </div>

          {/* Interactive Zone Calculator Card */}
          <div className="zone-calculator-card">
            <div className="zone-calculator-intro">
              <h4 className="zone-calculator-title">
                Check Delivery Fee & Time in Your Area:
              </h4>
              <p className="zone-calculator-desc">
                Click your area to view delivery charges, minimum order amount, and transit time.
              </p>
            </div>

            <div className="zone-pills-row">
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  className={`zone-pill-btn ${selectedZone === z.id ? 'active' : ''}`}
                  onClick={() => setSelectedZone(z.id)}
                >
                  <MapPin size={14} />
                  <span>{z.name}</span>
                  {z.popular && <span className="zone-popular-tag">Fastest</span>}
                </button>
              ))}
            </div>

            {/* Selected Zone Result */}
            {(() => {
              const active = zones.find((z) => z.id === selectedZone) || zones[0];
              return (
                <div className="zone-active-meta">
                  <div className="zone-meta-col">
                    <span className="zone-meta-label">Delivery Fee:</span>
                    <strong className="zone-meta-val text-emerald-600">Rs. {active.fee}</strong>
                  </div>
                  <div className="zone-meta-col">
                    <span className="zone-meta-label">Est. Time:</span>
                    <strong className="zone-meta-val">{active.time}</strong>
                  </div>
                  <div className="zone-meta-col">
                    <span className="zone-meta-label">Min. Order:</span>
                    <strong className="zone-meta-val">Rs. {active.minOrder}</strong>
                  </div>
                  <div className="zone-meta-col">
                    <span className="zone-meta-label">Payment:</span>
                    <strong className="zone-meta-val text-emerald-700">Cash on Delivery</strong>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
};
