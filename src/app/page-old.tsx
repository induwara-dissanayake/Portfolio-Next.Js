import { HeroSection } from "@/components/HeroSection";
import { ProjectCard } from "@/components/ProjectCard";
import { prisma } from "@/lib/prisma";
import { Reveal } from "@/components/ui/Reveal";
import TiltCard from "@/components/ui/TiltCard";
import MagneticButton from "@/components/ui/MagneticButton";

export type Project = {
  id: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  projectUrl?: string | null;
  featured: boolean;
};

export default async function Home() {
  const featured = await prisma.project.findMany({
    where: { featured: true },
    take: 3,
  });
  return (
    <div className="relative space-y-20">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(40%_30%_at_20%_10%,rgba(244,63,94,0.25),transparent),radial-gradient(30%_30%_at_80%_20%,rgba(147,51,234,0.25),transparent),radial-gradient(40%_30%_at_50%_70%,rgba(99,102,241,0.25),transparent)]" />
      <HeroSection />

      <Reveal>
        <section className="rounded-2xl border border-white/10 bg-white/60 p-6 shadow-lg backdrop-blur dark:border-white/10 dark:bg-black/40 md:p-10">
          <h2 className="text-3xl font-bold tracking-tight">About</h2>
          <p className="mt-4 max-w-3xl text-lg text-gray-600 dark:text-gray-300">
            I build delightful, performant web apps with Next.js, TypeScript, and
            modern tooling. I care about DX, accessibility, and beautiful motion.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              "Next.js",
              "TypeScript",
              "React",
              "Tailwind CSS",
              "Node.js",
              "Prisma",
              "Framer Motion",
            ].map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm backdrop-blur dark:border-black/20 dark:bg-black/10"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      </Reveal>

      <section>
        <h2 className="text-3xl font-bold tracking-tight">Featured Projects</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {featured.map((p: Project, i: number) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <TiltCard className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/60 p-4 shadow-lg backdrop-blur transition-all hover:shadow-2xl dark:border-white/10 dark:bg-black/40">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-fuchsia-500/0 via-transparent to-indigo-500/0 opacity-0 transition-opacity group-hover:opacity-20" />
                <ProjectCard
                  title={p.title}
                  description={p.description}
                  imageUrl={p.imageUrl}
                  projectUrl={p.projectUrl}
                />
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-rose-500 to-indigo-500 p-8 text-white shadow-lg md:p-12">
          <h3 className="text-2xl font-semibold">Let’s build something amazing.</h3>
          <p className="mt-2 opacity-90">
            Have an idea or an opportunity? I’m open to collaborations and freelance
            work.
          </p>
          <MagneticButton className="mt-6">
            <a href="/contact">Get in touch</a>
          </MagneticButton>
        </section>
      </Reveal>
    </div>
  );
}
