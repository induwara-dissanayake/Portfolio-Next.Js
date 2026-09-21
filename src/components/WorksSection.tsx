"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Github, Maximize2, X, ArrowUpRight, Monitor } from "lucide-react";

export interface ProjectItem {
  id: number;
  number: string;
  title: string;
  category: "Web Dev" | "Desktop app" | "social media";
  description: string;
  fullDescription: string;
  image: string;
  url: string;
  githubUrl?: string;
  technologies: string[];
}

export function WorksSection() {
  const projects: ProjectItem[] = [
    {
      id: 1,
      number: "01",
      title: "DentQ - Dental Queue Management System",
      category: "Web Dev",
      description: "Online dental queue reservation platform allowing patients to reserve tokens and view live queue statuses from home.",
      fullDescription: "DentQ is a modern healthcare web application designed for dental clinics. Patients can select preferred appointment dates, reserve queue tokens online, explore treatments, and monitor live clinic queue statuses to eliminate waiting room delays.",
      image: "/assets/img/work-img-1.png",
      url: "https://dental-bay-nine.vercel.app/",
      githubUrl: "https://github.com/induwara-dissanayake",
      technologies: ["Next.js", "Tailwind CSS", "Clerk Auth", "React Query", "TypeScript"],
    },
    {
      id: 2,
      number: "02",
      title: "Blastin & Lastin - US Cleaning Platform",
      category: "Web Dev",
      description: "Full exterior cleaning web system for US clients featuring instant quote calculation, electronic booking & reviews.",
      fullDescription: "Engineered a high-conversion exterior house washing and pressure cleaning web platform serving the Greater Houston area. Features instant online quote estimations, service photo galleries, electronic agreement signing, customer review systems, and area service maps.",
      image: "/assets/img/work-img-2.png",
      url: "https://blastinandlastin.us/",
      githubUrl: "https://github.com/induwara-dissanayake",
      technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "Vercel"],
    },
    {
      id: 3,
      number: "03",
      title: "ERP System - Thilina Mobiles",
      category: "Desktop app",
      description: "Full ERP desktop application built for a mobile phone sales, inventory, and repair service shop.",
      fullDescription: "A comprehensive enterprise desktop ERP system designed to streamline mobile store operations. Includes real-time inventory management, repair job tracking cards, point of sale (POS) billing, daily financial summaries, and customer repair status notifications.",
      image: "/assets/img/work-img-4.png",
      url: "/demos/thilina-mobiles-erp",
      githubUrl: "https://github.com/induwara-dissanayake",
      technologies: ["TypeScript", "Electron.js", "Node.js", "SQLite/SQL", "Tailwind CSS"],
    },
    {
      id: 4,
      number: "04",
      title: "Bookshop Manager Desktop App",
      category: "Desktop app",
      description: "Private bookshop management software for weekly book rentals, return reminders, and fee calculations.",
      fullDescription: "Desktop management application built for a private bookshop offering weekly rental memberships. Features member subscription records, automated weekly return date tracking, late fee calculations, book inventory indexing, and revenue analytics.",
      image: "/assets/img/work-img-3.png",
      url: "/demos/bookshop-manager",
      githubUrl: "https://github.com/induwara-dissanayake",
      technologies: ["Desktop Framework", "TypeScript", "SQLite", "Node.js"],
    },
    {
      id: 5,
      number: "05",
      title: "Samantha Prasath SFT Media Content",
      category: "social media",
      description: "Social media visual graphics, educational promo banners, and media campaigns for prominent SFT tuition lecturer.",
      fullDescription: "Created digital branding, social media promotional banners, video edits, and educational course materials for Samantha Prasath — a renowned Science for Technology (SFT) tuition lecturer in Galle. Designed to increase student engagement and class enrollment on Facebook.",
      image: "/assets/img/work-img-5.png",
      url: "https://www.facebook.com/samantha.prasath",
      githubUrl: "https://www.facebook.com/samantha.prasath",
      technologies: ["Figma", "Photoshop", "Premiere Pro", "Social Media Strategy"],
    },
  ];

  const categories = ["All", "Web Dev", "Desktop app", "social media"] as const;
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

        {/* Interactive Filter Tabs (All, Web Dev, Desktop app, social media) */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 capitalize ${
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

        {/* Projects Grid */}
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
                className="bianca-card group flex flex-col justify-between hover:-translate-y-2 hover:border-[hsl(var(--hue),75%,60%)] transition-all duration-300"
              >
                <div>
                  {/* Project Image & Badge */}
                  <div
                    className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-6 bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)] cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
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

                    {project.category === "Desktop app" && (
                      <span className="absolute top-3 right-3 bg-[hsl(var(--hue),75%,60%)] text-[hsl(var(--hue),12%,8%)] font-bold text-[10px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <Monitor className="w-3 h-3" /> Live Web Demo
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="flex items-center justify-between mb-2">
                    <h3
                      className="text-xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] group-hover:text-[hsl(var(--hue),75%,60%)] transition-colors cursor-pointer"
                      onClick={() => setSelectedProject(project)}
                    >
                      {project.title}
                    </h3>
                  </div>

                  <p className="text-sm text-[hsl(var(--hue),4%,70%)] mb-6 leading-relaxed line-clamp-3">
                    {project.description}
                  </p>
                </div>

                {/* Tech Chips & Explore Button */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="text-xs px-2.5 py-1 rounded-full bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),4%,70%)] border border-[hsl(var(--hue),8%,20%)]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--hue),75%,60%)] hover:underline group-hover:translate-x-1 transition-transform"
                  >
                    {project.category === "Desktop app" ? "Launch Interactive Web Demo" : "Explore Project"}{" "}
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
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

                {/* Modal Header Badge & Title */}
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

                {/* Image Preview */}
                <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-6 bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)]">
                  <Image
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    fill
                    className="object-cover object-top"
                  />
                </div>

                {/* Tech Badges */}
                <div className="mb-8">
                  <h4 className="text-sm font-semibold text-[hsl(var(--hue),24%,98%)] mb-3">
                    Technologies &amp; Architecture Used:
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
                  <a
                    href={selectedProject.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-bianca text-sm py-3 px-6 rounded-full flex items-center gap-2 font-bold"
                  >
                    {selectedProject.category === "Desktop app" ? "Launch Interactive Web Demo" : "Open Live Demo / Link"}{" "}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {selectedProject.githubUrl && (
                    <a
                      href={selectedProject.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),24%,98%)] border border-[hsl(var(--hue),8%,20%)] hover:border-[hsl(var(--hue),75%,60%)] transition-colors text-sm font-semibold"
                    >
                      View Source Code on GitHub <Github className="w-4 h-4" />
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
