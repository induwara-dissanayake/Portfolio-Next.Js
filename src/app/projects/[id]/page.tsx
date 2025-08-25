"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Github, Calendar, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type Project = {
  id: number;
  title: string;
  description: string;
  longDescription?: string | null;
  imageUrl?: string | null;
  projectUrl?: string | null;
  githubUrl?: string | null;
  videoUrl?: string | null;
  technologies?: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProjectDetailPage({ params }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Resolve params first
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setProjectId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!projectId) return;
    
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Project not found');
          } else {
            setError('Failed to load project');
          }
          return;
        }
        const data = await res.json();
        setProject(data);
      } catch (err) {
        setError('Failed to load project');
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-4">{error || 'Project Not Found'}</h1>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const techList = project.technologies ? project.technologies.split(',').map(t => t.trim()).filter(Boolean) : [];
  const isValidUrl = (url: string | null | undefined): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validImageUrl = isValidUrl(project.imageUrl) ? project.imageUrl : null;
  const validProjectUrl = isValidUrl(project.projectUrl) ? project.projectUrl : null;
  const validGithubUrl = isValidUrl(project.githubUrl) ? project.githubUrl : null;

  return (
    <div className="min-h-screen py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left column - Media */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Project Image */}
            {validImageUrl && (
              <div className="relative rounded-2xl overflow-hidden mb-6 group">
                {imageError ? (
                  <div className="w-full h-80 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🖼️</div>
                      <span>Image unavailable</span>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={validImageUrl}
                    alt={project.title}
                    width={600}
                    height={320}
                    className="w-full h-80 object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => setImageError(true)}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </motion.div>

          {/* Right column - Details */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Title and Date */}
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
                {project.title}
              </h1>
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
                {project.featured && (
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                    Featured
                  </span>
                )}
              </div>
            </div>

            {/* Technologies */}
            {techList.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6"
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                  <Tag className="w-5 h-5" />
                  Technologies Used
                </h3>
                <div className="flex flex-wrap gap-2">
                  {techList.map((tech, index) => (
                    <motion.span
                      key={tech}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-200 rounded-full text-sm"
                    >
                      {tech}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-8"
            >
              <h3 className="text-lg font-semibold mb-3 text-white">About This Project</h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 leading-relaxed mb-4">
                  {project.description}
                </p>
                {project.longDescription && (
                  <p className="text-gray-300 leading-relaxed">
                    {project.longDescription}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-wrap gap-4"
            >
              {validProjectUrl && (
                <a
                  href={validProjectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Live Project
                </a>
              )}
              
              {validGithubUrl && (
                <a
                  href={validGithubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-500/50 hover:border-gray-400 text-gray-300 hover:text-white rounded-full font-medium hover:bg-gray-500/10 transition-all duration-300 transform hover:scale-105"
                >
                  <Github className="w-4 h-4" />
                  View Source Code
                </a>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
