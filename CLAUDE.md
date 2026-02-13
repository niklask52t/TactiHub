# CLAUDE.md — TactiHub Project Guide

This file provides context for AI assistants working on the TactiHub codebase.

---

## What is TactiHub?

TactiHub is a real-time collaborative strategy planning tool for competitive games (Rainbow Six Siege, Valorant, etc.). Users can draw tactics on game maps, save/share battle plans, and collaborate in rooms with live cursors and drawing sync.

**Author**: Niklas Kronig
**Version**: 1.5.2
**Repo**: https://github.com/niklask52t/TactiHub
**Based on**: [r6-map-planner](https://github.com/prayansh/r6-map-planner) (Node/Express/Socket.IO) and [r6-maps](https://github.com/jayfoe/r6-maps) (Laravel/Vue)

---

## Repository Structure

This is a **pnpm monorepo** with 3 packages:

```
packages/
  shared/   → @tactihub/shared  — TypeScript types, enums, constants (incl. APP_VERSION)
  server/   → @tactihub/server  — Fastify 5 API + Socket.IO 4.8
  client/   → @tactihub/client  — React 19 + Vite 6 SPA
```

### Package Dependencies
- `shared` has no internal dependencies (standalone types)
- `server` depends on `shared` (workspace:*)
- `client` depends on `shared` (workspace:*)
- Always build `shared` first: `pnpm --filter @tactihub/shared build`

---

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.7 (strict mode)
- **Package Manager**: pnpm with workspaces
- **Frontend**: React 19, Vite 6, Tailwind CSS v4 (CSS-based config, NOT tailwind.config.js), shadcn/ui, Zustand, TanStack Query, React Router 7, react-hook-form + zod
- **Backend**: Fastify 5 with plugins (@fastify/cors, @fastify/cookie, @fastify/multipart, @fastify/rate-limit, @fastify/static)
- **Database**: PostgreSQL 16 via Drizzle ORM (drizzle-kit for migrations)
- **Cache/Sessions**: Redis 7 via ioredis
- **Realtime**: Socket.IO 4.8 (JWT auth at handshake, guests allowed without token)
- **Auth**: JWT access tokens (15min) + refresh tokens (7d, httpOnly cookie, stored in Redis)
- **Email**: Nodemailer
- **Images**: Sharp (resize + WebP conversion)
- **Infrastructure**: Docker Compose (postgres:16-alpine + redis:7-alpine)

---

## Key Architecture Decisions

### Database Schema (15 tables)
- `draws` table uses a JSONB `data` column instead of polymorphic tables — flexible, no joins needed
- `draw_type` enum: path, line, rectangle, text, icon
- `settings` table is key-value for app-wide config (registration_enabled, etc.)
- `operator_gadgets` is a many-to-many junction table (composite PK)
- `votes` has unique constraint on (user_id, battleplan_id)

### Floor Image Variants (Blueprint / Darkprint / Whiteprint)
- Each floor can have up to 3 image variants: `imagePath` (blueprint, required), `darkImagePath`, `whiteImagePath` (optional)
- View mode switcher appears in top-left of canvas when >1 variant is available
- Default is always Blueprint; switching swaps the background image 1:1 (same dimensions)
- Admin can upload variants via Floor Layout management (`/admin/maps/:mapId/floors`)
- Pre-seeded images are committed to repo under `packages/server/uploads/maps/` (165 WebP) and `packages/server/uploads/gadgets/` (23 WebP)
- Re-process from source folder: `pnpm --filter @tactihub/server tsx src/scripts/process-images.ts <source-folder>`

### Canvas System (3 layers per floor)
1. **Background layer** — Map floor image (variant based on view mode selector)
2. **Drawings layer** — All persisted/committed draws
3. **Active layer** — Current drawing action + peer cursors

### Viewport (Zoom + Pan)
- CSS `transform: translate(${offsetX}px, ${offsetY}px) scale(${scale})` on the canvas container
- `transformOrigin: '0 0'` — zoom/pan works via CSS, not canvas redraw
- Coordinate conversion: `x = (clientX - containerLeft - offsetX) / scale`
- Zoom centered on cursor via `zoomTo(newScale, pivotX, pivotY)` in Zustand store
- Zoom limits: `ZOOM_MIN = 0.25`, `ZOOM_MAX = 4`, `ZOOM_STEP = 0.1`

### Draw Persistence (Socket vs REST)
- **Socket.IO** handlers are **broadcast-only** — they relay events to other room participants
- **REST API** handles database persistence (POST to create draws, DELETE to soft-delete)
- This avoids the dual-write bug where draws were inserted both via socket and REST

### Undo/Redo
- `myDrawHistory` and `undoStack` in canvas Zustand store
- `pushMyDraw(entry)` after REST create returns IDs
- `popUndo()` → delete via REST + socket broadcast
- `popRedo()` → recreate via REST + socket broadcast
- Keyboard: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo)

### Auth Flow
1. Register → email verification sent → **must verify before login** (without SMTP, admin must manually verify each user)
2. Registration flow adapts: if public reg is ON, no token needed; if OFF, user must enter a single-use registration token first
3. Optional Google reCAPTCHA v2 on registration (if `RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` set in `.env`)
4. **Magic Link Login**: POST /request-magic-link sends email with login link (15min TTL), GET /magic-login consumes token and returns access+refresh tokens (same as login)
5. Login → accepts username OR email via `identifier` field → access token (15min) + refresh token (7d httpOnly cookie + Redis)
5. First login with default admin email (`admin@tactihub.local`) forces credential change (gaming-style modal)
6. Token refresh → POST /api/auth/refresh returns new access token
7. Admin can toggle public registration and create invite tokens
8. **Admin manual verification**: PUT /api/admin/users/:id/verify — verifies a user without email, sends notification email
9. **Guests**: Socket connects without token → userId = `guest-{socketId}`, drawing events blocked server-side

### Account Deletion Flow
1. User → Account Settings → Delete Account → two confirmation dialogs (type username)
2. Server sends deletion confirmation email with token link (24h TTL in Redis)
3. User clicks email link → `GET /api/auth/confirm-deletion?token=...`
4. Account is **deactivated** (`deactivatedAt` set, `deletionScheduledAt` = now + 30 days)
5. Refresh token revoked → user logged out
6. Deactivated users cannot log in (checked in login + refresh routes)
7. Admin can **reactivate** via `PUT /api/admin/users/:id/reactivate` (clears deactivatedAt + deletionScheduledAt)
8. Daily cleanup job permanently deletes users where `deletionScheduledAt < now()` and sends final email
9. DB fields: `users.deactivated_at` (nullable timestamp), `users.deletion_scheduled_at` (nullable timestamp)

### Laser Pointer (non-persistent, multiplayer)
- **Laser Dot**: Tool.LaserDot — sends cursor position via `cursor:move` with `isLaser: true`, rendered as glowing dot on peers' active canvas
- **Laser Line**: Tool.LaserLine — collects points on drag, sends via `laser:line` socket event, fades over 3 seconds after release
- Both are **not persisted** to database — purely ephemeral broadcast

### Icon Tool (Operator/Gadget placement)
- Tool.Icon in toolbar shows IconPicker popover with operators (by side) and gadgets (with icons)
- IconPicker fetches from `/api/games/:slug/operators` and `/api/games/:slug/gadgets`
- Game slug comes from battleplan response (now includes `game: { id, slug, name }`)
- Click places `type: 'icon'` draw with `{ iconUrl, size: 40 }` — persisted like other draws

### Socket.IO Events
- Client emits: `room:join`, `room:leave`, `cursor:move`, `draw:create`, `draw:delete`, `draw:update`, `operator-slot:update`, `battleplan:change`, `laser:line`
- Server emits: `room:joined`, `room:user-joined`, `room:user-left`, `cursor:moved`, `draw:created`, `draw:deleted`, `draw:updated`, `operator-slot:updated`, `battleplan:changed`, `laser:line`
- `cursor:move` now includes optional `isLaser` flag for laser dot rendering
- `laser:line` broadcasts `{ userId, points, color }` — no DB persistence
- 10 colors in pool, assigned to users on room join
- Guest connections are allowed but cannot emit draw/update events

---

## File Conventions

### Server
- Route files in `src/routes/` and `src/routes/admin/`
- Each route file exports a Fastify plugin: `export default async function(fastify: FastifyInstance)`
- Business logic in `src/services/`
- Database schema in `src/db/schema/` with barrel export from `src/db/schema/index.ts`
- Database connection singleton in `src/db/connection.ts`
- Socket handlers in `src/socket/handlers/`
- Use `.js` extensions in imports (ESM with TypeScript)

### Client
- Feature-based folder structure under `src/features/`
- Pages are default exports (for lazy loading with `React.lazy`)
- shadcn/ui components in `src/components/ui/`
- Layout components in `src/components/layout/`
- Zustand stores in `src/stores/`
- API/Socket utilities in `src/lib/`
- Path alias: `@/*` → `./src/*`
- Canvas utilities in `src/features/canvas/utils/` (e.g., `hitTest.ts`)

### Shared
- Types in `src/types/` (auth, game, battleplan, room, admin, api, canvas)
- Constants in `src/constants/index.ts` (includes `APP_VERSION`)
- `Tool` enum is in `src/types/canvas.ts` (Pen, Line, Rectangle, Text, Icon, Eraser, Select, Pan, LaserDot, LaserLine)
- Barrel export from `src/index.ts` (uses `export type *` for type-only re-exports)

---

## Theme / Design

- **Dark mode only** (class="dark" on html element)
- **CSS**: Tailwind v4 with CSS theme variables in `src/index.css` using oklch color space
- **Logo**: `public/tactihub_logo.png` (icon + text), `public/tactihub_icon.png` (icon only, used as favicon)

### Color Palette

Derived from the TactiHub logo gradient (`#fd7100` → `#da2c00`) and dark grays (`#c3c9cc` → `#3c4653`).

| Role | Hex | OKLCH | Usage |
|------|-----|-------|-------|
| **Primary** | `#fd7100` | `oklch(0.68 0.19 45)` | Buttons, links, accents, ring, glow effects |
| **Primary Foreground** | `#ffffff` | `oklch(0.98 0 0)` | Text on primary backgrounds |
| **Destructive** | `#da2c00` | `oklch(0.55 0.22 25)` | Errors, delete actions, warnings |
| **Background** | `#2a2f38` | `oklch(0.185 0.01 250)` | Page background |
| **Foreground** | `#c3c9cc` | `oklch(0.88 0.005 250)` | Primary text |
| **Card** | `#323842` | `oklch(0.22 0.012 250)` | Card backgrounds |
| **Secondary** | `#3c4653` | `oklch(0.28 0.015 250)` | Secondary backgrounds, muted areas |
| **Muted Foreground** | — | `oklch(0.65 0.01 250)` | Secondary text, labels |
| **Border / Input** | — | `oklch(0.32 0.015 250)` | Borders, input outlines |
| **Chart 1–5** | — | orange, red-orange, amber, teal, purple | Data visualization |

---

## Common Commands

```bash
pnpm dev                    # Start server (3001) + client (5173) concurrently
pnpm build                  # Build shared → server → client
pnpm db:generate            # Generate Drizzle migration files
pnpm db:migrate             # Apply database migrations
pnpm db:seed                # Seed admin user + game data
pnpm db:push                # Push schema changes directly (dev only)
pnpm db:studio              # Open Drizzle Studio
# Map/gadget images are pre-seeded in repo (uploads/maps/ + uploads/gadgets/)
docker compose up -d        # Start PostgreSQL + Redis
docker compose down         # Stop containers (data stays in volumes)
docker compose down -v      # Stop + delete ALL data (pgdata + redisdata volumes)
bash dev-reset.sh           # Full dev reset: pull dev, nuke DB, rebuild from scratch
```

---

## Development Notes

- Vite dev server proxies `/api` and `/socket.io` to localhost:3001
- The client uses `tsc -b` (project references) for build — `shared` must have `composite: true`
- `tsconfig.node.json` in client is for vite.config.ts only
- `noUnusedLocals` and `noUnusedParameters` are enabled in client — remove unused imports
- Seed data includes: 1 admin user, 2 games (R6 + Valorant), 21 R6 maps with correct floor counts + cover thumbnails, operators/agents, gadgets/abilities
- Admin login after seed: `admin` / `admin@tactihub.local` / `changeme` (forced credential change on first login)
- Upload directory structure: `uploads/{games,maps,operators,gadgets}/` — maps/ and gadgets/ are tracked in git (pre-seeded), games/ and operators/ are gitignored
- Pre-seeded images: 165 map floor WebP + 23 gadget icon WebP + 21 map cover WebP committed to repo, referenced by seed via deterministic names (`{slug}-{num}-{variant}.webp`, `{slug}-cover.webp`)
- Images uploaded via admin panel are processed by Sharp (resized, converted to WebP) and override the seed paths in the DB
- `processUpload()` returns `null` for empty file buffers (e.g. form submits without selecting a file) — callers skip processing
- Radix UI Switch sends "on" in FormData, not "true" — client normalizes to "true"/"false" before sending
- Admin floor management: `/admin/maps/:mapId/floors` — upload blueprint, darkprint, and whiteprint images per floor
- `map_floors` table has: `imagePath` (blueprint, required), `darkImagePath`, `whiteImagePath` (both nullable)
- Process script: `packages/server/src/scripts/process-images.ts` — converts source images to WebP with deterministic names (no DB access needed)

---

## Known Gotchas / Deployment Notes

### Stale Drizzle migration files cause "already exists" errors
When resetting the database (`docker compose down -v`), the old migration files in `packages/server/drizzle/` still exist. If the schema evolved across multiple migrations (e.g., one creates a table, another adds a column), regenerating on top of stale files produces conflicts. **Always clean migrations before regenerating from scratch:**
```bash
rm -rf packages/server/drizzle/*
pnpm db:generate
```
The `dev-reset.sh` script does this automatically.

### drizzle-kit cannot resolve .js extensions
drizzle-kit uses CJS `require()` internally which cannot resolve `.js` → `.ts` imports. All `db:generate`, `db:migrate`, `db:seed`, and `db:studio` scripts run through `tsx` to handle this. Do NOT remove the `tsx` prefix from these scripts in `packages/server/package.json`.

### dotenv path resolution
When `pnpm --filter` runs scripts, cwd is `packages/server/`, not project root. The `.env` file lives in the project root. All server entry points (`index.ts`, `connection.ts`, `seed.ts`, `drizzle.config.ts`) must use:
```typescript
import { config } from 'dotenv';
config({ path: '../../.env' });
```
Do NOT use `import 'dotenv/config'` — it loads `.env` from cwd which is wrong.

### docker compose down -v deletes everything
`-v` removes named volumes. This deletes:
- `pgdata` — the entire PostgreSQL database (users, games, maps, battleplans, everything)
- `redisdata` — Redis persistence (sessions, refresh tokens)

Code, `.env`, and upload files on disk are NOT affected. After `down -v` you must re-run `db:generate`, `db:migrate`, `db:seed`.

### Email links point to wrong URL
Email links (verify, reset password) use `APP_URL` from `.env`. This must point to the **frontend** (e.g. `https://tactihub.de` or `http://localhost:5173`), NOT the API server (port 3001). The logo in emails is also loaded from `APP_URL/tactihub_logo.png`.

### SMTP email not sending
The email service reads `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` from env.
- Port 465 → `SMTP_SECURE=true` (SSL)
- Port 587 → `SMTP_SECURE=false` (STARTTLS, default)
- If `SMTP_SECURE` is not set, it auto-detects: `true` if port is 465, `false` otherwise
- `SMTP_FROM` must be set, some providers require it to match the authenticated user

### Server must be running for client to work
The Vite dev client proxies all `/api/*` and `/socket.io` requests to `localhost:3001`. If the server is not running, you get `ECONNREFUSED` errors and no data loads. Always start the server before/alongside the client.

---

## Versioning

- Version is defined in two places: `package.json` (root) and `APP_VERSION` in `packages/shared/src/constants/index.ts`
- Both must be kept in sync when bumping versions
- Version is displayed in the footer (AppLayout) and Impressum page
- Version history is maintained in the Impressum page component

---

## API Endpoints Overview

### Auth: `/api/auth/`
POST register, login, logout, refresh, forgot-password, reset-password, change-credentials, request-deletion, request-magic-link
GET verify-email, confirm-deletion, magic-login, me, registration-status (public), recaptcha-key (public)

### Admin Users: `/api/admin/users/`
GET (paginated), PUT/:id/role, PUT/:id/verify (manual email verification + notification), PUT/:id/reactivate, DELETE/:id

### Public: `/api/`
GET games, games/:slug, games/:slug/maps/:mapSlug, games/:slug/operators, games/:slug/gadgets

### Battleplans: `/api/battleplans/`
GET (public, paginated), GET mine, POST create, GET/:id (optionalAuth), PUT/:id, DELETE/:id, POST/:id/copy, POST/:id/vote

### Draws: `/api/`
POST battleplan-floors/:id/draws (batch), PUT draws/:id, DELETE draws/:id (soft delete)

### Rooms: `/api/rooms/`
POST create (supports gameId+mapId for auto-battleplan), GET/:connString (optionalAuth), PUT/:connString/battleplan, DELETE/:connString

### Admin: `/api/admin/`
Full CRUD for games, maps, map-floors, operators, gadgets, operator-gadgets, users, tokens, settings, stats

---

## Client Routes

| Path | Page | Auth |
|------|------|------|
| `/` | HomePage | Public |
| `/sandbox` | SandboxPage | Public |
| `/help` | HelpPage | Public |
| `/faq` | FAQPage | Public |
| `/impressum` | ImpressumPage | Public |
| `/:gameSlug` | GameDashboard | Public |
| `/:gameSlug/plans/public` | PublicPlansPage | Public |
| `/:gameSlug/plans/:planId` | BattleplanViewer | Public (optionalAuth on server) |
| `/:gameSlug/plans` | MyPlansPage | Protected |
| `/room/create` | CreateRoomPage | Protected |
| `/room/:connectionString` | RoomPage | Public (guests read-only) |
| `/account` | AccountSettingsPage | Protected |
| `/auth/confirm-deletion/:token` | ConfirmDeletionPage | Public |
| `/auth/magic-link` | MagicLinkRequestPage | Public |
| `/auth/magic-login/:token` | MagicLinkLoginPage | Public |
| `/admin/maps/:mapId/floors` | FloorsPage | Admin only |
| `/admin/*` | Admin pages | Admin only |
