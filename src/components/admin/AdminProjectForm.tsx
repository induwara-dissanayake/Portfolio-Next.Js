"use client";
import { useState } from 'react';

type Props = {
  onProjectAdded?: () => void;
};

export function AdminProjectForm({ onProjectAdded }: Props) {
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setLoading(true);
    
    // Validate URLs
    const imageUrl = data.imageUrl as string;
    const projectUrl = data.projectUrl as string;
    
    // Only include URLs if they are valid
    const isValidUrl = (url: string) => {
      if (!url) return false;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };
    
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        longDescription: data.longDescription || null,
        imageUrl: isValidUrl(imageUrl) ? imageUrl : null,
        projectUrl: isValidUrl(projectUrl) ? projectUrl : null,
        githubUrl: isValidUrl(data.githubUrl as string) ? data.githubUrl : null,
        technologies: data.technologies || null,
        featured: Boolean(data.featured),
      }),
    });
    setLoading(false);
    if (res.ok) {
      form.reset();
      if (onProjectAdded) {
        onProjectAdded();
      } else {
        location.reload();
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-semibold mb-4">Add Project</h2>
      
      <div className="grid md:grid-cols-2 gap-4">
        <input 
          className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-gray-400" 
          name="title" 
          placeholder="Project Title" 
          required 
        />
        <input 
          className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-gray-400" 
          name="imageUrl" 
          placeholder="Image URL (optional)" 
        />
      </div>

      <textarea 
        className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-gray-400" 
        name="description" 
        placeholder="Short Description" 
        rows={3}
        required 
      />

      <textarea 
        className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-gray-400" 
        name="longDescription" 
        placeholder="Detailed Description (optional)" 
        rows={4}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <input 
          className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-gray-400" 
          name="projectUrl" 
          placeholder="Live Demo URL (optional)" 
        />
        <input 
          className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-gray-400" 
          name="githubUrl" 
          placeholder="GitHub Repository URL (optional)" 
        />
      </div>

      <input 
        className="w-full rounded-lg border border-white/20 bg-white/10 p-3 text-white placeholder-gray-400" 
        name="technologies" 
        placeholder="Technologies (comma-separated)" 
      />

      <label className="flex items-center gap-3 text-white">
        <input type="checkbox" name="featured" className="w-4 h-4 rounded border-white/20" /> 
        <span className="font-medium">Featured Project</span>
      </label>
      
      <button 
        className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 font-semibold transition-all duration-300 disabled:opacity-50" 
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Project'}
      </button>
    </form>
  );
}
