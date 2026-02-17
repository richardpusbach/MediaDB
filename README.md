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
./scripts/setup-windows.ps1 -UseDockerPostgres
```

This script will:
- start/create a local PostgreSQL Docker container (`mediadb-postgres`) when `-UseDockerPostgres` is provided,
- create `.env` from `.env.example`,
- set `DATABASE_URL`,
- install dependencies,
- run Prisma generate + migrate,
- seed demo data.

If migration fails on Windows due to old local migration state, the script now automatically attempts:
- a clean Prisma client reinstall/re-generate,
- stale `prisma/migrations` cleanup when `vector` SQL is detected,
- `prisma migrate reset --force --skip-seed` followed by one retry of `migrate dev`.

Optional flags:

```powershell
./scripts/setup-windows.ps1                           # use local PostgreSQL service
./scripts/setup-windows.ps1 -UseDockerPostgres        # use Docker PostgreSQL
./scripts/setup-windows.ps1 -DbUser postgres -DbPassword postgres -DbName mediadb -DbPort 5432
```

If you still see a parser error, make sure you are running the latest script version and execute it directly as a file:

```powershell
git pull
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -UseDockerPostgres
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


### Troubleshooting: `P1001: Can't reach database server at localhost:5432`
Use one of these options:

1. Docker (recommended):
   ```powershell
   docker start mediadb-postgres
   docker logs mediadb-postgres --tail 50
   ```
   Then run:
   ```powershell
   npm run db:migrate -- --name init
   ```

2. Local PostgreSQL service:
   - Ensure PostgreSQL service is running.
   - Verify port 5432 is listening.
   - Confirm `.env` `DATABASE_URL` matches your local credentials.

Tip: rerun bootstrap script after pulling latest changes:
```powershell
git pull
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -UseDockerPostgres
```


### Troubleshooting: `Required command 'docker' is not installed or not on PATH.`
You are **not** doing anything wrong. This means Docker Desktop is not installed or not on PATH.

Use one of these paths:

1. Use local PostgreSQL service (no Docker):
   ```powershell
   .\scripts\setup-windows.ps1
   ```
2. Use Docker PostgreSQL:
   - Install Docker Desktop and restart PowerShell
   - Then run:
   ```powershell
   .\scripts\setup-windows.ps1 -UseDockerPostgres
   ```

### Troubleshooting: `Cannot find module ... @prisma/client/runtime/library.js`
If you see errors like this while running `npm run dev`, your local Prisma install is incomplete/corrupted.

1. Stop the dev server.
2. Reinstall dependencies cleanly:
   ```powershell
   rd /s /q node_modules
   del package-lock.json
   npm cache clean --force
   npm install
   ```
3. Regenerate Prisma client:
   ```powershell
   npm run db:generate
   ```
4. Restart the app:
   ```powershell
   npm run dev
   ```

This repo now runs `prisma generate` automatically after install (`postinstall`) to reduce this issue.

### Troubleshooting: `P3006 ... type "vector" does not exist`
This project no longer requires pgvector. If you still see this error, your local Prisma migration history/cache is stale.

1. Pull latest changes:
   ```bash
   git pull
   ```
2. Remove local Prisma migration history folder if it was created during previous failed runs:
   ```powershell
   if (Test-Path .\prisma\migrations) { rd /s /q .\prisma\migrations }
   ```
3. Re-run bootstrap or manual DB setup:
   ```powershell
   .\scripts\setup-windows.ps1 -UseDockerPostgres
   ```
   or
   ```powershell
   npm run db:migrate -- --name init
   npm run db:seed
   ```

If you still see `P3006`, reset just your local dev DB migrations and rerun:
```powershell
npx prisma migrate reset --force --skip-seed
npm run db:migrate -- --name init
npm run db:seed
```

### Troubleshooting: UI looks old (shows `File path` field)
If your form still shows `File path`/`File type` fields, your browser is running stale build output.

1. Pull latest changes:
   ```bash
   git pull
   ```
2. Delete Next build cache:
   ```bash
   rm -rf .next
   ```
   PowerShell:
   ```powershell
   rd /s /q .next
   ```
3. Restart dev server and hard refresh browser (`Ctrl+F5`).
