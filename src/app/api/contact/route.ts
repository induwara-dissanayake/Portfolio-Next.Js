import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { name, email, message } = body || {};
		if (!name || !email || !message) {
			return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
		}
		const saved = await prisma.contactSubmission.create({ data: { name, email, message } });
		return NextResponse.json({ id: saved.id }, { status: 201 });
	} catch (e) {
		console.error('Contact POST error', e);
		return NextResponse.json({ error: 'Server error' }, { status: 500 });
	}
}

export async function GET() {
	const items = await prisma.contactSubmission.findMany({ orderBy: { createdAt: 'desc' } });
	return NextResponse.json(items);
}
