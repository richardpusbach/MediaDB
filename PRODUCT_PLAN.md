# MediaDB Full-Stack Build Plan

## 1) Recommended Stack (optimized for fast MVP + low initial cost)

### Frontend (Web)
- **Next.js (TypeScript, App Router)** for a modern web UI and API route flexibility.
- **Tailwind CSS + shadcn/ui** for a modern, clean interface that works well on desktop/tablet/mobile browsers.

### Mobile Apps (iPhone + Android)
- **React Native with Expo** (recommended) for one codebase and faster delivery than separate Swift/Kotlin apps.
- Reuse API + auth model from web.

### Backend + Data + Auth
- **Supabase** (Postgres + Auth + Storage + Row Level Security) to keep hosting/setup simple and free-tier friendly.
- **Prisma** for strongly typed DB access and easy migrations.
- **Supabase Storage** buckets for media files and generated thumbnails.

### AI and Semantic Search
- **Nano Banana Pro API** for image analysis (description + labels).
- **Postgres + pgvector** for semantic search embeddings and vector similarity.
- Pipeline:
  1. User uploads image.
  2. Background worker requests AI description/labels.
  3. Description + labels embedded and stored as vector.
  4. Search query embedded and matched against vector index.

### Hosting
- **Vercel** for web app.
- **Supabase** for DB/Auth/Storage.
- Optional lightweight background worker on **Railway/Render** free tier if needed for async AI jobs.

---

## 2) Product Scope Confirmed from Your Answers

### Roles and tenancy
- Roles: **admin** and **user** only.
- Multi-tenant model (workspace/org aware), but assets private per user for now.
- Admin can:
  - create users
  - assign role
  - disable/enable users
  - trigger password reset
  - force password reset

### Auth
- Sign in with:
  - email/password
  - Google
  - Apple
  - Microsoft
- **MFA required for admin accounts**.

### Media support
- Required formats: SVG, JPG, PNG, GIF + additional types (PDF/DXF/AI/EPS).
- Single upload for MVP.
- Animated GIF support for preview/thumbnail.
- No version history in MVP.

### Metadata
- title, description, category (single), tags (freeform), date added, favorite, deleted/archive status.
- User-specific categories; create category inline during upload.

### AI
- Automatic analysis on upload.
- Generate AI description + style/keyword labels.
- AI metadata visible but not user-editable.
- Semantic search required.

### UX features
- Thumbnail grid and click-to-preview modal/page.
- Filters: category + date added.
- Search: title/description + semantic AI search.
- Sort: newest, name, most used.
- Record editing (including replacing file).
- Favorite/star assets.
- Archive/trash with restore.
- Download and clipboard copy where browser/device supports it.

### Integrations
- For MVP: export/download + clipboard + drag/drop workflow.
- Direct LightBurn/xTool API integration marked as investigation item.

---

## 3) System Design

## 3.1 High-level architecture
1. Web/mobile clients call backend APIs.
2. Auth validated via Supabase JWT.
3. File uploads go to private storage bucket.
4. DB row created with `analysis_status = pending`.
5. Worker processes AI analysis, updates metadata and embeddings.
6. Search endpoint combines keyword + semantic ranking.

## 3.2 Suggested data model (MVP)

### users
- id
- email
- display_name
- role (`admin` | `user`)
- mfa_required
- status (`active` | `disabled`)
- created_at

### workspaces
- id
- name
- created_at

### workspace_members
- workspace_id
- user_id
- role

### categories
- id
- user_id
- name
- created_at

### assets
- id
- user_id
- workspace_id
- title
- user_description
- ai_description
- ai_labels (jsonb/text[])
- category_id
- tags (text[])
- file_path
- file_type
- file_size
- width
- height
- thumbnail_path
- is_favorite
- usage_count
- is_archived
- deleted_at
- analysis_status (`pending` | `complete` | `failed`)
- embedding (vector)
- created_at
- updated_at

### audit_admin_actions (optional but useful)
- id
- admin_user_id
- action
- target_user_id
- metadata
- created_at

## 3.3 Security model
- Private storage bucket.
- Signed URLs for read/download.
- Row Level Security in DB:
  - users can only access own assets/categories.
  - admins can manage users in tenant/workspace scope.
- MFA policy enforcement for admin role.

---

## 4) API Surface (MVP)

### Auth/Profile
- `POST /auth/login`
- `POST /auth/oauth/:provider`
- `POST /auth/logout`
- `GET /me`
- `PATCH /me`
- `POST /me/change-password`

### Admin
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `POST /admin/users/:id/reset-password`
- `POST /admin/users/:id/disable`
- `POST /admin/users/:id/enable`

### Categories
- `GET /categories`
- `POST /categories`
- `PATCH /categories/:id`
- `DELETE /categories/:id`

### Assets
- `GET /assets` (filters: category, date range, q, archived, favorites, sort)
- `POST /assets` (multipart upload + metadata)
- `GET /assets/:id`
- `PATCH /assets/:id`
- `POST /assets/:id/replace-file`
- `POST /assets/:id/favorite`
- `POST /assets/:id/archive`
- `POST /assets/:id/restore`
- `DELETE /assets/:id` (soft delete)
- `POST /assets/:id/download-url`
- `POST /assets/:id/copy-to-clipboard-token` (optional helper)

### Search
- `POST /search` (keyword + semantic hybrid)

### AI jobs
- `POST /internal/ai/analyze/:assetId`
- `POST /internal/ai/reindex/:assetId`

---

## 5) Phased Delivery Plan

## Phase 1 (Weeks 1–3): MVP Web
- Auth (email + Google first).
- User/admin roles.
- Category CRUD with inline create.
- Single-file upload.
- Asset listing with thumbnail + preview.
- Edit, archive/trash, favorite, restore.
- Basic keyword search + category/date filters.

## Phase 2 (Weeks 3–5): AI + semantic search
- Nano Banana Pro analysis job.
- AI description + labels in UI.
- Embeddings + semantic search ranking.
- Better sort options and usage count tracking.

## Phase 3 (Weeks 5–7): OAuth expansion + polish
- Apple + Microsoft login.
- Enforce admin MFA.
- Improved UX theming and responsive behavior.
- Hardening, telemetry, error handling.

## Phase 4 (Weeks 7–10): Mobile apps
- React Native (Expo).
- Shared login + browsing + search + upload (where platform permits).
- Clipboard and download actions adapted per platform capability.

---

## 6) Remaining Decisions Needed (to start implementation)

1. **Upload size limit definition**: pick a concrete max (e.g., 200MB or 500MB).
2. **Provider details**: Nano Banana Pro API credentials + endpoint docs.
3. **Storage forecast**: rough expected monthly growth (GB).
4. **Must-have day-1 features**: choose top 5 from this list:
   - upload + metadata
   - category management
   - thumbnails + preview
   - edit/archive/restore
   - semantic search
   - admin user management
   - OAuth social login
5. **Signed URL policy**: recommended default is private storage + short-lived signed URLs.
6. **Branding direction**: if none, a clean neutral modern theme will be used.

---

## 7) Recommendation Summary
- Build **web MVP first** with Next.js + Supabase.
- Use **React Native Expo** for iOS/Android second to reduce cost/time.
- Use private storage + signed URLs for security from day one.
- Implement AI analysis async and semantic search with pgvector.
- Defer direct LightBurn/xTool integration to a later discovery stream while preserving download/clipboard workflow in MVP.

