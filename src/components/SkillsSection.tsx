import Image from "next/image";

export function SkillsSection() {
  const skillCategories = [
    {
      title: "Frontend",
      skills: [
        { name: "HTML", icon: "/assets/img/skills-frontend-1.svg" },
        { name: "CSS", icon: "/assets/img/skills-frontend-2.svg" },
        { name: "JavaScript", icon: "/assets/img/skills-frontend-3.svg" },
        { name: "React", icon: "/assets/img/skills-frontend-4.svg" },
        { name: "Sass", icon: "/assets/img/skills-frontend-5.svg" },
        { name: "Git", icon: "/assets/img/skills-frontend-6.svg" },
        { name: "GitHub", icon: "/assets/img/skills-frontend-7.svg" },
        { name: "Tailwind", icon: "/assets/img/skills-frontend-8.svg" },
      ],
    },
    {
      title: "Backend",
      skills: [
        { name: "Node.js", icon: "/assets/img/skills-backend-1.svg" },
        { name: "Laravel", icon: "/assets/img/skills-backend-2.svg" },
        { name: "PostgreSQL", icon: "/assets/img/skills-backend-3.svg" },
        { name: "Supabase", icon: "/assets/img/skills-backend-4.svg" },
        { name: "Socket.io", icon: "/assets/img/skills-backend-5.svg" },
      ],
    },
    {
      title: "Design",
      skills: [
        { name: "Figma", icon: "/assets/img/skills-design-1.svg" },
        { name: "Blender", icon: "/assets/img/skills-design-2.svg" },
        { name: "After Effects", icon: "/assets/img/skills-design-3.svg" },
        { name: "Photoshop", icon: "/assets/img/skills-design-4.svg" },
        { name: "Illustrator", icon: "/assets/img/skills-design-5.svg" },
        { name: "Framer", icon: "/assets/img/skills-design-6.svg" },
      ],
    },
  ];

  return (
    <section className="section relative" id="skills">
      <div className="max-w-[1120px] mx-auto px-6">
        <h2 className="section__title">
          My <span>Skills</span>
        </h2>

        <p className="text-center text-sm md:text-base text-[hsl(var(--hue),4%,70%)] max-w-xl mx-auto -mt-4 mb-14 leading-relaxed">
          My skills are those I&apos;ve learned and developed over the years by studying, focusing, and being consistent in what I love most.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {skillCategories.map((category) => (
            <div key={category.title} className="bianca-card">
              <h3 className="text-xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] mb-6 pb-3 border-b border-[hsl(var(--hue),8%,20%)] flex items-center justify-between">
                <span>{category.title}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),75%,60%)] border border-[hsl(var(--hue),8%,20%)]">
                  {category.skills.length} skills
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {category.skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)] hover:border-[hsl(var(--hue),75%,60%)] transition-colors group"
                  >
                    <div className="w-8 h-8 relative flex-shrink-0">
                      <Image
                        src={skill.icon}
                        alt={skill.name}
                        fill
                        className="object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="text-sm font-medium text-[hsl(var(--hue),24%,98%)] truncate">
                      {skill.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
