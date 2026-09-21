"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const PROFESSIONS = ["Web Developer", "UI/UX Designer", "AI Creator", "Full-Stack Dev"];

export function HeroSection() {
  const [typedText, setTypedText] = useState("Web Developer");

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % PROFESSIONS.length;
      setTypedText(PROFESSIONS[index]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Circular text letters: "EXPLORE - MORE - LET'S -"
  const circularText = "EXPLORE • MORE • LET'S • ";

  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden" id="home">
      {/* Background Blobs */}
      <div className="blob-big -top-10 left-1/4" />
      <div className="blob-small top-1/2 right-10" />

      <div className="max-w-[1120px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Text & Content */}
        <div className="lg:col-span-7 flex flex-col items-start z-10">
          <span className="text-sm md:text-base text-[hsl(var(--hue),75%,60%)] font-medium mb-3 tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--hue),75%,60%)] animate-ping" />
            Hi! I&apos;m Induwara — Based in Sri Lanka
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] leading-tight mb-6">
            Creative Designer &amp; <br />
            <span className="text-[hsl(var(--hue),75%,60%)] transition-all duration-500">
              {typedText}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[hsl(var(--hue),4%,70%)] max-w-lg mb-10 leading-relaxed">
            I build designs and websites that solve problems, inspiring success with high-quality user experiences.
          </p>

          {/* Action Row & Circular Badge */}
          <div className="flex items-center gap-8">
            <a
              href="#contact"
              className="btn-bianca text-base px-8 py-4 rounded-full font-semibold shadow-[0_8px_24px_hsla(var(--hue),75%,60%,0.25)] hover:shadow-[0_12px_32px_hsla(var(--hue),75%,60%,0.4)] transition-all"
            >
              Let&apos;s Work Together <i className="ri-arrow-right-line" />
            </a>

            {/* Circular Rotating Badge */}
            <div className="relative w-28 h-28 hidden sm:flex items-center justify-center">
              <a
                href="#work"
                className="absolute w-12 h-12 rounded-full bg-[hsl(var(--hue),8%,10%)] border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),75%,60%)] flex items-center justify-center text-xl hover:bg-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),12%,8%)] transition-colors z-10"
                aria-label="Scroll to work"
              >
                <i className="ri-arrow-down-line" />
              </a>

              <div className="w-full h-full rotate-circular-text flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path
                    id="textPath"
                    d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                    fill="none"
                  />
                  <text className="fill-[hsl(var(--hue),4%,70%)] text-[10px] uppercase font-semibold tracking-[0.25em]">
                    <textPath href="#textPath" startOffset="0%">
                      {circularText}
                    </textPath>
                  </text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Profile Image Frame */}
        <div className="lg:col-span-5 flex justify-center z-10 relative">
          <div className="relative w-full max-w-[380px] aspect-[4/5] rounded-[2.5rem] overflow-hidden border-2 border-[hsl(var(--hue),8%,20%)] bg-[hsl(var(--hue),8%,10%)] shadow-2xl group">
            <Image
              src="/assets/img/home-img.png"
              alt="Induwara Portfolio Profile"
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--hue),12%,4%)] via-transparent to-transparent opacity-60" />
          </div>
        </div>
      </div>
    </section>
  );
}
