import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminContactsPage() {
  const contacts = await prisma.contactSubmission.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contact Messages</h1>
      <div className="grid gap-4">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{c.name} — {c.email}</p>
                <p className="text-sm text-gray-400">{new Date(c.createdAt).toLocaleString()}</p>
              </div>
              <span className="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-300">#{c.id}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-gray-200">{c.message}</p>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-gray-400">No messages yet.</p>}
      </div>
    </div>
  );
}
