"use client";
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const label = !mounted ? 'Theme' : resolvedTheme === 'dark' ? 'Light' : 'Dark';

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-sm backdrop-blur hover:bg-white/20 dark:border-black/20 dark:bg-black/10 dark:hover:bg-black/20"
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {label}
    </button>
  );
}
