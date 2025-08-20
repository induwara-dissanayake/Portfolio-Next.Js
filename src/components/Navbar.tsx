"use client";
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 100], [0.8, 0.95]);

  useEffect(() => {
  const unsubscribe = scrollY.on('change', (latest) => {
      setIsScrolled(latest > 50);
    });
    return unsubscribe;
  }, [scrollY]);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/projects', label: 'Projects' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
  ];

  const [open, setOpen] = useState(false);
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ opacity }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className={`backdrop-blur-xl border border-white/10 rounded-2xl mt-4 transition-all duration-300 ${
            isScrolled 
              ? 'bg-black/20 dark:bg-white/5 shadow-2xl' 
              : 'bg-black/10 dark:bg-white/5'
          }`}
          layout
        >
          <div className="flex items-center justify-between px-6 py-4">
            {/* Logo */}
            <Link href="/" className="group">
              <motion.div
                className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                I.
              </motion.div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link
                    href={item.href}
                    className="relative text-gray-300 hover:text-white transition-colors duration-300 group"
                  >
                    {item.label}
                    <motion.div
                      className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-500"
                      initial={{ width: 0 }}
                      whileHover={{ width: '100%' }}
                      transition={{ duration: 0.3 }}
                    />
                  </Link>
                </motion.div>
              ))}
            </div>
            <button className="md:hidden p-2 rounded-lg border border-white/10" onClick={()=>setOpen(v=>!v)} aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Mobile Menu Dropdown */}
      {open && (
        <motion.div
          className="md:hidden fixed top-20 left-0 right-0 px-6"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="mx-auto max-w-7xl backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-4">
            <div className="flex flex-col gap-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="text-gray-200 hover:text-white text-base" onClick={()=>setOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
