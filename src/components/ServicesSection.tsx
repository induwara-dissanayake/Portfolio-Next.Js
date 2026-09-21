"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Server, Video, Terminal, ChevronDown, CheckCircle2, Sparkles, ArrowUpRight } from "lucide-react";

export function ServicesSection() {
  const [activeCard, setActiveCard] = useState<number | null>(0);

  const services = [
    {
      id: 0,
      name: "Website Developer",
      tagline: "High-Performance Modern Web Apps",
      icon: Code2,
      badge: "Core Service",
      description:
        "Building fast, fully responsive, and accessible web applications using modern frameworks like React and Next.js, engineered for peak performance and user experience.",
      capabilities: [
        "Single Page & Multi-Page Apps",
        "Responsive & Mobile-First Design",
        "Web Performance & Core Web Vitals",
        "Cross-Browser Compatibility",
      ],
    },
    {
      id: 1,
      name: "Backend Developer",
      tagline: "Scalable APIs & Database Architectures",
      icon: Server,
      badge: "Architecture",
      description:
        "Robust server architecture, REST & GraphQL API development, database optimization, and secure authentication pipelines built to handle high throughput.",
      capabilities: [
        "RESTful & GraphQL API Design",
        "Database Schema & Optimization",
        "User Auth & Security Middleware",
        "Third-Party Service Integrations",
      ],
    },
    {
      id: 2,
      name: "Social Media Content Creator",
      tagline: "Engaging Visuals & Digital Media Strategy",
      icon: Video,
      badge: "Content",
      description:
        "Creating high-impact digital graphics, video editing, social media visual campaigns, and content strategies engineered for brand awareness and audience growth.",
      capabilities: [
        "Short-Form Video & Visual Reels",
        "Graphic Design & Visual Branding",
        "Content Publishing Strategy",
        "Audience Growth & Engagement",
      ],
    },
    {
      id: 3,
      name: "Software Developer",
      tagline: "Custom Systems & High-Level Software Logic",
      icon: Terminal,
      badge: "Development",
      description:
        "Designing and building reliable, scalable software tools, automated workflows, custom scripts, and backend algorithms tailored for real-world client requirements.",
      capabilities: [
        "Custom Software Architecture",
        "Cross-Platform Tools & Scripts",
        "Algorithms & System Automation",
        "Code Optimization & Testing",
      ],
    },
  ];

  return (
    <section className="section relative overflow-hidden" id="service">
      {/* Background Ambient Glow */}
      <div className="blob-big top-1/3 -right-20 opacity-30" />

      <div className="max-w-[1120px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--hue),75%,60%)]/10 text-[hsl(var(--hue),75%,60%)] text-xs font-semibold uppercase tracking-widest border border-[hsl(var(--hue),75%,60%)]/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" /> What I Deliver
          </span>
          <h2 className="section__title !mb-2">
            <span>My</span> Services
          </h2>
          <p className="text-sm md:text-base text-[hsl(var(--hue),4%,70%)] max-w-xl mx-auto leading-relaxed">
            High-quality digital solutions tailored for companies and clients, focusing on craftsmanship, performance, and impact.
          </p>
        </div>

        {/* 2x2 Interactive Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            const isOpen = activeCard === service.id;

            return (
              <motion.div
                key={service.id}
                layout
                onClick={() => setActiveCard(isOpen ? null : service.id)}
                className={`relative rounded-3xl p-8 cursor-pointer transition-all duration-500 overflow-hidden border ${
                  isOpen
                    ? "bg-[hsl(var(--hue),8%,12%)] border-[hsl(var(--hue),75%,60%)] shadow-[0_12px_40px_hsla(var(--hue),75%,60%,0.15)]"
                    : "bg-[hsl(var(--hue),8%,10%)] border-[hsl(var(--hue),8%,20%)] hover:border-[hsl(var(--hue),75%,60%)]/50 hover:bg-[hsl(var(--hue),8%,11%)]"
                }`}
              >
                {/* Gradient Accent Bar on top */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 transition-opacity duration-500 ${
                    isOpen
                      ? "bg-gradient-to-r from-[hsl(var(--hue),75%,60%)] via-emerald-400 to-[hsl(var(--hue),75%,60%)] opacity-100"
                      : "opacity-0"
                  }`}
                />

                {/* Top Row: Icon, Title & Badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        isOpen
                          ? "bg-[hsl(var(--hue),75%,60%)] text-[hsl(var(--hue),12%,8%)] shadow-[0_4px_20px_hsla(var(--hue),75%,60%,0.4)]"
                          : "bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),75%,60%)] border border-[hsl(var(--hue),8%,20%)]"
                      }`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[hsl(var(--hue),75%,60%)] font-syne uppercase tracking-wider block mb-1">
                        {service.badge}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold font-syne text-[hsl(var(--hue),24%,98%)]">
                        {service.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 border ${
                      isOpen
                        ? "bg-[hsl(var(--hue),75%,60%)] text-[hsl(var(--hue),12%,8%)] border-[hsl(var(--hue),75%,60%)] rotate-180"
                        : "bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),75%,60%)] border-[hsl(var(--hue),8%,20%)]"
                    }`}
                    aria-label="Toggle details"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Tagline & Description */}
                <p className="text-xs font-semibold text-[hsl(var(--hue),75%,60%)] mb-3">
                  {service.tagline}
                </p>
                <p className="text-sm text-[hsl(var(--hue),4%,70%)] leading-relaxed mb-6">
                  {service.description}
                </p>

                {/* Capabilities Expandable Panel */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pt-6 border-t border-[hsl(var(--hue),8%,20%)]"
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--hue),24%,98%)] font-syne mb-4">
                        Key Capabilities &amp; Features:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {service.capabilities.map((cap) => (
                          <div
                            key={cap}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)]"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--hue),75%,60%)] flex-shrink-0" />
                            <span className="text-xs font-medium text-[hsl(var(--hue),24%,98%)]">
                              {cap}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bottom Card Footer Action Indicator */}
                <div className="mt-6 pt-4 border-t border-[hsl(var(--hue),8%,20%)]/50 flex items-center justify-between text-xs font-semibold text-[hsl(var(--hue),75%,60%)]">
                  <span>{isOpen ? "Click to collapse" : "Click to expand details"}</span>
                  <ArrowUpRight className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
