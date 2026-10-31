import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Scale,
  Truck,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  PhoneCall,
  MessageSquarePlus,
  CheckCircle2,
  X
} from 'lucide-react';

interface HomeTrustAndReviewsProps {
  contactPhone?: string;
}

interface CustomerReview {
  name: string;
  area: string;
  comment: string;
  rating: number;
  date?: string;
}

const DEFAULT_TESTIMONIALS: CustomerReview[] = [
  {
    name: 'Haji Muhammad Ramzan',
    area: 'City Center, Muzaffargarh',
    comment: 'Pehle subah subah mandi jana parta tha. Ab rozana fresh sabzi ghar aati hai, wazan bilkul accurate hota hai. Bohat shukriya!',
    rating: 5,
    date: 'Recent Order',
  },
  {
    name: 'Baji Shaista Parveen',
    area: 'Alipur Road Area',
    comment: 'Tamatar aur Palak itne taaza the jaise abhi khet se torey gaye hon. Digital packing aur safai bohat pasand aayi.',
    rating: 5,
    date: 'Recent Order',
  },
  {
    name: 'Dr. Irfan Malik',
    area: 'Jhang Road Sector',
    comment: 'Fast delivery! 35 minute me order receive hua. Cash on Delivery ki wajah se koi tension nahi hoti.',
    rating: 5,
    date: 'Recent Order',
  },
];

const trustGuarantees = [
  {
    icon: <Sparkles color="#10b981" size={26} />,
    title: 'Dawn Mandi Taazgi',
    desc: 'Roz subah 5:00 AM mandi se sidhi kisaano ki taaza sabzi. Zero cold storage delay.',
  },
  {
    icon: <Scale color="#f59e0b" size={26} />,
    title: 'Certified Digital Wazan',
    desc: 'Har sabzi certified electronic scale par toli jati hai. 1 gram ka bhi farq nahi.',
  },
  {
    icon: <Truck color="#06b6d4" size={26} />,
    title: '30-45 Min Express Drop',
    desc: 'Muzaffargarh city aur bypass ke tamam ilaaqon me fori delivery rider ke zariye.',
  },
  {
    icon: <ShieldCheck color="#10b981" size={26} />,
    title: '100% Cash on Delivery',
    desc: 'Pehle sabzi ki taazgi check karein, phir tasalli se payment karein. Kharab hone par foran wapsi.',
  },
];

export const HomeTrustAndReviews: React.FC<HomeTrustAndReviewsProps> = ({
  contactPhone = '0342-7883728',
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Reviews state with persistence
  const [reviews, setReviews] = useState<CustomerReview[]>(() => {
    try {
      const saved = localStorage.getItem('muzaffargarh_customer_reviews');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...parsed, ...DEFAULT_TESTIMONIALS];
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_TESTIMONIALS;
  });

  // Review Form Modal / Drawer State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerArea, setReviewerArea] = useState('');
  const [reviewerComment, setReviewerComment] = useState('');
  const [reviewerRating, setReviewerRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // 3-Card Carousel State & Responsiveness
  const [slideIndex, setSlideIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setCardsPerView(1);
      else if (window.innerWidth < 1024) setCardsPerView(2);
      else setCardsPerView(3);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxSlide = Math.max(0, reviews.length - cardsPerView);

  const prevReview = () => {
    setSlideIndex((curr) => (curr > 0 ? curr - 1 : maxSlide));
  };

  const nextReview = () => {
    setSlideIndex((curr) => (curr < maxSlide ? curr + 1 : 0));
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewerComment.trim()) return;

    const newRev: CustomerReview = {
      name: reviewerName.trim(),
      area: reviewerArea.trim() || 'Muzaffargarh Resident',
      comment: reviewerComment.trim(),
      rating: reviewerRating,
      date: 'Just now (Verified Customer)',
    };

    const updated = [newRev, ...reviews];
    setReviews(updated);
    setSlideIndex(0); // Jump immediately to the newly published review!

    try {
      const userCustomOnly = updated.filter(r => r.date?.includes('Just now') || r.date?.includes('Verified'));
      localStorage.setItem('muzaffargarh_customer_reviews', JSON.stringify(userCustomOnly));
    } catch {
      // ignore
    }

    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewSubmitted(false);
      setShowReviewForm(false);
      setReviewerName('');
      setReviewerArea('');
      setReviewerComment('');
      setReviewerRating(5);
    }, 2000);
  };

  const faqs = [
    {
      q: 'Order kitni der mein delivered hota hai?',
      a: 'Muzaffargarh City Center aur qareebi ilaaqon me 30 se 45 minute ke andar delivery ho jati hai.',
    },
    {
      q: 'Kya sabzi kharab nikalne par wapsi ki sahulat hai?',
      a: 'Jee haan! Delivery rider ke samne check karein. Agar koi sabzi kharab ho to rider foran replace karega ya refund milega.',
    },
    {
      q: 'Payment kaise karni hoti hai?',
      a: 'Hum Cash on Delivery (COD) provide karte hain. Order deliver hone par rider ko cash ada karein.',
    },
    {
      q: 'Kya wazan bilkul poora hota hai?',
      a: 'Hum certified digital weight scales use karte hain jo calibrated hote hain. Har sabzi par exact weight print hota hai.',
    },
  ];

  return (
    <div style={{ padding: '3.5rem 0', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
      {/* ── 4 TRUST PILLARS ── */}
      <section className="container scroll-reveal-item">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {trustGuarantees.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8faf9 100%)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                {item.icon}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-headline)', marginBottom: '0.4rem' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CUSTOMER REVIEWS & SOCIAL PROOF ── */}
      <section className="container scroll-reveal-item">
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2rem auto' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#047857',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              padding: '4px 12px',
              borderRadius: '9999px',
              display: 'inline-block',
            }}
          >
            Muzaffargarh Ki Awaam Ka Aitbaar
          </span>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-headline)', marginTop: '0.75rem' }}>
            Ghar Ghar Se Khushgawar Raaye
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Hazaaron mutmayeen gharaane jo rozana taaza sabzi hum se mangwate hain
          </p>

          <div style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setShowReviewForm((p) => !p)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
              }}
            >
              <MessageSquarePlus size={16} />
              <span>{showReviewForm ? 'Review Form Band Karein' : '✍️ Apni Raaye / Review Darj Karein'}</span>
            </button>
          </div>
        </div>

        {/* ── INTERACTIVE REVIEW SUBMISSION FORM ── */}
        {showReviewForm && (
          <div
            style={{
              maxWidth: '640px',
              margin: '0 auto 2.5rem auto',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              border: '2px solid #a7f3d0',
              boxShadow: '0 12px 28px -6px rgba(5, 150, 105, 0.15)',
              animation: 'fadeInUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#064e3b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Sparkles size={18} color="#059669" />
                  <span>Aapki Raaye Hamare Liye Azeez Hai</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
                  Muzaffargarh Fresh Vegetables ke baare me apna tajarba share karein
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {reviewSubmitted ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: '#ecfdf5', borderRadius: '12px', color: '#065f46' }}>
                <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 8px auto' }} />
                <h4 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>Shukriya! Aapka Review Shamil Ho Gaya!</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '4px', color: '#047857' }}>
                  Aapki raaye website par foran publish kar di gayi hai.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Star Rating Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Star Rating (Aapki Rating):
                  </label>
                  <div style={{ display: 'flex', gap: '6px', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={28}
                        fill={(hoverRating || reviewerRating) >= star ? '#f59e0b' : 'none'}
                        color={(hoverRating || reviewerRating) >= star ? '#f59e0b' : '#cbd5e1'}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setReviewerRating(star)}
                        style={{ transition: 'transform 0.15s ease' }}
                      />
                    ))}
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706', alignSelf: 'center', marginLeft: '6px' }}>
                      {reviewerRating} Stars ({reviewerRating === 5 ? 'Behtareen / Excellent' : reviewerRating >= 4 ? 'Bohat Acha' : 'Theek Tha'})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Aapka Naam *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Asad Ali / Baji Fatima"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Ilaaqa / Mohalla (Muzaffargarh)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alipur Road / Railway Station"
                      value={reviewerArea}
                      onChange={(e) => setReviewerArea(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Aapki Raaye / Comment *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Sabzi ki taazgi, wazan, rider ki delivery aur service ke baare mein apni raye likhein..."
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="btn"
                    style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '8px 22px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    Review Publish Karein
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── 3-CARD CAROUSEL SYSTEM WITH BOTH-SIDED ARROWS ── */}
        <div style={{ position: 'relative', maxWidth: '1180px', margin: '0 auto', padding: '0 12px' }}>
          {/* Left Arrow Button */}
          <button
            type="button"
            onClick={prevReview}
            disabled={reviews.length <= cardsPerView}
            style={{
              position: 'absolute',
              left: '-14px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '2px solid #059669',
              color: '#065f46',
              boxShadow: '0 6px 18px rgba(5, 150, 105, 0.25)',
              cursor: reviews.length <= cardsPerView ? 'default' : 'pointer',
              opacity: reviews.length <= cardsPerView ? 0.35 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              if (reviews.length > cardsPerView) {
                e.currentTarget.style.backgroundColor = '#ecfdf5';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            aria-label="Pichla review dekhein"
          >
            <ChevronLeft size={24} strokeWidth={2.6} />
          </button>

          {/* Right Arrow Button */}
          <button
            type="button"
            onClick={nextReview}
            disabled={reviews.length <= cardsPerView}
            style={{
              position: 'absolute',
              right: '-14px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '2px solid #059669',
              color: '#065f46',
              boxShadow: '0 6px 18px rgba(5, 150, 105, 0.25)',
              cursor: reviews.length <= cardsPerView ? 'default' : 'pointer',
              opacity: reviews.length <= cardsPerView ? 0.35 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              if (reviews.length > cardsPerView) {
                e.currentTarget.style.backgroundColor = '#ecfdf5';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
            aria-label="Agla review dekhein"
          >
            <ChevronRight size={24} strokeWidth={2.6} />
          </button>

          {/* Slider Mask */}
          <div style={{ overflow: 'hidden', padding: '10px 4px', borderRadius: '18px' }}>
            <div
              style={{
                display: 'flex',
                gap: '1.25rem',
                transform: `translateX(calc(-${slideIndex} * ((100% + 1.25rem) / ${cardsPerView})))`,
                transition: 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              {reviews.map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: `0 0 calc((100% - (${cardsPerView} - 1) * 1.25rem) / ${cardsPerView})`,
                    boxSizing: 'border-box',
                    minWidth: 0,
                    padding: '1.6rem',
                    borderRadius: '16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '220px',
                    transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(5, 150, 105, 0.16)';
                    e.currentTarget.style.borderColor = '#a7f3d0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', gap: '3px', color: '#f59e0b' }}>
                        {[...Array(t.rating)].map((_, i) => (
                          <Star key={i} size={17} fill="currentColor" />
                        ))}
                      </div>
                      {t.date && (
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                          {t.date}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-body)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
                      &ldquo;{t.comment}&rdquo;
                    </p>
                  </div>

                  <div
                    style={{
                      marginTop: '1.25rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#d1fae5',
                        border: '1.5px solid #10b981',
                        color: '#065f46',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        flexShrink: 0,
                      }}
                    >
                      {t.name[0]?.toUpperCase() || 'C'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-headline)', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{t.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{t.area}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Pagination Dots */}
          {maxSlide > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '1.5rem' }}>
              {Array.from({ length: maxSlide + 1 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSlideIndex(i)}
                  style={{
                    width: i === slideIndex ? '28px' : '9px',
                    height: '9px',
                    borderRadius: '9999px',
                    backgroundColor: i === slideIndex ? '#059669' : '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    padding: 0,
                  }}
                  aria-label={`Slide ${i + 1} par jayein`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <section className="container scroll-reveal-item" style={{ maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#0284c7',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              padding: '4px 12px',
              borderRadius: '9999px',
              display: 'inline-block',
            }}
          >
            Aam Sawalaat
          </span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-headline)', marginTop: '0.6rem' }}>
            Aksar Poochhe Janey Walay Sawalaat
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-headline)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <HelpCircle size={16} color="#059669" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    color="#64748b"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 1.25rem 1rem 1.25rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-body)',
                      lineHeight: 1.6,
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.75rem',
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Direct Call to Support */}
        <div
          style={{
            marginTop: '1.75rem',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            textAlign: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            fontSize: '0.85rem',
            color: '#065f46',
          }}
        >
          <span>Koi aur sawaal hai ya phone par direct order karna chahte hain?</span>
          <a
            href={`tel:${contactPhone.replace(/[^0-9+]/g, '')}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              color: '#ffffff',
              backgroundColor: '#059669',
              padding: '6px 14px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            <PhoneCall size={14} />
            <span>Call: {contactPhone}</span>
          </a>
        </div>
      </section>
    </div>
  );
};
