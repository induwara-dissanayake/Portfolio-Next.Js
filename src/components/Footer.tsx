import { Github, Linkedin, Facebook } from "lucide-react";

export function Footer() {
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/induwara-dissanayake";
  const linkedinUrl = process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://www.linkedin.com/in/induwara-dissanayake-383388321/";
  const facebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://web.facebook.com/isuru.isuru.1069020/";

  return (
    <footer className="relative bg-[hsl(var(--hue),12%,4%)] border-t border-[hsl(var(--hue),8%,20%)] py-8 overflow-hidden">
      <div className="max-w-[1120px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Social Icons: GitHub, LinkedIn, Facebook (Instagram removed) */}
        <div className="flex items-center space-x-4">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] flex items-center justify-center hover:bg-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),12%,8%)] hover:border-[hsl(var(--hue),75%,60%)] transition-all transform hover:-translate-y-1"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] flex items-center justify-center hover:bg-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),12%,8%)] hover:border-[hsl(var(--hue),75%,60%)] transition-all transform hover:-translate-y-1"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-5 h-5" />
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] flex items-center justify-center hover:bg-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),12%,8%)] hover:border-[hsl(var(--hue),75%,60%)] transition-all transform hover:-translate-y-1"
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5" />
          </a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-[hsl(var(--hue),4%,70%)] flex items-center gap-4">
          <p>&#169; {new Date().getFullYear()} All Rights Reserved By Induwara</p>
        </div>
      </div>
    </footer>
  );
}
