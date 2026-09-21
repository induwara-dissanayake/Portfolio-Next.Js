export function AboutSection() {
  return (
    <section className="section relative overflow-hidden bg-[hsl(var(--hue),8%,10%)]/30 border-y border-[hsl(var(--hue),8%,20%)]/50 py-20" id="about">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] leading-snug mb-8">
            About Me: Young developer who enjoys{" "}
            <span className="text-[hsl(var(--hue),75%,60%)]">web design</span> and{" "}
            <span className="text-[hsl(var(--hue),75%,60%)]">development</span>, passionate about my work, disciplined, and successful.
          </h2>

          <p className="text-base sm:text-lg text-[hsl(var(--hue),4%,70%)] max-w-2xl mb-10 leading-relaxed">
            If you have a project in mind, check out my work and contact me to work together. Best of luck!
          </p>

          <a
            href="#contact"
            className="btn-bianca px-8 py-3.5 text-base font-semibold rounded-full"
          >
            Contact me <i className="ri-send-plane-line" />
          </a>
        </div>
      </div>
    </section>
  );
}
