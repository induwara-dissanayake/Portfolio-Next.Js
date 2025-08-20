import { NextResponse } from 'next/server';
import { createSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { username, password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD || 'supersecret';
  if (!password || password !== expected) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const cookie = await createSessionCookie(username || 'admin');
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
}
