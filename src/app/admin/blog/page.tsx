"use client";
import { useEffect, useState } from 'react';

type Blog = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Blog[]>([]);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', published: false });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', slug: '', excerpt: '', content: '', published: false });

  const refresh = async () => {
    const res = await fetch('/api/blog');
    const data = await res.json();
    setPosts(data);
  };

  useEffect(() => { refresh(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setForm({ title: '', slug: '', excerpt: '', content: '', published: false });
      await refresh();
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Blog Admin</h1>

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded bg-white/10 p-2" placeholder="Title" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required />
          <input className="rounded bg-white/10 p-2" placeholder="Slug" value={form.slug} onChange={(e)=>setForm({...form,slug:e.target.value})} required />
        </div>
        <input className="w-full rounded bg-white/10 p-2" placeholder="Excerpt" value={form.excerpt} onChange={(e)=>setForm({...form,excerpt:e.target.value})} />
        <textarea className="w-full rounded bg-white/10 p-2" rows={8} placeholder="Content (Markdown/MDX)" value={form.content} onChange={(e)=>setForm({...form,content:e.target.value})} required />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e)=>setForm({...form,published:e.target.checked})} /> Published</label>
        <button disabled={loading} className="rounded bg-purple-600 px-4 py-2 font-semibold">{loading?'Saving...':'Save Post'}</button>
      </form>

      <div className="grid gap-4">
        {posts.map((p)=> (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.title}</p>
                <p className="truncate text-sm text-gray-400">/{p.slug} • {p.published? 'Published':'Draft'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded bg-white/10 px-2 py-1 text-sm" onClick={()=>{ setEditingId(p.id); setEditForm({ title:p.title, slug:p.slug, excerpt:p.excerpt||'', content:p.content, published:p.published }); }}>Edit</button>
                <button className="rounded bg-red-600/80 px-2 py-1 text-sm" onClick={async()=>{ await fetch(`/api/blog/${p.id}`, { method:'DELETE' }); await refresh(); }}>Delete</button>
              </div>
            </div>
            <p className="mt-2 text-gray-300">{p.excerpt}</p>
          </div>
        ))}
      </div>

      {editingId !== null && (
        <form onSubmit={async (e)=>{e.preventDefault(); await fetch(`/api/blog/${editingId}`,{ method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(editForm)}); setEditingId(null); await refresh(); }} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold">Edit Post #{editingId}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="rounded bg-white/10 p-2" placeholder="Title" value={editForm.title} onChange={(e)=>setEditForm({...editForm,title:e.target.value})} required />
            <input className="rounded bg-white/10 p-2" placeholder="Slug" value={editForm.slug} onChange={(e)=>setEditForm({...editForm,slug:e.target.value})} required />
          </div>
          <input className="w-full rounded bg-white/10 p-2" placeholder="Excerpt" value={editForm.excerpt} onChange={(e)=>setEditForm({...editForm,excerpt:e.target.value})} />
          <textarea className="w-full rounded bg-white/10 p-2" rows={8} placeholder="Content (Markdown/MDX)" value={editForm.content} onChange={(e)=>setEditForm({...editForm,content:e.target.value})} required />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editForm.published} onChange={(e)=>setEditForm({...editForm,published:e.target.checked})} /> Published</label>
          <div className="flex gap-2">
            <button className="rounded bg-purple-600 px-4 py-2 font-semibold">Save Changes</button>
            <button type="button" className="rounded bg-white/10 px-4 py-2" onClick={()=>setEditingId(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
