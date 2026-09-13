# TaskFlow SaaS

A full-stack project and task management dashboard built with **Next.js 16**, **Prisma**, and **Supabase**. It demonstrates a modern, server-first React architecture: authenticated Server Components, Server Actions for mutations, and a type-safe database layer — with no client-side data-fetching library or REST API to maintain.

## Key Features

- **Email/password authentication** via Supabase Auth, with session refresh and route protection handled at the edge
- **Project management** — create and delete projects; deleting a project atomically removes its tasks
- **Task management** — create tasks against a project, update status inline (Todo / In Progress / Done), and delete
- **Server-rendered UI** — every read runs on the server; every write is a Server Action followed by a cache revalidation
- **Type safety end to end** — Prisma-generated types flow from the database schema into React components

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL on Supabase |
| Authentication | Supabase Auth (`@supabase/ssr`) |
| Tooling | ESLint 9 |

## Architecture Overview

```
Browser
  │  HTTPS
  ▼
proxy.ts ──────────────── refreshes the Supabase session cookie on every request;
  │                       redirects unauthenticated users to /login
  ▼
app/page.tsx  (Server Component)
  │  reads: prisma.projects.findMany / prisma.tasks.findMany
  │  writes: Server Actions (createProject, createTask, updateTaskStatus, deleteTask, deleteProject)
  │          └─ each ends with revalidatePath("/")
  ▼
lib/prisma.ts ─────────── singleton PrismaClient (survives HMR in development)
  ▼
Supabase PostgreSQL
```

**Request flow**

1. `proxy.ts` runs before rendering. It validates the session with `supabase.auth.getUser()`, rotates the cookie if needed, and enforces the auth boundary (`/login` is the only public route).
2. The dashboard is an `async` Server Component. It re-checks the user, queries Prisma directly, and renders HTML — no loading states, no client fetches.
3. Forms post to Server Actions. The actions validate input, call Prisma, and invalidate the route cache so the next render reflects the change.
4. The only client component is `TaskStatusSelect`, a `<select>` that submits its parent form on change so status updates need no separate button.

**Project layout**

```
app/
  page.tsx                  Dashboard + Server Actions
  login/page.tsx            Sign-in / sign-up form
  login/actions.ts          login, signup, signOut actions
  components/               Client components (TaskStatusSelect)
lib/
  prisma.ts                 Prisma client singleton
  supabase/server.ts        Cookie-aware Supabase client for Server Components/Actions
  supabase/proxy.ts         Session refresh + redirect logic used by proxy.ts
prisma/
  schema.prisma             Database schema
proxy.ts                    Request middleware (Next.js 16 "proxy" convention)
```

## Local Setup

**Prerequisites:** Node.js 20+, a [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/jason050928/fullstack-saas-demo.git
cd fullstack-saas-demo
npm install

cp .env.example .env        # then fill in the values (see below)

npx prisma db push          # creates the projects and tasks tables
npx prisma generate         # generates the typed client (also runs automatically on npm install)

npm run dev                 # http://localhost:3000
```

Other scripts: `npm run build` (production build), `npm run lint`.

## Environment Variables

Copy `.env.example` to `.env`. The file is git-ignored; never commit real values.

| Variable | Where to find it | Used by |
|---|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI) | Prisma |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key | Supabase Auth |

The anon key is safe to expose to the browser; access to data is governed by Supabase's row-level security and by the server-side auth check in this app.

## Database Structure

Two tables, defined in [`prisma/schema.prisma`](prisma/schema.prisma):

```
projects                          tasks
────────────────────────          ────────────────────────
id          BigInt  PK            id          BigInt  PK
created_at  Timestamptz           created_at  Timestamptz
name        String?               title       String?
                                  status      String?   "Todo" | "In Progress" | "Done"
                                  project_id  BigInt?   → projects.id
```

`tasks.project_id` references a project logically; the delete-project action removes dependent tasks inside a `prisma.$transaction` so the two tables never drift out of sync. Row-level security is enabled on both tables in Supabase.

## Authentication

- **Provider:** Supabase Auth, email + password. Sign-up and sign-in share one form; sign-up honours Supabase's email-confirmation setting.
- **Session storage:** HTTP-only cookies managed by `@supabase/ssr`. `proxy.ts` refreshes expired tokens on every request so Server Components always see a valid session.
- **Route protection:** unauthenticated requests to any route other than `/login` are redirected to `/login`; authenticated users visiting `/login` are sent to the dashboard. The dashboard also re-verifies the user server-side as defence in depth.
- **Sign-out** is a Server Action that clears the session and redirects.

## Future Improvements

- Enforce a foreign key (`tasks.project_id → projects.id`) with `ON DELETE CASCADE` and a Prisma relation
- Scope projects and tasks to the signed-in user (`user_id` column + RLS policies) for true multi-tenancy
- Replace free-text `status` with a Postgres enum
- Optimistic UI for status changes and deletes using `useOptimistic`
- Task editing, due dates, and filtering by project or status
- Automated tests (Vitest for actions, Playwright for the auth flow) and a CI workflow
- OAuth providers (GitHub, Google) through Supabase Auth
