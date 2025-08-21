import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to validate URLs
function isValidUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    const data = await req.json();
    
    // Validate and sanitize URLs
    const imageUrl = isValidUrl(data.imageUrl) ? data.imageUrl : null;
    const projectUrl = isValidUrl(data.projectUrl) ? data.projectUrl : null;
    
    const updated = await prisma.project.update({ 
      where: { id }, 
      data: {
        ...data,
        imageUrl,
        projectUrl,
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await ctx.params;
    const id = Number(idStr);
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
