import { prisma } from '@/lib/prisma';
import { BlogCard } from '@/components/BlogCard';

export default async function BlogPage() {
  const posts = await prisma.blog.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } });

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Blog</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {posts.map((p) => (
          <BlogCard key={p.slug} slug={p.slug} title={p.title} excerpt={p.excerpt || ''} />
        ))}
      </div>
    </div>
  );
}
