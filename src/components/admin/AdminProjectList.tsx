"use client";
import { useState, useEffect } from 'react';

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

type Props = {
  projects: Project[];
  refreshTrigger?: number;
};

export function AdminProjectList({ projects: initialProjects, refreshTrigger }: Props) {
  const [items, setItems] = useState<Project[]>(initialProjects);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Project>>({});

  // Refresh projects when refreshTrigger changes
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setItems(data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };

    if (refreshTrigger !== undefined) {
      fetchProjects();
    }
  }, [refreshTrigger]);

  // Update items when initialProjects changes
  useEffect(() => {
    setItems(initialProjects);
  }, [initialProjects]);

  async function remove(id: number) {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) setItems((s) => s.filter((p) => p.id !== id));
  }

  function startEdit(p: Project) {
    setEditingId(p.id);
    setForm(p);
  }

  async function saveEdit() {
    if (!editingId) return;
    
    // Validate URLs before saving
    const isValidUrl = (url: string | null | undefined): boolean => {
      if (!url || url.trim() === '') return false;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };
    
    const imageUrl = isValidUrl(form.imageUrl) ? form.imageUrl : null;
    const projectUrl = isValidUrl(form.projectUrl) ? form.projectUrl : null;
    const githubUrl = isValidUrl(form.githubUrl) ? form.githubUrl : null;
    
    const res = await fetch(`/api/projects/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        longDescription: form.longDescription || null,
        imageUrl,
        projectUrl,
        githubUrl,
        technologies: form.technologies || null,
        featured: Boolean(form.featured),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((arr) => arr.map((it) => (it.id === updated.id ? updated : it)));
      setEditingId(null);
      setForm({});
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-white">Existing Projects</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <div key={p.id} className="rounded-lg border border-white/20 bg-white/5 backdrop-blur-xl p-4">
            {editingId === p.id ? (
              <div className="space-y-2">
                <input
                  className="w-full rounded border p-2 text-gray-900"
                  placeholder="Project Title"
                  value={form.title || ''}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                <textarea
                  className="w-full rounded border p-2 text-gray-900"
                  placeholder="Short Description"
                  rows={3}
                  value={form.description || ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <textarea
                  className="w-full rounded border p-2 text-gray-900"
                  placeholder="Detailed Description (optional)"
                  rows={4}
                  value={form.longDescription || ''}
                  onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))}
                />
                <input
                  className="w-full rounded border p-2 text-gray-900"
                  placeholder="Image URL (optional)"
                  value={form.imageUrl || ''}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                />
                <input
                  className="w-full rounded border p-2 text-gray-900"
                  placeholder="Live Demo URL (optional)"
                  value={form.projectUrl || ''}
                  onChange={(e) => setForm((f) => ({ ...f, projectUrl: e.target.value }))}
                />
                <input
                  className="w-full rounded border p-2 text-gray-900"
                  placeholder="GitHub Repository URL (optional)"
                  value={form.githubUrl || ''}
                  onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
                />
                <input
                  className="w-full rounded border p-2 text-gray-900"
                  placeholder="Technologies (comma-separated)"
                  value={form.technologies || ''}
                  onChange={(e) => setForm((f) => ({ ...f, technologies: e.target.value }))}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.featured)}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  />
                  Featured Project
                </label>
                <div className="flex gap-2">
                  <button 
                    onClick={saveEdit} 
                    className="rounded bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm transition-colors"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => setEditingId(null)} 
                    className="rounded bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="font-medium text-lg mb-2">{p.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{p.description}</div>
                {p.longDescription && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                    {p.longDescription}
                  </div>
                )}
                {p.technologies && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    Technologies: {p.technologies}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mb-2">
                  {p.featured && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                  {p.projectUrl && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      Live Demo
                    </span>
                  )}
                  {p.githubUrl && (
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      GitHub
                    </span>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={() => startEdit(p)} 
                    className="rounded bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => remove(p.id)} 
                    className="rounded bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
