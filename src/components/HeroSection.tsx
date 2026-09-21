"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Terminal, Code2 } from "lucide-react";

const PROFESSIONS = [
  "Software Developer",
  "Web Application Dev",
  "Social Media Content Creator",
  "Full-Stack Specialist",
];

export function HeroSection() {
  const [professionIndex, setProfessionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProfessionIndex((prev) => (prev + 1) % PROFESSIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden" id="home">
      {/* Background Decorative Ambient Glows */}
      <div className="blob-big -top-20 left-1/4 opacity-60 blur-3xl" />
      <div className="blob-small top-1/2 right-10 opacity-40 blur-2xl" />

      <div className="max-w-[1120px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column: Text & Content */}
        <div className="lg:col-span-7 flex flex-col items-start z-10">
          
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--hue),75%,60%)]/10 border border-[hsl(var(--hue),75%,60%)]/30 text-[hsl(var(--hue),75%,60%)] text-xs font-semibold tracking-wide mb-6 backdrop-blur-md"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--hue),75%,60%)] animate-pulse" />
            Available for New Projects &amp; Collaborations
          </motion.div>

          {/* Main Greeting */}
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg sm:text-xl md:text-2xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] mb-2"
          >
            Hi, I&apos;m <span className="text-[hsl(var(--hue),75%,60%)]">Induwara</span> — Based in Sri Lanka
          </motion.h2>

          {/* Main Dynamic Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-syne text-[hsl(var(--hue),24%,98%)] leading-[1.15] mb-6 tracking-tight"
          >
            Building High-Impact <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--hue),75%,60%)] via-emerald-300 to-teal-400">
              {PROFESSIONS[professionIndex]}
            </span>
          </motion.h1>

          {/* Subtitle / Bio */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-base sm:text-lg text-[hsl(var(--hue),4%,70%)] leading-relaxed mb-8 max-w-xl"
          >
            Passionate software developer and web specialist creating modern web applications, custom desktop systems, and interactive digital solutions tailored for real business success.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 mb-12"
          >
            <a
              href="#contact"
              className="btn-bianca text-sm sm:text-base px-8 py-4 rounded-full font-bold shadow-[0_8px_24px_hsla(var(--hue),75%,60%,0.25)] hover:shadow-[0_12px_32px_hsla(var(--hue),75%,60%,0.4)] transition-all flex items-center gap-2"
            >
              Let&apos;s Work Together <ArrowRight className="w-5 h-5" />
            </a>

            <a
              href="#work"
              className="px-7 py-4 rounded-full bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),24%,98%)] border border-[hsl(var(--hue),8%,20%)] hover:border-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),75%,60%)] transition-all font-semibold text-sm sm:text-base flex items-center gap-2 backdrop-blur-md"
            >
              View My Work <Terminal className="w-4 h-4 text-[hsl(var(--hue),75%,60%)]" />
            </a>
          </motion.div>

          {/* Experience Highlights / Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-3 gap-6 pt-6 border-t border-[hsl(var(--hue),8%,20%)]/80 w-full max-w-lg"
          >
            <div>
              <div className="text-2xl sm:text-3xl font-black font-syne text-[hsl(var(--hue),75%,60%)]">3+</div>
              <div className="text-xs text-[hsl(var(--hue),4%,70%)] font-medium mt-0.5">Years Experience</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-syne text-[hsl(var(--hue),75%,60%)]">10+</div>
              <div className="text-xs text-[hsl(var(--hue),4%,70%)] font-medium mt-0.5">Projects Delivered</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-syne text-[hsl(var(--hue),75%,60%)]">100%</div>
              <div className="text-xs text-[hsl(var(--hue),4%,70%)] font-medium mt-0.5">Client Satisfaction</div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Profile Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="lg:col-span-5 flex justify-center z-10 relative"
        >
          <div className="relative w-full max-w-[380px]">
            {/* Glowing Accent Border Card */}
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden border-2 border-[hsl(var(--hue),75%,60%)]/30 bg-[hsl(var(--hue),8%,10%)] shadow-[0_0_50px_hsla(var(--hue),75%,60%,0.15)] group transition-all duration-500 hover:border-[hsl(var(--hue),75%,60%)]/60">
              <Image
                src="/assets/img/home-img.png"
                alt="Induwara Portfolio Profile"
                fill
                className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--hue),12%,4%)] via-transparent to-transparent opacity-60" />
            </div>

            {/* Floating Glassmorphic Badges */}
            <div className="absolute -bottom-5 -left-5 bg-[hsl(var(--hue),8%,10%)]/90 backdrop-blur-xl border border-[hsl(var(--hue),75%,60%)]/40 p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--hue),75%,60%)]/20 text-[hsl(var(--hue),75%,60%)] flex items-center justify-center font-bold">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[hsl(var(--hue),24%,98%)]">Full-Stack Developer</p>
                <p className="text-[10px] text-[hsl(var(--hue),4%,70%)]">Next.js &amp; Modern Systems</p>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-[hsl(var(--hue),8%,10%)]/90 backdrop-blur-xl border border-[hsl(var(--hue),8%,20%)] p-3 rounded-2xl shadow-xl flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[hsl(var(--hue),75%,60%)]" />
              <span className="text-xs font-bold text-[hsl(var(--hue),24%,98%)]">Clean Architecture</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
