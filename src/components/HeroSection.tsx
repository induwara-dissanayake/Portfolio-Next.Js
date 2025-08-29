"use client";
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import GlitchText from '@/components/ui/GlitchText';
import TypingAnimation from '@/components/ui/TypingAnimation';
import MagneticButton from '@/components/ui/MagneticButton';
import { useEffect, useState } from 'react';
import SocialLinks from '@/components/ui/SocialLinks';

export function HeroSection() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-2">
      {/* Animated background elements */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, #8B5CF6 0%, transparent 50%)',
            'radial-gradient(circle at 80% 20%, #EC4899 0%, transparent 50%)',
            'radial-gradient(circle at 40% 80%, #06B6D4 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, #8B5CF6 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Interactive light effect following cursor */}
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)',
        }}
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
      />

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-6xl mx-auto w-full">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-4 sm:mb-6"
        >
          <span className="text-lg md:text-xl text-purple-400 font-mono">
            Hello World, I&apos;m
          </span>
        </motion.div>

        {/* Main name with glitch effect */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black mb-8 leading-tight break-words"
          style={{ 
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%'
          }}
        >
          <GlitchText className="text-purple-400 md:gradient-text text-responsive">
            INDUWARA
          </GlitchText>
        </motion.h1>

        {/* Typing animation for role */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mb-6 sm:mb-8"
        >
          <TypingAnimation
            text="Full-Stack Developer • AI Creator • UI/UX Enthusiast"
            className="text-lg sm:text-2xl md:text-4xl font-light text-gray-300"
            duration={80}
          />
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2 }}
          className="text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-2"
        >
          I craft exceptional digital experiences with modern web technologies,
          bringing ideas to life through clean code and stunning design.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.5 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          <MagneticButton 
            onClick={() => router.push('/projects')}
            className="text-lg px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <span className="flex items-center gap-2">
              View My Work
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </span>
          </MagneticButton>

          <motion.a
            href="/contact"
            className="text-lg px-8 py-4 border-2 border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 rounded-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Let&apos;s Connect
          </motion.a>
        </motion.div>

        {/* Socials */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 3 }}
          className="mt-10 flex justify-center"
        >
          <SocialLinks />
        </motion.div>

        {/* Floating elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-500 rounded-full opacity-60"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + i * 10}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-purple-400 rounded-full flex justify-center"
        >
          <motion.div
            animate={{ height: [0, 20, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 bg-purple-400 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
