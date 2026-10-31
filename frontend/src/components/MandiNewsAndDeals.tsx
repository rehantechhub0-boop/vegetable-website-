import React from 'react';
import { Bell, Flame, Sparkles, TrendingDown, ArrowRight, Clock, ShieldCheck, Tag } from 'lucide-react';
import { VegetableItem, CartEntry } from './VegetableCard';

interface MandiNewsAndDealsProps {
  onNavigateVegetables: () => void;
  onAddToCart?: (entry: CartEntry) => void;
  vegetables: VegetableItem[];
}

export const MandiNewsAndDeals: React.FC<MandiNewsAndDealsProps> = ({
  onNavigateVegetables,
  onAddToCart,
  vegetables,
}) => {
  // Find top deals from vegetables
  const deals = vegetables.filter((v) => v.isOffer || v.isFeatured).slice(0, 3);

  const newsItems = [
    {
      badge: 'Arrival Alert · 05:00 AM',
      title: 'Dew-Fresh Mandi Stock Arrived',
      desc: 'Aaj subah mandi se taaza Aloo, Lal Tamatar aur Desi Palak ka fresh stock deliver ho chuka hai. Triple-washed and ready for your kitchen!',
      tag: 'Fresh Harvest',
      icon: <Sparkles size={16} className="text-emerald-500" />,
    },
    {
      badge: 'Price Drop · Today Only',
      title: 'Mandi Rate Drop on Daily Staples',
      desc: 'Aloo aur Palak ke wholesale rates par flat 20% discount offer active hai. Limited morning stock available.',
      tag: 'Special Savings',
      icon: <TrendingDown size={16} className="text-amber-500" />,
    },
    {
      badge: 'Express Service',
      title: '30-45 Minute Muzaffargarh Doorstep Drop',
      desc: 'Local delivery riders active across all Muzaffargarh zones. Cash on Delivery (COD) par pehle check karein, phir pay karein.',
      tag: 'Free on Rs. 800+',
      icon: <Clock size={16} className="text-cyan-500" />,
    },
  ];

  return (
    <section className="mandi-news-section" aria-label="Mandi News and Daily Sales">
      <div className="container">
        {/* Section Header */}
        <div className="mandi-news-header">
          <div>
            <div className="news-badge-pill">
              <Bell size={13} className="text-emerald-600 animate-pulse" />
              <span>Today's Mandi Bulletin & Flash Deals</span>
            </div>
            <h2 className="mandi-news-title">Aaj Ki Mandi News & Taaza Offers</h2>
            <p className="mandi-news-sub">
              Muzaffargarh sabzi mandi ke taaza tareen rates, subah ki nayi arrivals aur aaj ki special bachat deals.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline mandi-browse-all-btn"
            onClick={onNavigateVegetables}
          >
            <span>All Vegetables Catalog</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* 2-Column Grid: News Feed + Flash Deals Card */}
        <div className="mandi-news-grid">
          {/* Left Column: Live News Cards */}
          <div className="news-cards-column">
            {newsItems.map((n, i) => (
              <div key={i} className="mandi-news-card">
                <div className="news-card-top">
                  <div className="news-badge-wrap">
                    {n.icon}
                    <span className="news-card-badge">{n.badge}</span>
                  </div>
                  <span className="news-card-tag">{n.tag}</span>
                </div>
                <h3 className="news-card-title">{n.title}</h3>
                <p className="news-card-desc">{n.desc}</p>
              </div>
            ))}
          </div>

          {/* Right Column: Today's Mega Flash Banner */}
          <div className="mandi-flash-banner">
            <div className="flash-banner-glow" />
            <div className="flash-banner-content">
              <div className="flash-fire-pill">
                <Flame size={15} className="text-amber-300" />
                <span>Today's Morning Flash Sale</span>
              </div>
              <h3 className="flash-banner-title">Kitchen Budget Super Deal</h3>
              <p className="flash-banner-desc">
                Order 2kg Farm Fresh Aloo + 1kg Palak and get an instant Rs. 40 Mandi discount with free Dhaniya bundle!
              </p>

              <div className="flash-deals-list">
                {deals.map((d) => (
                  <div key={d.id} className="flash-deal-item">
                    <div className="deal-info">
                      <span className="deal-name">{d.name}</span>
                      <span className="deal-price">
                        Rs. {d.isOffer && d.offerPrice ? d.offerPrice : d.pricePerKg} / kg
                        {d.isOffer && <s className="deal-old-price">Rs. {d.pricePerKg}</s>}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="deal-quick-add-btn"
                      onClick={() =>
                        onAddToCart?.({
                          id: `${d.id}-1kg`,
                          vegetable: d,
                          weightDisplay: '1kg',
                          weightInKg: 1,
                          unitPrice: d.isOffer && d.offerPrice ? d.offerPrice : d.pricePerKg,
                          quantity: 1,
                          itemTotal: d.isOffer && d.offerPrice ? d.offerPrice : d.pricePerKg,
                        })
                      }
                    >
                      <Tag size={13} />
                      <span>Add 1kg</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flash-footer-note">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>100% Taaza Guarantee · Inspect upon delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
