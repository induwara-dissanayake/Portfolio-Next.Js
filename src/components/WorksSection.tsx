"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ExternalLink, Github, Maximize2, X } from "lucide-react";

export interface ProjectItem {
  id: number;
  number: string;
  title: string;
  category: "Web Dev" | "UI/UX Design" | "Systems" | "SEO & Apps";
  description: string;
  fullDescription: string;
  image: string;
  url?: string;
  githubUrl?: string;
  technologies: string[];
}

export function WorksSection() {
  const projects: ProjectItem[] = [
    {
      id: 1,
      number: "01",
      title: "Restaurant Website",
      category: "Web Dev",
      description: "Professional website for a hospitality company, using HTML, CSS, JavaScript, Gsap, Figma & Database.",
      fullDescription: "A feature-rich interactive restaurant showcase website with online reservation tables, digital menu displays, location finder, and smooth GSAP scroll animations. Built for optimal mobile responsiveness and lighting-fast load speeds.",
      image: "/assets/img/work-img-1.png",
      url: "https://example.com/restaurant",
      githubUrl: "https://github.com",
      technologies: ["React", "HTML5/CSS3", "GSAP", "Tailwind CSS"],
    },
    {
      id: 2,
      number: "02",
      title: "Design For Agriculture",
      category: "UI/UX Design",
      description: "Modern landing platform built for agricultural tech, showcasing interactive dashboards and smart IoT insights.",
      fullDescription: "Comprehensive AgTech platform design empowering farmers and enterprise agricultural managers with real-time weather analytics, crop soil monitoring dashboards, and clean data visualizations created in Figma and implemented in Next.js.",
      image: "/assets/img/work-img-2.png",
      url: "https://example.com/agtech",
      githubUrl: "https://github.com",
      technologies: ["Figma", "Next.js", "Tailwind CSS", "Recharts"],
    },
    {
      id: 3,
      number: "03",
      title: "Chicken Shop Website",
      category: "Web Dev",
      description: "Fast ecommerce web application for fast-food chain with online ordering and live tracking.",
      fullDescription: "High-conversion fast-food ecommerce application featuring custom basket checkout, real-time order status tracking, dynamic coupon system, and seamless integration with payment gateways.",
      image: "/assets/img/work-img-3.png",
      url: "https://example.com/chickenshop",
      githubUrl: "https://github.com",
      technologies: ["React", "TypeScript", "Node.js", "Express"],
    },
    {
      id: 4,
      number: "04",
      title: "Complete Systems For Mining",
      category: "Systems",
      description: "Enterprise system management software designed for data monitoring, safety, and operational workflows.",
      fullDescription: "Industrial-grade desktop and cloud management platform for heavy mining operations. Handles telemetry streaming, asset management alerts, multi-level user permissions, and automated audit logging.",
      image: "/assets/img/work-img-4.png",
      url: "https://example.com/miningsystem",
      githubUrl: "https://github.com",
      technologies: ["TypeScript", "Python", "Docker", "Tailwind CSS"],
    },
    {
      id: 5,
      number: "05",
      title: "SEO Medicine Website",
      category: "SEO & Apps",
      description: "Optimized healthcare website designed for maximum accessibility, search engine ranking, and speed.",
      fullDescription: "High-performance medical portal compliant with accessibility guidelines. Optimized with structured JSON-LD schemas, dynamic metadata generation, and sub-second load times to capture top Google search rankings.",
      image: "/assets/img/work-img-5.png",
      url: "https://example.com/seomedicine",
      githubUrl: "https://github.com",
      technologies: ["Next.js", "Technical SEO", "Tailwind CSS", "Vercel"],
    },
  ];

  const categories = ["All", "Web Dev", "UI/UX Design", "Systems", "SEO & Apps"] as const;
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  const filteredProjects =
    activeCategory === "All"
      ? projects
      : projects.filter((p) => p.category === activeCategory);

  return (
    <section className="section relative" id="work">
      <div className="max-w-[1120px] mx-auto px-6">
        <h2 className="section__title">
          View My <span>Work</span>
        </h2>

        {/* Interactive Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-[hsl(var(--hue),75%,60%)] text-[hsl(var(--hue),12%,8%)] shadow-[0_4px_20px_hsla(var(--hue),75%,60%,0.3)]"
                    : "bg-[hsl(var(--hue),8%,10%)] text-[hsl(var(--hue),4%,70%)] border border-[hsl(var(--hue),8%,20%)] hover:border-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),24%,98%)]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Projects Grid with Motion Layout */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="bianca-card group flex flex-col justify-between cursor-pointer hover:-translate-y-2 hover:border-[hsl(var(--hue),75%,60%)] transition-all duration-300"
                onClick={() => setSelectedProject(project)}
              >
                <div>
                  {/* Project Image & Badge */}
                  <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-6 bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)]">
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover object-top group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--hue),12%,8%)] via-transparent to-transparent opacity-0 group-hover:opacity-80 transition-opacity duration-300 flex items-end p-4">
                      <span className="text-xs font-semibold text-[hsl(var(--hue),75%,60%)] flex items-center gap-1.5">
                        Click to view details <Maximize2 className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <span className="absolute top-3 left-3 bg-[hsl(var(--hue),12%,8%)]/90 backdrop-blur-md text-[hsl(var(--hue),75%,60%)] font-bold font-syne px-3 py-1 text-sm rounded-md border border-[hsl(var(--hue),8%,20%)]">
                      {project.number}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] group-hover:text-[hsl(var(--hue),75%,60%)] transition-colors">
                      {project.title}
                    </h3>
                  </div>

                  <p className="text-sm text-[hsl(var(--hue),4%,70%)] mb-6 leading-relaxed line-clamp-2">
                    {project.description}
                  </p>
                </div>

                {/* Tech Chips */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="text-xs px-2.5 py-1 rounded-full bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),4%,70%)] border border-[hsl(var(--hue),8%,20%)]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(var(--hue),75%,60%)] group-hover:translate-x-1 transition-transform">
                    Explore Project <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Interactive Lightbox Modal */}
        <AnimatePresence>
          {selectedProject && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-3xl bg-[hsl(var(--hue),8%,10%)] border border-[hsl(var(--hue),8%,20%)] rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-6 right-6 text-[hsl(var(--hue),24%,98%)] hover:text-[hsl(var(--hue),75%,60%)] transition-colors p-1"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Modal Content */}
                <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-6 bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)]">
                  <Image
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    fill
                    className="object-cover object-top"
                  />
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[hsl(var(--hue),75%,60%)] text-[hsl(var(--hue),12%,8%)] font-syne uppercase tracking-wider">
                    {selectedProject.category}
                  </span>
                  <span className="text-sm text-[hsl(var(--hue),4%,70%)] font-syne font-bold">
                    Project {selectedProject.number}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] mb-4">
                  {selectedProject.title}
                </h3>

                <p className="text-base text-[hsl(var(--hue),4%,70%)] leading-relaxed mb-6">
                  {selectedProject.fullDescription}
                </p>

                {/* Tech Badges */}
                <div className="mb-8">
                  <h4 className="text-sm font-semibold text-[hsl(var(--hue),24%,98%)] mb-3">
                    Technologies &amp; Tools Used:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="text-xs px-3 py-1.5 rounded-full bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),75%,60%)] border border-[hsl(var(--hue),8%,20%)] font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[hsl(var(--hue),8%,20%)]">
                  {selectedProject.url && (
                    <a
                      href={selectedProject.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-bianca text-sm py-3 px-6 rounded-full flex items-center gap-2"
                    >
                      Live Demo <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {selectedProject.githubUrl && (
                    <a
                      href={selectedProject.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),24%,98%)] border border-[hsl(var(--hue),8%,20%)] hover:border-[hsl(var(--hue),75%,60%)] transition-colors text-sm font-semibold"
                    >
                      Source Code <Github className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
