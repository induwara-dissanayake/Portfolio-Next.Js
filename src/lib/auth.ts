import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret');
const cookieName = 'session';

export type Session = {
  user: string;
};

export async function createSessionCookie(user: string) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

export async function getSessionFromCookie(cookieHeader?: string): Promise<Session | null> {
  const cookies = parseCookie(cookieHeader || '');
  const token = cookies[cookieName];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { user: String(payload.user) };
  } catch {
    return null;
  }
}

export function parseCookie(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(';')
    .map((v) => v.trim().split('='))
    .reduce((acc, [k, ...v]) => {
      if (!k) return acc;
      acc[k] = decodeURIComponent(v.join('='));
      return acc;
    }, {} as Record<string, string>);
}
