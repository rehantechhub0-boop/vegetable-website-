import React, { useEffect, useState, useRef } from 'react';

export const MouseGlow: React.FC = () => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<number | null>(null);

  useEffect(() => {
    // Only activate on devices with a mouse/pointer
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    const handlePointerMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
      scrollTimeout.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 250);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    };
  }, [isVisible]);

  if (!pos || !isVisible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 9995, pointerEvents: 'none' }}
    >
      {/* ── BROAD AMBIENT EMERALD GLOW LIGHT (VISIBLE ACROSS EVERY SECTION) ── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: isVisible ? (isScrolling ? 0.9 : 0.75) : 0,
          transition: 'opacity 0.2s ease',
          background: `radial-gradient(550px circle at ${pos.x}px ${pos.y}px, rgba(16, 185, 129, 0.14), rgba(52, 211, 153, 0.05) 45%, transparent 75%)`,
          mixBlendMode: 'multiply',
        }}
      />

      {/* ── HIGH-TECH INNER CORE ORB FOLLOWING MOUSE POINTER EVERYWHERE ── */}
      <div
        style={{
          position: 'fixed',
          left: pos.x - 36,
          top: pos.y - 36,
          width: 72,
          height: 72,
          borderRadius: '50%',
          pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, rgba(52, 211, 153, 0.12) 55%, transparent 100%)',
          filter: 'blur(8px)',
          opacity: isVisible ? (isScrolling ? 1 : 0.85) : 0,
          transform: isScrolling ? 'scale(1.25)' : 'scale(1)',
          transition: 'transform 0.1s ease-out, opacity 0.2s ease',
        }}
      />
    </div>
  );
};
