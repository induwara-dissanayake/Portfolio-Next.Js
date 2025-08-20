"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.username, password: data.password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/admin/projects');
      return;
    }
    setError('Invalid credentials');
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Admin Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full rounded border p-2" name="username" placeholder="Username" />
        <input className="w-full rounded border p-2" name="password" type="password" placeholder="Password" />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="w-full rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2" type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
