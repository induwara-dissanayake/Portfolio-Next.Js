"use client";
import { PropsWithChildren, useRef } from 'react';

export default function TiltCard({ children, maxTilt = 12, className = '' }: PropsWithChildren<{ maxTilt?: number; className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rx = (py - 0.5) * -2 * maxTilt;
    const ry = (px - 0.5) * 2 * maxTilt;

    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`[transform-style:preserve-3d] transition-transform duration-200 will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}
