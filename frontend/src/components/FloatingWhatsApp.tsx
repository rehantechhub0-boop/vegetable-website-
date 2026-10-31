import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface FloatingWhatsAppProps {
  phone?: string;
}

function formatWaPhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.slice(1);
  } else if (!cleaned.startsWith('92') && cleaned.length === 10) {
    cleaned = '92' + cleaned;
  }
  return cleaned || '923427883728';
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  phone = '03427883728',
}) => {
  const [showTooltip, setShowTooltip] = useState(true);
  const waNumber = formatWaPhone(phone);
  const waUrl = `https://wa.me/${waNumber}?text=Assalam-o-Alaikum%2C%20mujhe%20Muzaffargarh%20Fresh%20Vegetables%20customer%20support%20se%20rabta%20karna%20hai.`;

  return (
    <div
      id="floating-whatsapp-container"
      className="floating-whatsapp-wrap"
      aria-label="WhatsApp Customer Support"
    >
      {showTooltip && (
        <div className="floating-whatsapp-tooltip">
          <span>Customer Support & Helpline (0342-7883728)</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="floating-whatsapp-close"
            aria-label="Dismiss tooltip"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Customer Support on WhatsApp"
        className="floating-whatsapp-btn"
      >
        {/* Pulsing ring */}
        <span className="floating-whatsapp-pulse" />
        <MessageCircle size={28} color="#ffffff" fill="currentColor" />
      </a>

      <style>{`
        .floating-whatsapp-wrap {
          position: fixed;
          bottom: 116px;
          right: 28px;
          z-index: 998;
          display: flex;
          align-items: center;
          gap: 10px;
          pointer-events: auto;
        }
        .floating-whatsapp-tooltip {
          background-color: #064e3b;
          color: #ecfdf5;
          border: 1px solid rgba(16, 185, 129, 0.4);
          padding: 7px 12px;
          border-radius: 9999px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 600;
          white-space: nowrap;
          animation: waTooltipBounce 2.5s infinite ease-in-out;
        }
        .floating-whatsapp-close {
          background: none;
          border: none;
          color: #a7f3d0;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          line-height: 1;
        }
        .floating-whatsapp-close:hover {
          color: #ffffff;
        }
        .floating-whatsapp-btn {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(37, 211, 102, 0.4);
          text-decoration: none;
          position: relative;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          border: 2px solid rgba(255, 255, 255, 0.35);
        }
        .floating-whatsapp-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 12px 28px rgba(37, 211, 102, 0.6);
        }
        .floating-whatsapp-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(37, 211, 102, 0.6);
          animation: waPulseRing 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
          pointer-events: none;
        }
        @keyframes waPulseRing {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes waTooltipBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @media (max-width: 640px) {
          .floating-whatsapp-wrap {
            bottom: 86px;
            right: 16px;
          }
          .floating-whatsapp-btn {
            width: 44px;
            height: 44px;
          }
          .floating-whatsapp-tooltip {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
