"use client";

import Image from "next/image";
import { Project } from "@/app/page";

interface WorksSectionProps {
  projects?: Project[];
}

export function WorksSection({ projects }: WorksSectionProps) {
  // Default demo projects matching Bianca's structure if database is empty or loading
  const fallbackProjects = [
    {
      id: 1,
      number: "01",
      title: "Restaurant Website",
      description: "Professional website for a company, using HTML, CSS, JavaScript, Gsap, Figma, Database and others.",
      image: "/assets/img/work-img-1.png",
      url: "#",
      technologies: ["React", "CSS", "Node.js"],
    },
    {
      id: 2,
      number: "02",
      title: "Design For Agriculture",
      description: "Modern landing platform built for agricultural tech, showcasing interactive dashboards and smart IoT insights.",
      image: "/assets/img/work-img-2.png",
      url: "#",
      technologies: ["Next.js", "Tailwind", "Prisma"],
    },
    {
      id: 3,
      number: "03",
      title: "Chicken Shop Website",
      description: "Fast ecommerce web application for fast-food chain with online ordering and live tracking.",
      image: "/assets/img/work-img-3.png",
      url: "#",
      technologies: ["React", "Express", "PostgreSQL"],
    },
    {
      id: 4,
      number: "04",
      title: "Complete Systems For Mining",
      description: "Enterprise system management software designed for data monitoring, safety, and operational workflows.",
      image: "/assets/img/work-img-4.png",
      url: "#",
      technologies: ["TypeScript", "Tailwind", "Python"],
    },
    {
      id: 5,
      number: "05",
      title: "SEO Medicine Website",
      description: "Optimized healthcare website designed for maximum accessibility, search engine ranking, and speed.",
      image: "/assets/img/work-img-5.png",
      url: "#",
      technologies: ["Next.js", "SEO", "Tailwind"],
    },
  ];

  const displayProjects = projects && projects.length > 0
    ? projects.map((p, idx) => ({
        id: p.id,
        number: `0${idx + 1}`,
        title: p.title,
        description: p.description,
        image: p.imageUrl || `/assets/img/work-img-${(idx % 5) + 1}.png`,
        url: p.projectUrl || p.githubUrl || "#",
        technologies: p.technologies ? p.technologies.split(",").map(t => t.trim()) : ["Full-Stack"],
      }))
    : fallbackProjects;

  return (
    <section className="section relative" id="work">
      <div className="max-w-[1120px] mx-auto px-6">
        <h2 className="section__title">
          View My <span>Work</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {displayProjects.map((project) => (
            <div
              key={project.id}
              className="bianca-card group flex flex-col justify-between hover:-translate-y-2 transition-transform duration-300"
            >
              <div>
                {/* Project Image */}
                <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-6 bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)]">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[hsl(var(--hue),12%,8%)]/90 backdrop-blur-md text-[hsl(var(--hue),75%,60%)] font-bold font-syne px-3 py-1 text-sm rounded-md border border-[hsl(var(--hue),8%,20%)]">
                    {project.number}
                  </span>
                </div>

                {/* Project Info */}
                <h3 className="text-xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] mb-3 group-hover:text-[hsl(var(--hue),75%,60%)] transition-colors">
                  {project.title}
                </h3>

                <p className="text-sm text-[hsl(var(--hue),4%,70%)] mb-6 leading-relaxed line-clamp-3">
                  {project.description}
                </p>
              </div>

              {/* Technologies & Link */}
              <div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-3 py-1 rounded-full bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),4%,70%)] border border-[hsl(var(--hue),8%,20%)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {project.url && project.url !== "#" ? (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--hue),75%,60%)] hover:underline"
                  >
                    View Project <i className="ri-arrow-right-up-line" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--hue),75%,60%)] cursor-default">
                    Demo Preview <i className="ri-[arrow-right-line]" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
