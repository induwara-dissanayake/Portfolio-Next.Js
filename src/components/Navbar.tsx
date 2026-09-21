"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export function Navbar() {
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
          {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
        </button>

        {/* Mobile Navigation Menu Drawer */}
        <div
          className={`fixed top-0 right-0 h-screen w-[75%] max-w-[320px] bg-[hsla(var(--hue),8%,10%,0.95)] backdrop-blur-2xl p-10 z-[100] transition-transform duration-400 ease-in-out lg:hidden border-l border-[hsl(var(--hue),8%,20%)] ${
            mobileMenuOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"
          }`}
        >
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="absolute top-6 right-6 text-2xl text-[hsl(var(--hue),24%,98%)] p-1"
          >
            <X className="w-7 h-7" />
          </button>

          <ul className="flex flex-col space-y-8 mt-16">
            {navLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-xl font-semibold transition-colors ${
                    activeSection === link.id
                      ? "text-[hsl(var(--hue),75%,60%)]"
                      : "text-[hsl(var(--hue),24%,98%)]"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="pt-4">
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-bianca w-full text-center py-3 rounded-full text-sm font-semibold"
              >
                Contact me
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
