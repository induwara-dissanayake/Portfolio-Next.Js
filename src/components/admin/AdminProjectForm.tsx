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
        imageUrl: isValidUrl(imageUrl) ? imageUrl : null,
        projectUrl: isValidUrl(projectUrl) ? projectUrl : null,
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
    <form onSubmit={onSubmit} className="space-y-2 rounded border p-4">
      <h2 className="text-xl font-semibold">Add Project</h2>
      <input className="w-full rounded border p-2" name="title" placeholder="Title" required />
      <textarea className="w-full rounded border p-2" name="description" placeholder="Description" required />
      <input className="w-full rounded border p-2" name="imageUrl" placeholder="Image URL" />
      <input className="w-full rounded border p-2" name="projectUrl" placeholder="Project URL" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" /> Featured
      </label>
      <button className="rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2" disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
