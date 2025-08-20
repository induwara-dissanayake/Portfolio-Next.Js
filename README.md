# Portfolio (Next.js 15 + Tailwind + Prisma)

A full-stack portfolio with public pages, MDX blog, and a hidden admin panel for managing projects.

## Tech

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS v4
- Framer Motion (client-only)
- Prisma ORM + SQLite (default)
- next-themes for dark mode
- JWT cookie auth (via `jose`)

## Setup

1. Install deps

```powershell
npm install
```

2. Configure env
   Create `.env` (already created) and set values:

```
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="supersecret"
AUTH_SECRET="change-me"
```

3. DB migrate and generate

```powershell
npx prisma migrate dev --name init
npx prisma generate
```

4. Dev

```powershell
npm run dev
```

## Admin

- Go to `/admin/login` and login with the password from `.env` (username can be any).
- Admin pages are protected by middleware; CRUD uses `/api/projects` endpoints.

## Blog

- Add MDX files in `src/content/blog/*.mdx` with frontmatter `{ title, excerpt }`.

## Deploy (Vercel)

- Add `DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET` in Vercel env.
- Prisma with SQLite works on Vercel; for Postgres, update `DATABASE_URL` and run migrations.
