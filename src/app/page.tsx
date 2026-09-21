import { HeroSection } from "@/components/HeroSection";
import { WorksSection } from "@/components/WorksSection";
import { ServicesSection } from "@/components/ServicesSection";
import { SkillsSection } from "@/components/SkillsSection";
import { ContactSection } from "@/components/ContactSection";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <HeroSection />
      <WorksSection />
      <ServicesSection />
      <SkillsSection />
      <ContactSection />
    </div>
  );
}
