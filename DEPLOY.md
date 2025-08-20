Deploying to Vercel

1. Create a Vercel project
   - Import this repository into Vercel
   - Framework preset: Next.js

2. Create a Vercel Postgres database (recommended)
   - In Vercel dashboard: Storage > Postgres > Create
   - Copy the `DATABASE_URL` (it looks like: `postgres://user:pass@host:5432/db?sslmode=require`)

3. Set Environment Variables (Project Settings > Environment Variables)
   - DATABASE_URL = your Vercel Postgres URL
   - (Optional) NEXT_PUBLIC_GITHUB_URL, NEXT_PUBLIC_LINKEDIN_URL, NEXT_PUBLIC_FACEBOOK_URL

4. Build settings (Project Settings > Build & Development Settings)
   - Install Command: (leave default)
   - Build Command: `npm run build:vercel`
   - Output Directory: `.next`

5. First deploy
   - Press Deploy. The build will:
     - Generate Prisma client using the Postgres schema
     - Push the schema to the Postgres database
     - Build Next.js

6. Verify
   - Open the deployment URL
   - Test contact form and blog CRUD (admin via clicking footer "2025")

Troubleshooting

- If you see Prisma connection errors:
  - Confirm `DATABASE_URL` is set on Vercel (Production env)
  - Ensure the database is created and reachable (Vercel Postgres provides SSL)
- If you used SQLite locally, keep local `.env` as `file:./dev.db`; Vercel will use Postgres env.
