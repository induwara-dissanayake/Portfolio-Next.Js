import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json();
  const { title, slug, excerpt, content, published } = body;
  try {
    const updated = await prisma.blog.update({ where: { id: Number(id) }, data: { title, slug, excerpt, content, published } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.blog.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 400 });
  }
}
