import Image from "next/image";

export function TestimonialsSection() {
  const testimonials = [
    {
      id: 1,
      name: "Sara The",
      role: "Product Owner",
      avatar: "/assets/img/testimonial-1.png",
      rating: 5.0,
      comment:
        "This young developer is very disciplined; he delivered a professional and high-quality project. He is always in contact and active regarding time, Good work.",
    },
    {
      id: 2,
      name: "Elemar Rice",
      role: "Tech Lead",
      avatar: "/assets/img/testimonial-2.png",
      rating: 5.0,
      comment:
        "Remarkable attention to detail and clean design execution. Working with Induwara was seamless and the output exceeded our expectations!",
    },
    {
      id: 3,
      name: "Rita Treds",
      role: "UI/UX Director",
      avatar: "/assets/img/testimonial-3.png",
      rating: 5.0,
      comment:
        "Great communication, top-tier performance optimization, and creative layout solutions. Highly recommended for modern web apps.",
    },
    {
      id: 4,
      name: "Augus Drix",
      role: "Startup Founder",
      avatar: "/assets/img/testimonial-4.png",
      rating: 5.0,
      comment:
        "Delivered our platform ahead of schedule with flawless responsiveness. Exceptional quality and dedication throughout the project.",
    },
  ];

  // Duplicate cards for seamless marquee scrolling loop
  const marqueeItems = [...testimonials, ...testimonials];

  return (
    <section className="section relative overflow-hidden" id="testimonials">
      <div className="max-w-[1120px] mx-auto px-6">
        <h2 className="section__title">
          <span>What</span> They Say
        </h2>

        {/* Rating Score Banner */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center gap-2 text-3xl font-bold font-syne text-[hsl(var(--hue),24%,98%)]">
            <span>5.0</span>
            <div className="flex text-amber-400 text-xl">
              <i className="ri-star-fill" />
              <i className="ri-star-fill" />
              <i className="ri-star-fill" />
              <i className="ri-star-fill" />
              <i className="ri-star-fill" />
            </div>
          </div>
          <span className="text-sm text-[hsl(var(--hue),4%,70%)] mt-1">
            Based on client feedback &amp; project reviews
          </span>
        </div>

        {/* Marquee Container */}
        <div className="relative w-full overflow-hidden mask-gradient-x">
          <div className="animate-marquee flex gap-6">
            {marqueeItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="w-[320px] sm:w-[380px] flex-shrink-0 bianca-card flex flex-col justify-between"
              >
                <p className="text-sm text-[hsl(var(--hue),4%,70%)] leading-relaxed italic mb-6">
                  &ldquo;{item.comment}&rdquo;
                </p>

                <div className="flex items-center gap-4 border-t border-[hsl(var(--hue),8%,20%)] pt-4 mt-auto">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[hsl(var(--hue),75%,60%)] flex-shrink-0">
                    <Image
                      src={item.avatar}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold font-syne text-[hsl(var(--hue),24%,98%)]">
                      {item.name}
                    </h4>
                    <span className="text-xs text-[hsl(var(--hue),4%,70%)]">
                      {item.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
