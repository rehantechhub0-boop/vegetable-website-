import React, { useEffect, useState, useRef } from 'react';

export const MouseGlow: React.FC = () => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const lastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollTimeout = useRef<number | null>(null);

  useEffect(() => {
    // Only activate on devices with a mouse/pointer
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      lastPos.current = { x: e.clientX, y: e.clientY };
      setPos({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleScroll = () => {
      // Keep glow responsive during scroll
      setIsScrolling(true);
      if (lastPos.current.x > 0 || lastPos.current.y > 0) {
        setPos({ x: lastPos.current.x, y: lastPos.current.y });
        setIsVisible(true);
      }
      if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
      scrollTimeout.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
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
      style={{ zIndex: 25, pointerEvents: 'none' }}
    >
      {/* ── BROAD AMBIENT EMERALD GLOW LIGHT ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isVisible ? (isScrolling ? 0.95 : 0.8) : 0,
          transition: 'opacity 0.25s ease',
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(16, 185, 129, 0.18), rgba(52, 211, 153, 0.08) 40%, rgba(163, 230, 53, 0.03) 65%, transparent 80%)`,
        }}
      />

      {/* ── HIGH-TECH INNER CORE ORB FOLLOWING MOUSE POINTER ── */}
      <div
        style={{
          position: 'absolute',
          left: pos.x - 36,
          top: pos.y - 36,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.40) 0%, rgba(52, 211, 153, 0.15) 60%, transparent 100%)',
          filter: 'blur(8px)',
          opacity: isVisible ? (isScrolling ? 1 : 0.8) : 0,
          transform: isScrolling ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.1s ease-out, opacity 0.2s ease',
        }}
      />
    </div>
  );
};
