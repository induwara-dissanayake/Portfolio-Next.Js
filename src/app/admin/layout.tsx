export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Manage projects, blog, and contacts</p>
      </div>
      <nav className="flex gap-3 text-sm">
        <a href="/admin/projects" className="rounded border border-white/10 bg-white/5 px-3 py-1">Projects</a>
        <a href="/admin/blog" className="rounded border border-white/10 bg-white/5 px-3 py-1">Blog</a>
        <a href="/admin/contacts" className="rounded border border-white/10 bg-white/5 px-3 py-1">Contacts</a>
      </nav>
      <div>
        {children}
      </div>
    </div>
  );
}
