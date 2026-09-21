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

    // 1. Record message to local log file
    const logFilePath = path.join(process.cwd(), 'messages.log');
    await fs.appendFile(logFilePath, logEntry, 'utf-8');

    // 2. Also attempt DB save if database is present
    try {
      await prisma.contactSubmission.create({ data: { name, email, message } });
    } catch (dbErr) {
      console.log('DB save skipped or failed, message safely recorded to log file:', dbErr);
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
    const logFilePath = path.join(process.cwd(), 'messages.log');
    const logs = await fs.readFile(logFilePath, 'utf-8');
    return new Response(logs, { headers: { 'Content-Type': 'text/plain' } });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
