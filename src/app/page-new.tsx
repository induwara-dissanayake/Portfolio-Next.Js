import { HeroSection } from "@/components/HeroSection";
import { ProjectCard3D } from "@/components/ProjectCard3D";
import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/ui/Reveal";
import ParticleBackground from "@/components/ui/ParticleBackground";

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

export default async function Home() {
  const featured = await prisma.project.findMany({
    where: { featured: true },
    take: 3,
  });

  return (
    <div className="relative">
      {/* 3D Particle Background */}
      <ParticleBackground />
      
      {/* Hero Section */}
      <HeroSection />

      {/* About Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
                About Me
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                I&apos;m a passionate full-stack developer with a keen eye for design and a love for creating
                exceptional digital experiences. I specialize in modern web technologies and believe in
                the power of clean code and stunning visuals.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: "🚀",
                  title: "Performance",
                  description: "Lightning-fast applications optimized for the best user experience"
                },
                {
                  icon: "🎨",
                  title: "Design",
                  description: "Beautiful, intuitive interfaces that users love to interact with"
                },
                {
                  icon: "⚡",
                  title: "Innovation",
                  description: "Cutting-edge solutions using the latest technologies and best practices"
                }
              ].map((item) => (
                <div key={item.title} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-semibold mb-3 text-white">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Skills Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
                Technologies
              </h2>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[
                "Next.js", "React", "TypeScript", "Node.js", "Prisma", "Tailwind CSS",
                "Framer Motion", "Three.js", "MongoDB", "PostgreSQL", "AWS", "Vercel"
              ].map((skill) => (
                <div
                  key={skill}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl text-center hover:bg-purple-500/10 transition-all duration-300 group"
                >
                  <span className="text-gray-300 group-hover:text-white transition-colors">
                    {skill}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
                Featured Projects
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Here are some of my recent projects that showcase my skills and creativity.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featured.map((project: Project, index: number) => (
              <ProjectCard3D
                key={project.id}
                id={project.id}
                title={project.title}
                description={project.description}
                imageUrl={project.imageUrl}
                projectUrl={project.projectUrl}
                githubUrl={project.githubUrl}
                technologies={project.technologies}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="p-12 rounded-3xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-white/10 backdrop-blur-xl">
              <h3 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                Ready to Start Your Project?
              </h3>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Let&apos;s collaborate and create something extraordinary together. 
                I&apos;m always excited to work on new challenges and innovative projects.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
              >
                Let&apos;s Connect
                <span>→</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
