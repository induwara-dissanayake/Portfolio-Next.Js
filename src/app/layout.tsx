import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import CursorTrail from "@/components/ui/CursorTrail";
import FluidBackground from "@/components/ui/FluidBackground";
import DevConsoleFilter from "@/components/DevConsoleFilter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Induwara - Full-Stack Developer & AI Creator",
  description: "Portfolio of Induwara - Full-Stack Developer, AI Creator & UI/UX Enthusiast",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-black text-white overflow-x-hidden`}>
        {/* Background Effects */}
        <FluidBackground />
        <CursorTrail />
  <DevConsoleFilter />

        {/* Main Content */}
        <div className="relative z-10">
          <Navbar />
          <main className="min-h-screen pt-20">{children}</main>
          <div className="mx-auto max-w-7xl px-6">
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
