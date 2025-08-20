"use client";
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';

export function Reveal({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const controls = useAnimation();
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (inView && !hasPlayed) {
      controls.start({ opacity: 1, y: 0, transition: { duration: 0.6, delay } });
      setHasPlayed(true);
    }
  }, [inView, hasPlayed, controls, delay]);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={controls}>
      {children}
    </motion.div>
  );
}
