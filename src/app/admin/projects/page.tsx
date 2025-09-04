"use client";
import { useEffect, useState } from 'react';
import { AdminProjectForm } from '@/components/admin/AdminProjectForm';
import { AdminProjectList } from '@/components/admin/AdminProjectList';

type Project = {
  id: number;
  title: string;
  description: string;
  longDescription?: string | null;
  imageUrl?: string | null;
  projectUrl?: string | null;
  githubUrl?: string | null;
  technologies?: string | null;
  featured: boolean;
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchProjects();
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Projects Admin</h1>
        <div className="text-center py-8">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Projects Admin</h1>
      <AdminProjectForm onProjectAdded={handleProjectAdded} />
      <AdminProjectList projects={projects} refreshTrigger={refreshTrigger} />
    </div>
  );
}
