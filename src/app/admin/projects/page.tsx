import { prisma } from '@/lib/prisma';
import { AdminProjectForm } from '@/components/admin/AdminProjectForm';
import { AdminProjectList } from '@/components/admin/AdminProjectList';

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Projects Admin</h1>
      <AdminProjectForm />
      <AdminProjectList projects={projects} />
    </div>
  );
}
