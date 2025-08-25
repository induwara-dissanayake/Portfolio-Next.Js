"use client";
import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Github } from 'lucide-react';

type Props = {
  id: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  projectUrl?: string | null;
  githubUrl?: string | null;
  technologies?: string | null;
  index?: number;
};

export function ProjectCard3D({ 
  id, 
  title, 
  description, 
  imageUrl, 
  projectUrl, 
  githubUrl, 
  technologies, 
  index = 0 
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Check if URL is valid
  const isValidUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validImageUrl = isValidUrl(imageUrl) && !imageError ? imageUrl : null;
  const validProjectUrl = isValidUrl(projectUrl) ? projectUrl : null;
  const validGithubUrl = isValidUrl(githubUrl) ? githubUrl : null;

  // Parse technologies
  const techList = technologies ? technologies.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <motion.div
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Enhanced glow effect */}
      <motion.div
        className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-75 transition duration-1000 blur-sm"
        animate={{ 
          opacity: isHovered ? 0.75 : 0,
          scale: isHovered ? 1.02 : 1
        }}
      />
      
      <motion.div
        className="relative bg-black/50 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden"
        whileHover={{ 
          y: -12,
          rotateX: 5,
          rotateY: 5,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Image with parallax effect */}
        {validImageUrl ? (
          <div className="relative h-52 overflow-hidden">
            <motion.img
              src={validImageUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700"
              whileHover={{ scale: 1.1 }}
              onError={() => setImageError(true)}
            />
            {/* Enhanced overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Tech stack badges */}
            {techList.length > 0 && (
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                {techList.slice(0, 3).map((tech, i) => (
                  <motion.span
                    key={tech}
                    className="px-2 py-1 text-xs bg-purple-500/80 backdrop-blur-sm text-white rounded-full"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                  >
                    {tech}
                  </motion.span>
                ))}
                {techList.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-gray-500/80 backdrop-blur-sm text-white rounded-full">
                    +{techList.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* Floating particles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-0 group-hover:opacity-60"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${10 + (i % 2) * 20}%`,
                }}
                animate={{
                  y: isHovered ? [0, -10, 0] : 0,
                  opacity: isHovered ? [0.6, 1, 0.6] : 0,
                }}
                transition={{ 
                  duration: 2 + i * 0.5, 
                  repeat: isHovered ? Infinity : 0,
                  delay: i * 0.2 
                }}
              />
            ))}
          </div>
        ) : (
          <div className="h-52 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <div className="text-6xl opacity-30">🚀</div>
          </div>
        )}

        <div className="p-6">
          {/* Title with enhanced gradient */}
          <motion.h3
            className="text-xl font-bold mb-3 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
            whileHover={{ scale: 1.02 }}
          >
            {title}
          </motion.h3>

          {/* Description */}
          <p className="text-gray-300 mb-6 leading-relaxed line-clamp-3">
            {description}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href={`/projects/${id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
              >
                View Details
                <motion.span
                  animate={{ x: isHovered ? 3 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  →
                </motion.span>
              </Link>
            </motion.div>

            {validProjectUrl && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a
                  href={validProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 rounded-full text-sm hover:bg-cyan-500/10 transition-all duration-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Live Demo
                </a>
              </motion.div>
            )}
            
            {validGithubUrl && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a
                  href={validGithubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-500/50 hover:border-gray-400 text-gray-300 hover:text-gray-200 rounded-full text-sm hover:bg-gray-500/10 transition-all duration-300"
                >
                  <Github className="w-4 h-4" />
                  Code
                </a>
              </motion.div>
            )}
          </div>
        </div>

        {/* Enhanced interactive particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100"
              style={{
                left: `${10 + i * 25}%`,
                top: `${15 + (i % 2) * 30}%`,
              }}
              animate={{
                scale: isHovered ? [0, 1.5, 0] : 0,
                rotate: isHovered ? 360 : 0,
                opacity: isHovered ? [0, 0.8, 0] : 0,
              }}
              transition={{
                duration: 3,
                delay: i * 0.3,
                repeat: isHovered ? Infinity : 0,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
