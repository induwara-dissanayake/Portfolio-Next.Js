import { prisma } from '@/lib/prisma';
import MDXRenderer from '@/components/MDXRenderer';

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.blog.findUnique({ where: { slug } });
  if (!post || !post.published) return <div>Not found</div>;
  return (
    <article>
      <h1 className="mb-6 text-3xl font-bold">{post.title}</h1>
      <MDXRenderer source={post.content} />
    </article>
  );
}
