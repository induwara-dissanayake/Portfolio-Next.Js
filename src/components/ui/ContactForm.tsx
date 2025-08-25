"use client";
import { motion } from 'framer-motion';
import { useState } from 'react';
import SocialLinks from './SocialLinks';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to send');
      setIsSuccess(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputVariants = {
    focus: { scale: 1.02, transition: { duration: 0.2 } },
    blur: { scale: 1, transition: { duration: 0.2 } },
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
          Let&apos;s Create Together
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Have a project in mind? Let&apos;s discuss how we can bring your ideas to life.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-8"
        >
          <div>
            <h3 className="text-2xl font-semibold mb-6 text-white">Get in Touch</h3>
            
            <div className="space-y-4">
              <motion.div
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-purple-500/10 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400">📧</span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">sahasrainduwara35@gmail.com</p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-purple-500/10 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400">🌍</span>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Location</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Connect</h4>
            <SocialLinks />
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <motion.input
                type="text"
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300"
                variants={inputVariants}
                whileFocus="focus"
                onBlur={() => {}}
                required
              />
            </div>

            <div className="relative">
              <motion.input
                type="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300"
                variants={inputVariants}
                whileFocus="focus"
                onBlur={() => {}}
                required
              />
            </div>

            <div className="relative">
              <motion.textarea
                placeholder="Your Message"
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all duration-300 resize-none"
                variants={inputVariants}
                whileFocus="focus"
                onBlur={() => {}}
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                <motion.div
                  className="flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  Sending...
                </motion.div>
              ) : isSuccess ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center justify-center gap-2"
                >
                  ✓ Message Sent!
                </motion.span>
              ) : (
                'Send Message'
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
