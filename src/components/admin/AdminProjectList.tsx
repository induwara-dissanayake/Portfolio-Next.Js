"use client";
import { useState } from 'react';

type Project = {
  id: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  projectUrl?: string | null;
  featured: boolean;
};

export function AdminProjectList({ projects }: { projects: Project[] }) {
  const [items, setItems] = useState<Project[]>(projects);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Project>>({});

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
    const res = await fetch(`/api/projects/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl ?? null,
        projectUrl: form.projectUrl ?? null,
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
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Existing Projects</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((p) => (
          <div key={p.id} className="rounded border p-3">
            {editingId === p.id ? (
              <div className="space-y-2">
                <input
                  className="w-full rounded border p-2"
                  value={form.title || ''}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                <textarea
                  className="w-full rounded border p-2"
                  value={form.description || ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                <input
                  className="w-full rounded border p-2"
                  placeholder="Image URL"
                  value={form.imageUrl || ''}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                />
                <input
                  className="w-full rounded border p-2"
                  placeholder="Project URL"
                  value={form.projectUrl || ''}
                  onChange={(e) => setForm((f) => ({ ...f, projectUrl: e.target.value }))}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form.featured)}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  />
                  Featured
                </label>
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="rounded border px-2 py-1 text-sm">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded border px-2 py-1 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{p.description}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => startEdit(p)} className="rounded border px-2 py-1 text-sm">
                    Edit
                  </button>
                  <button onClick={() => remove(p.id)} className="rounded border px-2 py-1 text-sm text-red-600">
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
