import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const posts = await prisma.blog.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  try {
    const { title, slug, excerpt, content, published } = await req.json();
    if (!title || !slug || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const post = await prisma.blog.create({ data: { title, slug, excerpt, content, published: !!published } });
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
