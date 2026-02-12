# CLAUDE.md — TactiHub Project Guide

This file provides context for AI assistants working on the TactiHub codebase.

---

## What is TactiHub?

TactiHub is a real-time collaborative strategy planning tool for competitive games (Rainbow Six Siege, Valorant, etc.). Users can draw tactics on game maps, save/share battle plans, and collaborate in rooms with live cursors and drawing sync.

**Author**: Niklas Kronig
**Version**: 1.3.0
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

### Canvas System (3 layers per floor)
1. **Background layer** — Map floor image
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
1. Register → email verification sent → must verify before login
2. Registration flow adapts: if public reg is ON, no token needed; if OFF, user must enter a single-use registration token first
3. Login → accepts username OR email via `identifier` field → access token (15min) + refresh token (7d httpOnly cookie + Redis)
4. First login with default admin email (`admin@tactihub.local`) forces credential change (gaming-style modal)
5. Token refresh → POST /api/auth/refresh returns new access token
6. Admin can toggle public registration and create invite tokens
7. **Admin manual verification**: PUT /api/admin/users/:id/verify — verifies a user without email, sends notification email
8. **Guests**: Socket connects without token → userId = `guest-{socketId}`, drawing events blocked server-side

### Socket.IO Events
- Client emits: `room:join`, `room:leave`, `cursor:move`, `draw:create`, `draw:delete`, `draw:update`, `operator-slot:update`, `battleplan:change`
- Server emits: `room:joined`, `room:user-joined`, `room:user-left`, `cursor:moved`, `draw:created`, `draw:deleted`, `draw:updated`, `operator-slot:updated`, `battleplan:changed`
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
- `Tool` enum is in `src/types/canvas.ts`
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
pnpm db:studio              # Open Drizzle Studio
docker compose up -d        # Start PostgreSQL + Redis
docker compose down         # Stop containers (data stays in volumes)
docker compose down -v      # Stop + delete ALL data (pgdata + redisdata volumes)
```

---

## Development Notes

- Vite dev server proxies `/api` and `/socket.io` to localhost:3001
- The client uses `tsc -b` (project references) for build — `shared` must have `composite: true`
- `tsconfig.node.json` in client is for vite.config.ts only
- `noUnusedLocals` and `noUnusedParameters` are enabled in client — remove unused imports
- Seed data includes: 1 admin user, 2 games (R6 + Valorant), maps with floors, operators/agents, gadgets/abilities
- Admin login after seed: `admin` / `admin@tactihub.local` / `changeme` (forced credential change on first login)
- Upload directory structure: `uploads/{games,maps,operators,gadgets}/`
- Images uploaded via admin panel are processed by Sharp (resized, converted to WebP)
- `processUpload()` returns `null` for empty file buffers (e.g. form submits without selecting a file) — callers skip processing
- Radix UI Switch sends "on" in FormData, not "true" — client normalizes to "true"/"false" before sending
- Admin floor management: `/admin/maps/:mapId/floors` — upload floor layout images per map

---

## Known Gotchas / Deployment Notes

### Vite dev server only listens on localhost
Even with `host: true` in `vite.config.ts`, Vite may ignore it. To expose to the network:
```bash
pnpm --filter @tactihub/client exec vite --host
```
Or start server and client in separate terminals:
```bash
# Terminal 1 — Backend
pnpm --filter @tactihub/server dev
# Terminal 2 — Frontend (network-accessible)
pnpm --filter @tactihub/client exec vite --host
```

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

### SMTP email not sending
The email service reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` from env.
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
POST register, login, logout, refresh, forgot-password, reset-password, change-credentials
GET verify-email/:token, me, registration-status (public)

### Admin Users: `/api/admin/users/`
GET (paginated), PUT/:id/role, PUT/:id/verify (manual email verification + notification), DELETE/:id

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
| `/admin/maps/:mapId/floors` | FloorsPage | Admin only |
| `/admin/*` | Admin pages | Admin only |
