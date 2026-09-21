import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative bg-[hsl(var(--hue),12%,4%)] border-t border-[hsl(var(--hue),8%,20%)] pt-16 pb-12 overflow-hidden">
      <div className="max-w-[1120px] mx-auto px-6">
        {/* Call To Action Title */}
        <div className="mb-12 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-syne text-[hsl(var(--hue),24%,98%)] leading-tight">
            COLLABORATE WITH INDUWARA AND START YOUR JOURNEY IN CREATIVE DESIGN TODAY.
          </h2>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-12 border-b border-[hsl(var(--hue),8%,20%)]">
          {/* Quick Links */}
          <ul className="flex flex-wrap items-center gap-8">
            <li>
              <a
                href="#work"
                className="text-sm font-semibold text-[hsl(var(--hue),24%,98%)] hover:text-[hsl(var(--hue),75%,60%)] transition-colors"
              >
                Work
              </a>
            </li>
            <li>
              <a
                href="#service"
                className="text-sm font-semibold text-[hsl(var(--hue),24%,98%)] hover:text-[hsl(var(--hue),75%,60%)] transition-colors"
              >
                Services
              </a>
            </li>
            <li>
              <a
                href="#skills"
                className="text-sm font-semibold text-[hsl(var(--hue),24%,98%)] hover:text-[hsl(var(--hue),75%,60%)] transition-colors"
              >
                Skills
              </a>
            </li>
          </ul>

          {/* Social Icons */}
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] flex items-center justify-center hover:bg-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),12%,8%)] hover:border-[hsl(var(--hue),75%,60%)] transition-colors"
              aria-label="GitHub"
            >
              <i className="ri-github-fill text-lg" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] flex items-center justify-center hover:bg-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),12%,8%)] hover:border-[hsl(var(--hue),75%,60%)] transition-colors"
              aria-label="LinkedIn"
            >
              <i className="ri-linkedin-fill text-lg" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] flex items-center justify-center hover:bg-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),12%,8%)] hover:border-[hsl(var(--hue),75%,60%)] transition-colors"
              aria-label="Instagram"
            >
              <i className="ri-instagram-line text-lg" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] flex items-center justify-center hover:bg-[hsl(var(--hue),75%,60%)] hover:text-[hsl(var(--hue),12%,8%)] hover:border-[hsl(var(--hue),75%,60%)] transition-colors"
              aria-label="Facebook"
            >
              <i className="ri-facebook-fill text-lg" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[hsl(var(--hue),4%,70%)] gap-4">
          <p>&#169; All Rights Reserved By Induwara</p>
          <Link
            href="/admin/login"
            className="hover:text-[hsl(var(--hue),75%,60%)] transition-colors select-none"
          >
            Admin Panel
          </Link>
        </div>
      </div>
    </footer>
  );
}
