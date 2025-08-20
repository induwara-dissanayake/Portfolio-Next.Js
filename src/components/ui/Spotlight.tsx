"use client";
import { useEffect, useRef } from 'react';

// A lightweight radial spotlight that follows the cursor.
export default function Spotlight({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handle = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--x', `${x}px`);
      el.style.setProperty('--y', `${y}px`);
    };

    el.addEventListener('mousemove', handle);
    return () => el.removeEventListener('mousemove', handle);
  }, []);

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{
        // subtle animated grain via background blend
        backgroundImage:
          'radial-gradient(600px 600px at var(--x,50%) var(--y,50%), rgba(99,102,241,0.15), transparent 60%), radial-gradient(800px 800px at 20% 10%, rgba(236,72,153,0.08), transparent 60%)',
        backgroundBlendMode: 'screen',
      }}
    />
  );
}
