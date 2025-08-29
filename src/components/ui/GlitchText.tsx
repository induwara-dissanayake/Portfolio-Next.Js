"use client";
import { motion } from 'framer-motion';
import { PropsWithChildren } from 'react';

interface GlitchTextProps extends PropsWithChildren {
  className?: string;
}

export default function GlitchText({ children, className = '' }: GlitchTextProps) {
  return (
    <motion.div
      className={`relative inline-block ${className}`}
      whileHover={{
        textShadow: [
          '0 0 0 transparent',
          '2px 0 0 #ff00de, -2px 0 0 #00ffff',
          '0 0 0 transparent',
        ],
      }}
      transition={{ duration: 0.3, times: [0, 0.5, 1] }}
      style={{ 
        display: 'inline-block',
        maxWidth: '100%',
        wordBreak: 'break-word'
      }}
    >
      <span className="relative z-10" style={{ 
        display: 'inline-block',
        maxWidth: '100%'
      }}>{children}</span>
      <motion.span
        className="absolute inset-0 opacity-0"
        style={{
          background: 'linear-gradient(90deg, #ff00de, #00ffff)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
        whileHover={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.3, times: [0, 0.5, 1] }}
      >
        {children}
      </motion.span>
    </motion.div>
  );
}
