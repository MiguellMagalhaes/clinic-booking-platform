# Workspace

## Overview

Full-stack medical appointment booking MVP. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/web), Tailwind CSS, shadcn/ui, framer-motion, react-hook-form, zustand
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **i18n**: Custom zustand-based translation hook with pt-PT (default), fr, es, de, en

## Features

1. **Booking System**: Calendar date picker + time slot selection + booking form (name, email, phone)
2. **Database**: `appointments` and `clinics` tables
3. **API Routes**: POST/GET /api/appointments, GET /api/clinics, GET /api/available-slots
4. **Email**: Mock email service with Resend support (set RESEND_API_KEY env var)
5. **IMED Integration Mock**: `/artifacts/api-server/src/lib/imed.ts` with fetchAppointmentsFromIMED() and createAppointmentInIMED()
6. **Sync Engine**: Cron job every 15 minutes (artifacts/api-server/src/lib/sync.ts), deduplicates via external_id
7. **Multilingual**: pt-PT default, switchable to fr, es, de, en

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   ├── src/routes/     # appointments.ts, clinics.ts, health.ts
│   │   └── src/lib/        # imed.ts, email.ts, sync.ts, logger.ts
│   └── web/                # React + Vite frontend
│       └── src/
│           ├── pages/      # home.tsx (booking), admin.tsx (appointments list)
│           ├── components/  # calendar.tsx, layout.tsx, ui/
│           ├── hooks/       # use-translation.ts, use-appointments.ts
│           └── lib/         # i18n.ts (translations), utils.ts
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/     # appointments.ts (appointments + clinics tables)
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- `clinics`: id, name, created_at
- `appointments`: id, name, email, phone, date, time, status, external_id, source, clinic_id, created_at

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (auto-provided by Replit)
- `RESEND_API_KEY` — Optional, for real email sending via Resend
- `SESSION_SECRET` — Session secret

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Running Migrations (Development)

```bash
pnpm --filter @workspace/db run push
# or if schema conflicts:
pnpm --filter @workspace/db run push-force
```

## Running Codegen (after OpenAPI spec changes)

```bash
pnpm --filter @workspace/api-spec run codegen
```
