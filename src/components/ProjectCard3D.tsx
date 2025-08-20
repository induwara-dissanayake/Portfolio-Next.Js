"use client";
import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

type Props = {
  title: string;
  description: string;
  imageUrl?: string | null;
  projectUrl?: string | null;
  index?: number;
};

export function ProjectCard3D({ title, description, imageUrl, projectUrl, index = 0 }: Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-75 transition duration-1000 blur"
        animate={{ opacity: isHovered ? 0.75 : 0 }}
      />
      
      <motion.div
        className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden"
        whileHover={{ 
          y: -10,
          rotateX: 5,
          rotateY: 5,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Image with parallax effect */}
        {imageUrl && (
          <div className="relative h-48 overflow-hidden">
            <motion.img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700"
              whileHover={{ scale: 1.1 }}
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Floating elements */}
            <motion.div
              className="absolute top-4 right-4 w-3 h-3 bg-purple-400 rounded-full"
              animate={{
                y: isHovered ? [-5, 5, -5] : 0,
                opacity: [0.6, 1, 0.6],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        )}

        <div className="p-6">
          {/* Title with gradient */}
          <motion.h3
            className="text-xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
            whileHover={{ scale: 1.02 }}
          >
            {title}
          </motion.h3>

          {/* Description */}
          <p className="text-gray-400 mb-4 leading-relaxed">
            {description}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            {projectUrl && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={projectUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
                >
                  View Project
                  <motion.span
                    animate={{ x: isHovered ? 3 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    →
                  </motion.span>
                </Link>
              </motion.div>
            )}
            
            <motion.button
              className="px-4 py-2 border border-purple-500/30 hover:border-purple-500 text-purple-300 rounded-full text-sm hover:bg-purple-500/10 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Details
            </motion.button>
          </div>
        </div>

        {/* Interactive particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100"
              style={{
                left: `${20 + i * 30}%`,
                top: `${10 + i * 20}%`,
              }}
              animate={{
                scale: isHovered ? [0, 1, 0] : 0,
                rotate: isHovered ? 360 : 0,
              }}
              transition={{
                duration: 2,
                delay: i * 0.2,
                repeat: isHovered ? Infinity : 0,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
