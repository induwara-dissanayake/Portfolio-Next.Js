"use client";

import { useState } from "react";

export function ServicesSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const services = [
    {
      name: "Website Developer",
      icon: "ri-layout-grid-line",
      description:
        "The service I offer to companies and clients involves working on professional, high-quality websites, doing what I am most passionate about.",
      items: [
        "Web development",
        "Responsive design",
        "Web performance",
        "Cross-browser testing",
      ],
    },
    {
      name: "Backend Developer",
      icon: "ri-code-box-line",
      description:
        "Robust server architecture, API design, database schemas, and scalable cloud solutions tailored for speed and reliability.",
      items: [
        "REST & GraphQL APIs",
        "Database optimization",
        "Security & Authentication",
        "Cloud integrations",
      ],
    },
    {
      name: "Web Designer",
      icon: "ri-palette-line",
      description:
        "Creating beautiful, modern, and intuitive interface designs and design systems that enhance user engagement and visual polish.",
      items: [
        "UI/UX Design",
        "Wireframing & Prototyping",
        "Design Systems",
        "Figma Mockups",
      ],
    },
    {
      name: "SEO Specialist",
      icon: "ri-search-line",
      description:
        "Improving web ranking, organic traffic, and technical search engine optimization to make your products discoverable.",
      items: [
        "Basic & Technical SEO",
        "Performance optimization",
        "Meta tag management",
        "Site audits",
      ],
    },
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="section relative" id="service">
      <div className="max-w-[1120px] mx-auto px-6">
        <h2 className="section__title">
          <span>My</span> Services
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {services.map((service, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={service.name}
                className={`bianca-card cursor-pointer transition-all duration-300 ${
                  isOpen ? "border-[hsl(var(--hue),75%,60%)] bg-[hsl(var(--hue),8%,10%)]" : ""
                }`}
                onClick={() => toggleAccordion(index)}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),75%,60%)] flex items-center justify-center text-2xl border border-[hsl(var(--hue),8%,20%)]">
                      <i className={service.icon} />
                    </div>
                    <h3 className="text-xl font-bold font-syne text-[hsl(var(--hue),24%,98%)]">
                      {service.name}
                    </h3>
                  </div>

                  <button
                    className={`w-8 h-8 rounded-full border border-[hsl(var(--hue),8%,20%)] flex items-center justify-center text-[hsl(var(--hue),75%,60%)] transition-transform duration-300 ${
                      isOpen ? "rotate-180 bg-[hsl(var(--hue),75%,60%)] text-[hsl(var(--hue),12%,8%)]" : ""
                    }`}
                    aria-label="Toggle service details"
                  >
                    <i className="ri-arrow-down-s-line text-lg" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm text-[hsl(var(--hue),4%,70%)] mt-4 leading-relaxed">
                  {service.description}
                </p>

                {/* Expandable Features List */}
                {isOpen && (
                  <div className="mt-6 pt-6 border-t border-[hsl(var(--hue),8%,20%)] animate-fadeIn">
                    <ul className="grid grid-cols-2 gap-3">
                      {service.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2 text-sm text-[hsl(var(--hue),24%,98%)] font-medium"
                        >
                          <i className="ri-checkbox-circle-fill text-[hsl(var(--hue),75%,60%)] text-base" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
