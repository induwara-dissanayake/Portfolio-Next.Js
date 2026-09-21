import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import CursorTrail from "@/components/ui/CursorTrail";
import DevConsoleFilter from "@/components/DevConsoleFilter";

export const metadata: Metadata = {
  title: "Induwara - Portfolio | Web Developer & Creative Designer",
  description:
    "Portfolio of Induwara - Experienced Full-Stack Web Developer & Creative Designer. Explore projects, services, skills, and get in touch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[hsl(var(--hue),12%,4%)] text-[hsl(var(--hue),4%,70%)] overflow-x-hidden">
        <CursorTrail />
        <DevConsoleFilter />

        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
