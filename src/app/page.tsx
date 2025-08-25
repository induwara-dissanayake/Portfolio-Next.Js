import { HeroSection } from "@/components/HeroSection";
import { ProjectCard3D } from "@/components/ProjectCard3D";
import { Reveal } from "@/components/ui/Reveal";
import ParticleBackground from "@/components/ui/ParticleBackground";
import { headers } from 'next/headers';

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

export const dynamic = 'force-dynamic';

export default async function Home() {
  let featured: Project[] = [];
  
  try {
    const host = (await headers()).get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const res = await fetch(`${protocol}://${host}/api/projects`, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (res.ok) {
      const allProjects: Project[] = await res.json();
      // Filter for featured projects and take only 3
      featured = allProjects.filter(p => p.featured).slice(0, 3);
    }
  } catch (error) {
    console.error('Error fetching featured projects:', error);
  }

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
                I&apos;m a passionate Full‑Stack Developer and AI Creator with a keen eye for design and a love for creating
                exceptional digital experiences. I build modern web apps and intelligent features powered by machine learning,
                always pushing performance, accessibility, and visual polish.
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
            <div className="space-y-12">
              {/* Frontend Technologies */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-center text-white">Frontend</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["React", "Next.js", "Tailwind CSS", "Bootstrap"].map((skill) => (
                    <div
                      key={skill}
                      className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 backdrop-blur-xl text-center hover:bg-blue-500/20 transition-all duration-300 group"
                    >
                      <span className="text-blue-300 group-hover:text-white transition-colors font-medium">
                        {skill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Backend Technologies */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-center text-white">Backend</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {["Node.js", "Express.js", "Python"].map((skill) => (
                    <div
                      key={skill}
                      className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 backdrop-blur-xl text-center hover:bg-green-500/20 transition-all duration-300 group"
                    >
                      <span className="text-green-300 group-hover:text-white transition-colors font-medium">
                        {skill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Database Technologies */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-center text-white">Database</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["MySQL", "PostgreSQL", "MongoDB", "Prisma"].map((skill) => (
                    <div
                      key={skill}
                      className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 backdrop-blur-xl text-center hover:bg-orange-500/20 transition-all duration-300 group"
                    >
                      <span className="text-orange-300 group-hover:text-white transition-colors font-medium">
                        {skill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools & Deployment */}
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-center text-white">Tools & Deployment</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["Figma", "Vercel", "AWS", "Firebase"].map((skill) => (
                    <div
                      key={skill}
                      className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-xl text-center hover:bg-purple-500/20 transition-all duration-300 group"
                    >
                      <span className="text-purple-300 group-hover:text-white transition-colors font-medium">
                        {skill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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

          {featured.length === 0 && (
            <Reveal>
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-2xl font-semibold mb-4 text-white">
                  Featured Projects Coming Soon
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  I&apos;m currently working on some exciting featured projects. 
                  Check back soon to see what I&apos;ve been building!
                </p>
              </div>
            </Reveal>
          )}
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
