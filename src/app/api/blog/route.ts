import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const posts = await prisma.blog.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, slug, excerpt, content, published } = await req.json();
    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const post = await prisma.blog.create({ 
      data: { 
        title, 
        slug, 
        excerpt: excerpt || null, 
        content, 
        published: !!published 
      } 
    });
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Database error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
