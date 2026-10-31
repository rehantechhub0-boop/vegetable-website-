import React from 'react';
import { Leaf, Droplets, Scale, Truck, Phone, MessageCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AboutAndServiceSectionProps {
  contactPhone?: string;
  whatsappNumber?: string;
  onNavigateVegetables: () => void;
}

export const AboutAndServiceSection: React.FC<AboutAndServiceSectionProps> = ({
  contactPhone = '0300-1234567',
  whatsappNumber = '03001234567',
  onNavigateVegetables,
}) => {
  const servicePillars = [
    {
      icon: <Leaf size={24} className="text-emerald-500" />,
      title: 'Dawn Mandi Harvest',
      desc: 'Rozana subah 5:00 AM mandi se sidhi kisaano ki taaza sabzi harvest hoti hai. Zero cold-storage delay!',
    },
    {
      icon: <Droplets size={24} className="text-cyan-500" />,
      title: '100% Triple-Washed Hygiene',
      desc: 'Har sabzi ko saaf paani se achhi tarah dho kar mitti aur aloodgi se pak kiya jata hai.',
    },
    {
      icon: <Scale size={24} className="text-amber-500" />,
      title: 'Certified Digital Scale Weight',
      desc: '250g se lekar 10kg+ tak certified digital kaante par tola jata hai — 1 gram ka bhi farq nahi aayega.',
    },
    {
      icon: <Truck size={24} className="text-emerald-500" />,
      title: '30-45 Minute Doorstep Express',
      desc: 'Muzaffargarh ke tamam ilaaqon me riders taaza sabzi foran pohanchate hain. Payment Cash on Delivery par.',
    },
  ];

  return (
    <section className="about-service-section" aria-label="About Us and Our Services">
      <div className="container">
        {/* Intro */}
        <div className="about-intro-grid">
          <div className="about-intro-left">
            <span className="section-eyebrow">Hum Kaun Hain</span>
            <h2 className="about-main-title">
              Muzaffargarh Fresh Vegetables — <span className="text-gradient">Kisaan Se Kitchen Tak</span>
            </h2>
            <p className="about-main-desc">
              Hum Muzaffargarh ke shehriyon ko subah ki taaza tareen, ba-wazan aur saaf-suthri sabziyan unke ghar ki dehleez par deliver karte hain. Hamara maqsad har ghar tak sehat-bakhsh desi sabziyan aam mandi rates par baghair kisi pareshani ke pohanchana hai.
            </p>
            <div className="about-badges-row">
              <span className="about-check-badge">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>100% Taaza Guarantee</span>
              </span>
              <span className="about-check-badge">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Pura Wazan Digital Scale</span>
              </span>
              <span className="about-check-badge">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Cash on Delivery (COD)</span>
              </span>
            </div>

            {/* Direct Contact & WhatsApp Help */}
            <div className="about-contact-cta-row">
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary about-wa-btn"
              >
                <MessageCircle size={18} />
                <span>Order via WhatsApp</span>
              </a>
              <a
                href={`tel:${contactPhone.replace(/[^0-9]/g, '')}`}
                className="btn btn-outline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Phone size={16} />
                <span>Call {contactPhone}</span>
              </a>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onNavigateVegetables}
              >
                Explore Today's Stock
              </button>
            </div>
          </div>

          <div className="about-intro-right">
            <div className="about-image-card">
              <img
                src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80"
                alt="Fresh Pakistani Vegetables in Basket"
                className="about-featured-img"
              />
              <div className="about-floating-stats-card">
                <ShieldCheck size={28} className="text-emerald-500" />
                <div>
                  <strong className="stats-number">5,000+</strong>
                  <span className="stats-label">Happy Kitchens in Muzaffargarh</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars of Service */}
        <div className="service-pillars-section">
          <div className="section-intro" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="section-eyebrow">Hamari Service</span>
            <h3 className="section-title">Aapko Hum Par Aitemaad Kyun Karna Chahiye?</h3>
          </div>

          <div className="service-pillars-grid">
            {servicePillars.map((p, idx) => (
              <div key={idx} className="pillar-card">
                <div className="pillar-icon-box">{p.icon}</div>
                <h4 className="pillar-title">{p.title}</h4>
                <p className="pillar-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
