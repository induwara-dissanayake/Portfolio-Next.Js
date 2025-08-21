import { prisma } from '@/lib/prisma';
import { BlogCard } from '@/components/BlogCard';

export const dynamic = 'force-dynamic';

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  
  try {
    posts = await prisma.blog.findMany({ 
      where: { published: true }, 
      orderBy: { createdAt: 'desc' } 
    });
  } catch (error) {
    console.error('Database error:', error);
    posts = [];
  }

  return (
    <div className="min-h-screen py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Thoughts, tutorials, and insights about web development, technology, and design.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <BlogCard key={p.slug} slug={p.slug} title={p.title} excerpt={p.excerpt || ''} />
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-semibold mb-4 text-white">
              Blog Posts Coming Soon
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              I&apos;m working on some interesting articles. 
              Check back soon for the latest posts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
