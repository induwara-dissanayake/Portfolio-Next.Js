"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from "lucide-react";

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", message: "" });
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  return (
    <section className="section relative" id="contact">
      <div className="max-w-[1120px] mx-auto px-6">
        <h2 className="section__title">
          Contact <span>Me</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12">
          {/* Left Column: Contact Cards with Lucide React Icons */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* Email Card */}
            <div className="bianca-card flex items-start gap-5 hover:border-[hsl(var(--hue),75%,60%)] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),75%,60%)] flex items-center justify-center border border-[hsl(var(--hue),8%,20%)] flex-shrink-0">
                <Mail className="w-6 h-6 text-[hsl(var(--hue),75%,60%)]" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-lg font-bold font-syne text-[hsl(var(--hue),24%,98%)]">
                  Email
                </h3>
                <a
                  href="mailto:sahasrainduwara35@gmail.com"
                  className="text-sm text-[hsl(var(--hue),4%,70%)] hover:text-[hsl(var(--hue),75%,60%)] transition-colors mt-1 block truncate"
                >
                  sahasrainduwara35@gmail.com
                </a>
              </div>
            </div>

            {/* Phone Card */}
            <div className="bianca-card flex items-start gap-5 hover:border-[hsl(var(--hue),75%,60%)] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),75%,60%)] flex items-center justify-center border border-[hsl(var(--hue),8%,20%)] flex-shrink-0">
                <Phone className="w-6 h-6 text-[hsl(var(--hue),75%,60%)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-syne text-[hsl(var(--hue),24%,98%)]">
                  Phone number
                </h3>
                <a
                  href="tel:+94755050637"
                  className="text-sm text-[hsl(var(--hue),4%,70%)] hover:text-[hsl(var(--hue),75%,60%)] transition-colors mt-1 block"
                >
                  +94 75 505 0637
                </a>
              </div>
            </div>

            {/* Location Card */}
            <div className="bianca-card flex items-start gap-5 hover:border-[hsl(var(--hue),75%,60%)] transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[hsl(var(--hue),12%,8%)] text-[hsl(var(--hue),75%,60%)] flex items-center justify-center border border-[hsl(var(--hue),8%,20%)] flex-shrink-0">
                <MapPin className="w-6 h-6 text-[hsl(var(--hue),75%,60%)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-syne text-[hsl(var(--hue),24%,98%)]">
                  Location
                </h3>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[hsl(var(--hue),4%,70%)] hover:text-[hsl(var(--hue),75%,60%)] transition-colors mt-1 block"
                >
                  Gampaha, Sri Lanka
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bianca-card">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-[hsl(var(--hue),24%,98%)] mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your name"
                  className="w-full px-5 py-4 rounded-xl bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] placeholder-[hsl(var(--hue),4%,40%)] focus:outline-none focus:border-[hsl(var(--hue),75%,60%)] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[hsl(var(--hue),24%,98%)] mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  className="w-full px-5 py-4 rounded-xl bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] placeholder-[hsl(var(--hue),4%,40%)] focus:outline-none focus:border-[hsl(var(--hue),75%,60%)] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-[hsl(var(--hue),24%,98%)] mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Write your message..."
                  className="w-full px-5 py-4 rounded-xl bg-[hsl(var(--hue),12%,8%)] border border-[hsl(var(--hue),8%,20%)] text-[hsl(var(--hue),24%,98%)] placeholder-[hsl(var(--hue),4%,40%)] focus:outline-none focus:border-[hsl(var(--hue),75%,60%)] transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-bianca w-full text-center py-4 rounded-xl font-semibold justify-center text-base flex items-center gap-2"
              >
                {status === "loading" ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    Send Message <Send className="w-5 h-5" />
                  </>
                )}
              </button>

              {status === "success" && (
                <p className="text-sm text-emerald-400 font-medium text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Message sent successfully!
                </p>
              )}

              {status === "error" && (
                <p className="text-sm text-rose-400 font-medium text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Message not sent (service error)
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
