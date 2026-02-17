# MediaDB

MVP scaffold for a private media database with category + tag metadata, starter search, and Prisma-backed APIs.

## What was fixed
- Added `.env.example` so setup docs no longer reference a missing file.
- Added Prisma seed script to create `demo-user` and `demo-workspace` expected by the starter UI.
- Added API error handling for validation and Prisma FK/unique/not-found errors so failures are actionable.
- Added a Windows bootstrap script to automate local setup (`scripts/setup-windows.ps1`).

## Quick start (manual)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Generate Prisma client:
   ```bash
   npm run db:generate
   ```
4. Run migrations:
   ```bash
   npm run db:migrate -- --name init
   ```
5. Seed demo records required by the starter UI:
   ```bash
   npm run db:seed
   ```
6. Start dev server:
   ```bash
   npm run dev
   ```

## Windows one-command bootstrap
From PowerShell in the repo root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
./scripts/setup-windows.ps1
```

This script will:
- start/create a local PostgreSQL Docker container (`mediadb-postgres`),
- create `.env` from `.env.example`,
- set `DATABASE_URL`,
- install dependencies,
- run Prisma generate + migrate,
- seed demo data.

Optional flags:

```powershell
./scripts/setup-windows.ps1 -UseDockerPostgres:$false
./scripts/setup-windows.ps1 -DbUser postgres -DbPassword postgres -DbName mediadb -DbPort 5432
```

If you still see a parser error, make sure you are running the latest script version and execute it directly as a file:

```powershell
git pull
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

## Starter endpoints
- `GET /api/health`
- `GET /api/categories?userId=...`
- `POST /api/categories`
- `GET /api/assets?userId=...&q=...&categoryId=...`
- `POST /api/assets`
- `PATCH /api/assets/:assetId`

## Why you saw previous runtime errors
- If dependencies are not installed, `next` is unavailable (`npm run dev` fails).
- If DB records are not seeded, category/asset creation fails FK checks.
- If invalid payloads are posted, APIs now return 400 with validation details.
