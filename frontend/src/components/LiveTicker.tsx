import React from 'react';
import { Sparkles, Phone, Flame, Truck, ShieldCheck, Leaf } from 'lucide-react';

interface LiveTickerProps {
  contactPhone?: string;
}

function formatPhone(p: string): string {
  const digits = p.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('03')) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (digits.length === 12 && digits.startsWith('923')) {
    return `0${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return p && p.includes('-') ? p : '0342-7883728';
}

export const LiveTicker: React.FC<LiveTickerProps> = ({
  contactPhone = '0342-7883728',
}) => {
  const displayPhone = formatPhone(contactPhone && !contactPhone.includes('0300') ? contactPhone : '0342-7883728');

  const tickerItems = [
    {
      badge: 'LIVE MANDI',
      text: 'Subah ki taaza sabzi mandiyon se pohnch chuki hai — 100% Taaza & Khalis!',
      icon: <Leaf size={13} className="text-emerald-400" />,
      color: '#10b981',
    },
    {
      badge: 'TODAY DEALS',
      text: 'Aloo (Farm Fresh) par Flat 20% Discount — Sirf Rs. 95/kg!',
      icon: <Flame size={13} className="text-amber-400" />,
      color: '#f59e0b',
    },
    {
      badge: 'EXPRESS DROP',
      text: '30-45 Minute me Muzaffargarh ke tamam ilaaqon me Cash on Delivery!',
      icon: <Truck size={13} className="text-cyan-400" />,
      color: '#06b6d4',
    },
    {
      badge: 'ZERO ADVANCE',
      text: 'Pehle sabzi check karein, phir cash ada karein — 100% COD Guarantee!',
      icon: <ShieldCheck size={13} className="text-emerald-400" />,
      color: '#10b981',
    },
    {
      badge: 'FREE DELIVERY',
      text: 'Rs. 1,000 se zayed ke kisi bhi order par delivery bilkul MUFT!',
      icon: <Sparkles size={13} className="text-amber-400" />,
      color: '#fbbf24',
    },
    {
      badge: 'TAAZGI GUARANTEE',
      text: 'Kharab sabzi par fori exchange ya refund ki sahulat dastiyab hai.',
      icon: <Leaf size={13} className="text-emerald-400" />,
      color: '#10b981',
    },
  ];

  return (
    <div className="live-ticker-bar" aria-label="Live Mandi News Ticker">
      <div className="live-ticker-badge-wrap">
        <span className="live-ticker-dot" />
        <span className="live-ticker-badge-title">LIVE UPDATES</span>
      </div>

      {/* Infinitely Scrolling Marquee Track */}
      <div className="live-ticker-track-container">
        <div className="live-ticker-track">
          {/* First loop */}
          {tickerItems.map((item, idx) => (
            <div key={`loop1-${idx}`} className="live-ticker-item">
              <span
                className="live-ticker-item-badge"
                style={{ borderColor: item.color, color: item.color }}
              >
                {item.icon}
                <span>{item.badge}</span>
              </span>
              <span className="live-ticker-item-text">{item.text}</span>
              <span className="live-ticker-separator">✦</span>
            </div>
          ))}

          {/* Duplicated loop for smooth infinite continuous scroll */}
          {tickerItems.map((item, idx) => (
            <div key={`loop2-${idx}`} className="live-ticker-item" aria-hidden="true">
              <span
                className="live-ticker-item-badge"
                style={{ borderColor: item.color, color: item.color }}
              >
                {item.icon}
                <span>{item.badge}</span>
              </span>
              <span className="live-ticker-item-text">{item.text}</span>
              <span className="live-ticker-separator">✦</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side contact pill showing ONLY telephone helpline */}
      <div className="live-ticker-contact-wrap">
        <a
          href={`tel:${displayPhone.replace(/[^0-9+]/g, '')}`}
          className="live-ticker-phone"
          title="Direct Call Helpline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem' }}
        >
          <Phone size={13} />
          <span>{displayPhone}</span>
        </a>
      </div>
    </div>
  );
};
