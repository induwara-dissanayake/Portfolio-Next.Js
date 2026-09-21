import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, message } = body || {};

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Name: ${name} | Email: ${email} | Message: ${message.replace(/\n/g, ' ')}\n`;

    // Try writing to root process.cwd(), fallback to /tmp on Vercel serverless environment
    try {
      const rootLogPath = path.join(process.cwd(), 'messages.log');
      await fs.appendFile(rootLogPath, logEntry, 'utf-8');
    } catch {
      try {
        const tmpLogPath = path.join('/tmp', 'messages.log');
        await fs.appendFile(tmpLogPath, logEntry, 'utf-8');
      } catch (tmpErr) {
        console.error('Failed to append to /tmp/messages.log:', tmpErr);
      }
    }

    // Optional DB save
    try {
      await prisma.contactSubmission.create({ data: { name, email, message } });
    } catch (dbErr) {
      console.log('DB save skipped or failed, message recorded in log file:', dbErr);
    }

    return NextResponse.json(
      { success: true, message: 'Message logged and received successfully' },
      { status: 201 }
    );
  } catch (e) {
    console.error('Contact POST error:', e);
    return NextResponse.json({ error: 'Server error processing message' }, { status: 500 });
  }
}

export async function GET() {
  try {
    let logs = '';
    const rootLogPath = path.join(process.cwd(), 'messages.log');
    const tmpLogPath = path.join('/tmp', 'messages.log');

    try {
      logs += await fs.readFile(rootLogPath, 'utf-8');
    } catch {}

    try {
      logs += await fs.readFile(tmpLogPath, 'utf-8');
    } catch {}

    return new Response(logs || 'No messages logged yet.', { headers: { 'Content-Type': 'text/plain' } });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
