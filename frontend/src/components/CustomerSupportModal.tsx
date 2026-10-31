import React, { useState } from 'react';
import { X, Mail, Phone, MessageCircle, Clock, MapPin, Send, CheckCircle2, Headphones } from 'lucide-react';

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactPhone?: string;
  supportEmail?: string;
}

export const CustomerSupportModal: React.FC<CustomerSupportModalProps> = ({
  isOpen,
  onClose,
  contactPhone = '0342-7883728',
  supportEmail = 'rehan.techhub0@gmail.com',
}) => {
  const [name, setName] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setName('');
      setPhoneOrEmail('');
      setMessage('');
      setSubmitted(false);
      onClose();
    }, 2800);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          animation: 'supportModalFadeIn 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Headphones size={22} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                Customer Support & Help Desk
              </h3>
              <p style={{ fontSize: '0.75rem', opacity: 0.9, margin: 0 }}>
                Muzaffargarh Fresh Vegetables — Hum Aap Ki Khidmat Ke Liye Dastiyab Hain
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Contact Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            {/* Phone */}
            <a
              href={`tel:${contactPhone.replace(/[^0-9+]/g, '')}`}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={18} color="#15803d" />
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600, display: 'block' }}>Call Helpline</span>
                <strong style={{ fontSize: '0.9rem', color: '#14532d' }}>{contactPhone}</strong>
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${supportEmail}`}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={18} color="#1d4ed8" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <span style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 600, display: 'block' }}>Support Email</span>
                <strong style={{ fontSize: '0.82rem', color: '#1e3a8a', wordBreak: 'break-all' }}>{supportEmail}</strong>
              </div>
            </a>
          </div>

          {/* Operational Hours & Area */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '10px',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#059669" />
              <span>Timings: <strong>7:00 AM – 10:00 PM</strong> (Rozana)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="#059669" />
              <span>Area: <strong>Muzaffargarh City Center & Bypass</strong></span>
            </div>
          </div>

          {/* Inquiry Form */}
          {submitted ? (
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                textAlign: 'center',
                color: '#065f46',
              }}
            >
              <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0' }}>Paigham Mawsul Ho Gaya!</h4>
              <p style={{ fontSize: '0.82rem', margin: 0 }}>
                Hamari customer support team jald hi aap se rabta karegi. Shukriya!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-headline)', margin: '0 0 2px 0' }}>
                Hamein Direct Message Bheinjein:
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '4px' }}>
                    Aap Ka Naam
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Asad Ali"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '4px' }}>
                    Phone Ya Email
                  </label>
                  <input
                    type="text"
                    placeholder="03XXXXXXXXX"
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: '4px' }}>
                  Aap Ka Sawaal / Paigham
                </label>
                <textarea
                  placeholder="Apni sabzi inquiry ya delivery hawale se baat likhein..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <a
                  href={`https://wa.me/923427883728?text=Assalam-o-Alaikum%2C%20mujhe%20customer%20support%20se%20rabta%20karna%20hai.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: '#059669',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp Par Chat Karein</span>
                </a>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  <Send size={14} />
                  <span>Send Inquiry</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <style>{`
        @keyframes supportModalFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
