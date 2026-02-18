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
   npm run db:migrate
   ```
   This repo now includes a checked-in baseline migration, so you should not need `--name init` for first-time setup.
   Or, for a fast schema sync without creating a migration file:
   ```bash
   npm run db:push
   ```
   Or, for a fast schema sync without creating a migration file:
   ```bash
   npm run db:push
   ```
5. Seed demo records required by the starter UI:
   ```bash
   npm run db:seed
   ```
6. Start dev server:
   ```bash
   npm run dev
   ```


## NPM script output clarification
- `npm pkg get scripts.db:generate` prints the script definition string from `package.json` (expected: `"prisma generate"`).
- `npm pkg get scripts.db:push` prints the script definition string (expected: `"prisma db push"`).
- To actually execute Prisma generation, run:
  ```bash
  npm run db:generate
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
./scripts/setup-windows.ps1 -RecreateDbContainer
```


## Troubleshooting `P1001: Can't reach database server at localhost:5432`
This error means Prisma cannot connect to PostgreSQL using your `DATABASE_URL`.

1. Verify your `.env` points to the DB you expect:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mediadb?schema=public"
   ```
2. If you use Docker, make sure PostgreSQL is running:
   ```powershell
   docker ps --filter "name=mediadb-postgres"
   docker start mediadb-postgres
   ```
3. If the container is up but still booting, wait until ready:
   ```powershell
   docker exec mediadb-postgres pg_isready -U postgres -d mediadb
   ```
4. Re-run migration:
   ```bash
   npm run db:migrate -- --name init
   ```

Tip: On Windows, `./scripts/setup-windows.ps1` now waits for PostgreSQL readiness before running migrations.


## Troubleshooting `P3018` with `ERROR: type "vector" does not exist`
This means your PostgreSQL instance does not have the `pgvector` extension available or enabled.

If using Docker:
1. Recreate the DB container using a pgvector image:
   ```powershell
   docker rm -f mediadb-postgres
   ./scripts/setup-windows.ps1 -RecreateDbContainer
   ```
2. Re-run migration:
   ```bash
   npm run db:migrate -- --name init
   ```

If using your own local PostgreSQL, install/enable pgvector in that DB and then run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```


## Troubleshooting `P1001: Can't reach database server at localhost:5432`
This error means Prisma cannot connect to PostgreSQL using your `DATABASE_URL`.

1. Verify your `.env` points to the DB you expect:
   ```bash
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mediadb?schema=public"
   ```
2. If you use Docker, make sure PostgreSQL is running:
   ```powershell
   docker ps --filter "name=mediadb-postgres"
   docker start mediadb-postgres
   ```
3. If the container is up but still booting, wait until ready:
   ```powershell
   docker exec mediadb-postgres pg_isready -U postgres -d mediadb
   ```
4. Re-run migration:
   ```bash
   npm run db:migrate -- --name init
   ```

Tip: On Windows, `./scripts/setup-windows.ps1` now waits for PostgreSQL readiness before running migrations.

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
