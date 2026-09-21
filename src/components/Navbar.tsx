"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Determine active section based on scroll position
      const sections = ["home", "work", "service", "skills", "contact"];
      const scrollPos = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hide Navbar completely on full standalone demo routes or admin routes
  if (pathname?.startsWith("/demos") || pathname?.startsWith("/admin")) {
    return null;
  }

  const navLinks = [
    { href: "#home", label: "Home", id: "home" },
    { href: "#work", label: "Works", id: "work" },
    { href: "#service", label: "My Services", id: "service" },
    { href: "#skills", label: "Skills", id: "skills" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${
        isScrolled
          ? "bg-[hsla(var(--hue),8%,10%,0.75)] backdrop-blur-xl border-b border-[hsl(var(--hue),8%,20%)] py-4"
          : "bg-transparent py-6"
      }`}
    >
      <nav className="max-w-[1120px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="#home"
          className="text-2xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] hover:text-[hsl(var(--hue),75%,60%)] transition-colors"
        >
          Induwara
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center space-x-12">
          <ul className="flex items-center space-x-10">
            {navLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  className={`relative font-semibold transition-colors duration-300 ${
                    activeSection === link.id
                      ? "text-[hsl(var(--hue),75%,60%)]"
                      : "text-[hsl(var(--hue),24%,98%)] hover:text-[hsl(var(--hue),75%,60%)]"
                  }`}
                >
                  {link.label}
                  {activeSection === link.id && (
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[hsl(var(--hue),75%,60%)] rounded-full" />
                  )}
                </a>
              </li>
            ))}
          </ul>

          {/* Contact Pill Button */}
          <a
            href="#contact"
            className="btn-bianca text-sm py-3 px-7 rounded-full bg-[hsl(var(--hue),75%,60%)] text-[hsl(var(--hue),12%,8%)] font-semibold hover:shadow-[0_8px_24px_hsla(var(--hue),75%,60%,0.3)] transition-all duration-300"
          >
            Contact me
          </a>
        </div>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          className="lg:hidden text-2xl text-[hsl(var(--hue),24%,98%)] focus:outline-none p-1"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[hsl(var(--hue),8%,10%)] border-b border-[hsl(var(--hue),8%,20%)] px-6 py-6 space-y-4">
          <ul className="space-y-4">
            {navLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-base font-semibold ${
                    activeSection === link.id
                      ? "text-[hsl(var(--hue),75%,60%)]"
                      : "text-[hsl(var(--hue),24%,98%)]"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-center btn-bianca text-sm py-3 px-7 rounded-full bg-[hsl(var(--hue),75%,60%)] text-[hsl(var(--hue),12%,8%)] font-semibold"
          >
            Contact me
          </a>
        </div>
      )}
    </header>
  );
}
