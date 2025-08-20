"use client";
import { useRef } from 'react';

export default function MagneticButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'translate(0,0)';
  };

  return (
    <button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`relative inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 font-medium text-white bg-gradient-to-tr from-indigo-600 to-pink-500 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 transition-[transform,box-shadow] duration-300 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
