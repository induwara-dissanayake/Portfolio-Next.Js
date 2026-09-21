import { HeroSection } from "@/components/HeroSection";
import { AboutSection } from "@/components/AboutSection";
import { WorksSection } from "@/components/WorksSection";
import { ServicesSection } from "@/components/ServicesSection";
import { SkillsSection } from "@/components/SkillsSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { ContactSection } from "@/components/ContactSection";
import { headers } from "next/headers";

export type Project = {
  id: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  projectUrl?: string | null;
  githubUrl?: string | null;
  technologies?: string | null;
  featured: boolean;
};

export const dynamic = "force-dynamic";

export default async function Home() {
  let featured: Project[] = [];

  try {
    const host = (await headers()).get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const res = await fetch(`${protocol}://${host}/api/projects`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const allProjects: Project[] = await res.json();
      featured = allProjects.filter((p) => p.featured);
      if (featured.length === 0) {
        featured = allProjects.slice(0, 6);
      }
    }
  } catch (error) {
    console.error("Error fetching projects for home page:", error);
  }

  return (
    <div className="relative overflow-hidden">
      <HeroSection />
      <AboutSection />
      <WorksSection projects={featured} />
      <ServicesSection />
      <SkillsSection />
      <TestimonialsSection />
      <ContactSection />
    </div>
  );
}
