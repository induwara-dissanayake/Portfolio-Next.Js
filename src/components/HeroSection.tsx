"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const PROFESSIONS = ["Software Developer", "Web Developer", "Content Creator", "Full-Stack Dev"];

export function HeroSection() {
  const [typedText, setTypedText] = useState("Software Developer");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % PROFESSIONS.length;
      setTypedText(PROFESSIONS[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden" id="home">
      {/* Background Blobs */}
      <div className="blob-big -top-10 left-1/4" />
      <div className="blob-small top-1/2 right-10" />

      <div className="max-w-[1120px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Text & Content */}
        <div className="lg:col-span-7 flex flex-col items-start z-10">
          {/* Main Greeting Text (Made Larger) */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-syne text-[hsl(var(--hue),75%,60%)] mb-4 tracking-wide flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[hsl(var(--hue),75%,60%)] animate-ping flex-shrink-0" />
            Hi! I&apos;m Induwara — Based in Sri Lanka
          </h2>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-syne text-[hsl(var(--hue),75%,60%)] leading-tight mb-8">
            <span className="transition-all duration-500">{typedText}</span>
          </h1>

          {/* Action Button */}
          <div>
            <a
              href="#contact"
              className="btn-bianca text-base px-8 py-4 rounded-full font-semibold shadow-[0_8px_24px_hsla(var(--hue),75%,60%,0.25)] hover:shadow-[0_12px_32px_hsla(var(--hue),75%,60%,0.4)] transition-all flex items-center gap-2"
            >
              Let&apos;s Work Together <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Right Column: Hero Profile Image Frame */}
        <div className="lg:col-span-5 flex justify-center z-10 relative">
          <div className="relative w-full max-w-[380px] aspect-[4/5] rounded-[2.5rem] overflow-hidden border-2 border-[hsl(var(--hue),8%,20%)] bg-[hsl(var(--hue),8%,10%)] shadow-2xl group">
            <Image
              src="/assets/img/home-img.png"
              alt="Induwara Portfolio Profile"
              fill
              className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--hue),12%,4%)] via-transparent to-transparent opacity-50" />
          </div>
        </div>
      </div>
    </section>
  );
}
