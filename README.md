# MediaDB

MVP scaffold for a private media database with category + tag metadata, starter search, and Prisma-backed APIs.

## What was fixed
- Added `.env.example` so setup docs no longer reference a missing file.
- Added Prisma seed script to create `demo-user` and `demo-workspace` expected by the starter UI.
- Added API error handling for validation and Prisma FK/unique/not-found errors so failures are actionable.

## Quick start
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
