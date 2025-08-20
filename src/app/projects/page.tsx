import { ProjectCard3D } from '@/components/ProjectCard3D';
import { headers } from 'next/headers';
import { Reveal } from '@/components/ui/Reveal';

type Project = {
  id: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  projectUrl?: string | null;
};

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const host = (await headers()).get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const res = await fetch(`${protocol}://${host}/api/projects`, { cache: 'no-store' });
  const projects: Project[] = await res.json();
  
  return (
    <div className="min-h-screen py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal>
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
              My Projects
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              A collection of projects that showcase my skills in web development, 
              design, and problem-solving. Each project represents a unique challenge 
              and learning experience.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project: Project, index: number) => (
            <ProjectCard3D
              key={project.id}
              title={project.title}
              description={project.description}
              imageUrl={project.imageUrl}
              projectUrl={project.projectUrl}
              index={index}
            />
          ))}
        </div>

        {projects.length === 0 && (
          <Reveal>
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🚀</div>
              <h2 className="text-2xl font-semibold mb-4 text-white">
                Projects Coming Soon
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                I&apos;m currently working on some exciting projects. 
                Check back soon to see what I&apos;ve been building!
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
