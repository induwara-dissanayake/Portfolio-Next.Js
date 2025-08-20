"use client";
// Suppress selected noisy dev-time console messages without affecting errors.
import { useEffect } from 'react';

const BLOCK_PATTERNS = [
  /Download the React DevTools/i,
  /value\.onChange\(callback\) is deprecated/i,
  /is not an animatable color/i,
  /WebGL context was lost/i,
  /THREE\.WebGLRenderer: Context Lost/i,
  /\[Fast Refresh\]/i,
];

export default function DevConsoleFilter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

  const originalWarn = console.warn.bind(console);
  const originalInfo = console.info.bind(console);

    console.warn = (...args: unknown[]) => {
      const msg = String(args[0] ?? '');
      if (BLOCK_PATTERNS.some((re) => re.test(msg))) return;
      originalWarn(...args as []);
    };
    console.info = (...args: unknown[]) => {
      const msg = String(args[0] ?? '');
      if (BLOCK_PATTERNS.some((re) => re.test(msg))) return;
      originalInfo(...args as []);
    };

    return () => {
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  return null;
}
