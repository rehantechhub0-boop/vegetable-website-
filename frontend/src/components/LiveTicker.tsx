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
      badge: 'TAAZA MANDI',
      text: 'Muzaffargarh ki No. 1 Taaza Sabzi Express Service — Mandi se seedha aapke ghar!',
      icon: <Leaf size={13} className="text-emerald-400" />,
      color: '#10b981',
    },
    {
      badge: 'EXPRESS DROP',
      text: '30 se 45 Minute me Tez Tareen Doorstep Delivery tamam ilaaqon mein!',
      icon: <Truck size={13} className="text-cyan-400" />,
      color: '#06b6d4',
    },
    {
      badge: 'CASH ON DELIVERY',
      text: 'Pehle sabzi check karein, wazan tasalli karein, phir cash ada karein — 100% COD Guarantee!',
      icon: <ShieldCheck size={13} className="text-emerald-400" />,
      color: '#10b981',
    },
    {
      badge: 'ROZANA DEALS',
      text: 'Aloo, Pyaz aur Tamatar par Special Mandi Wholesale Rates rozana subah dastiyab!',
      icon: <Flame size={13} className="text-amber-400" />,
      color: '#f59e0b',
    },
    {
      badge: 'FREE DELIVERY',
      text: 'Rs. 1,000 se zayed ke kisi bhi order par Home Delivery bilkul MUFT!',
      icon: <Sparkles size={13} className="text-amber-400" />,
      color: '#fbbf24',
    },
    {
      badge: 'ZERO DISCREPANCY',
      text: 'Digital certified tarazu se safe packing — har gram pura aur accurate wazan!',
      icon: <Leaf size={13} className="text-emerald-400" />,
      color: '#10b981',
    },
    {
      badge: 'ALL SECTORS',
      text: 'Jhang Road, Alipur Road, City Center, Multan Road, Civil Lines & Railway Road par dastiabi!',
      icon: <Truck size={13} className="text-cyan-400" />,
      color: '#06b6d4',
    },
    {
      badge: 'MADAD & HELPLINE',
      text: 'Kisi bhi sawal ya order madad ke liye rabta karein: 0342-7883728 (Call & WhatsApp)',
      icon: <Phone size={13} className="text-emerald-400" />,
      color: '#10b981',
    },
  ];

  return (
    <div className="live-ticker-bar" aria-label="Mandi News Ticker">
      {/* Infinitely Scrolling Marquee Track taking full width */}
      <div className="live-ticker-track-container">
        <div className="live-ticker-track">
          {/* Loop 1 */}
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

      {/* Right side contact pill showing telephone helpline */}
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
