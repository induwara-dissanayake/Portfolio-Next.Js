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

export async function GET() {
  try {
    const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate and sanitize URLs
    const imageUrl = isValidUrl(body.imageUrl) ? body.imageUrl : null;
    const projectUrl = isValidUrl(body.projectUrl) ? body.projectUrl : null;
    
    const project = await prisma.project.create({ 
      data: {
        ...body,
        imageUrl,
        projectUrl,
      }
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
