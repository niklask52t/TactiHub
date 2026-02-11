# CLAUDE.md — StratHub Project Guide

This file provides context for AI assistants working on the StratHub codebase.

---

## What is StratHub?

StratHub is a real-time collaborative strategy planning tool for competitive games (Rainbow Six Siege, Valorant, etc.). Users can draw tactics on game maps, save/share battle plans, and collaborate in rooms with live cursors and drawing sync.

**Author**: Niklas Kronig
**Based on**: [r6-map-planner](https://github.com/prayansh/r6-map-planner) (Node/Express/Socket.IO) and [r6-maps](https://github.com/jayfoe/r6-maps) (Laravel/Vue)

---

## Repository Structure

This is a **pnpm monorepo** with 3 packages:

```
packages/
  shared/   → @strathub/shared  — TypeScript types, enums, constants
  server/   → @strathub/server  — Fastify 5 API + Socket.IO 4.8
  client/   → @strathub/client  — React 19 + Vite 6 SPA
```

### Package Dependencies
- `shared` has no internal dependencies (standalone types)
- `server` depends on `shared` (workspace:*)
- `client` depends on `shared` (workspace:*)
- Always build `shared` first: `pnpm --filter @strathub/shared build`

---

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.7 (strict mode)
- **Package Manager**: pnpm with workspaces
- **Frontend**: React 19, Vite 6, Tailwind CSS v4 (CSS-based config, NOT tailwind.config.js), shadcn/ui, Zustand, TanStack Query, React Router 7, react-hook-form + zod
- **Backend**: Fastify 5 with plugins (@fastify/cors, @fastify/cookie, @fastify/multipart, @fastify/rate-limit, @fastify/static)
- **Database**: PostgreSQL 16 via Drizzle ORM (drizzle-kit for migrations)
- **Cache/Sessions**: Redis 7 via ioredis
- **Realtime**: Socket.IO 4.8 (JWT auth at handshake)
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

### Auth Flow
1. Register → email verification sent → must verify before login
2. Login → access token (15min) + refresh token (7d httpOnly cookie + Redis)
3. Token refresh → POST /api/auth/refresh returns new access token
4. Admin can toggle public registration and create invite tokens

### Socket.IO Events
- Client emits: `room:join`, `room:leave`, `cursor:move`, `draw:create`, `draw:delete`, `draw:update`, `operator-slot:update`, `battleplan:change`
- Server emits: `room:joined`, `room:user-joined`, `room:user-left`, `cursor:moved`, `draw:created`, `draw:deleted`, `draw:updated`, `operator-slot:updated`, `battleplan:changed`
- 10 colors in pool, assigned to users on room join

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

### Shared
- Types in `src/types/` (auth, game, battleplan, room, admin, api, canvas)
- Constants in `src/constants/index.ts`
- `Tool` enum is in `src/types/canvas.ts`
- Barrel export from `src/index.ts` (uses `export type *` for type-only re-exports)

---

## Theme / Design

- **Dark mode only** (class="dark" on html element)
- **Brand colors**: Orange/Red primary (#fd7100 → #da2c00), Dark blue-grays (#c3c9cc → #3c4653)
- **CSS**: Tailwind v4 with CSS theme variables in `src/index.css` using oklch color space
- **Logo**: `public/strathub_logo.png` (icon + text), `public/strathub_icon.png` (icon only, used as favicon)

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
docker compose down -v      # Stop + delete all data
```

---

## Development Notes

- Vite dev server proxies `/api` and `/socket.io` to localhost:3001
- The client uses `tsc -b` (project references) for build — `shared` must have `composite: true`
- `tsconfig.node.json` in client is for vite.config.ts only
- `noUnusedLocals` and `noUnusedParameters` are enabled in client — remove unused imports
- Seed data includes: 1 admin user, 2 games (R6 + Valorant), maps with floors, operators/agents, gadgets/abilities
- Admin login after seed: `admin` / `admin@strathub.local` / `changeme`
- Upload directory structure: `uploads/{games,maps,operators,gadgets}/`
- Images uploaded via admin panel are processed by Sharp (resized, converted to WebP)

---

## API Endpoints Overview

### Auth: `/api/auth/`
POST register, login, logout, refresh, forgot-password, reset-password
GET verify-email/:token, me

### Public: `/api/`
GET games, games/:slug, games/:slug/maps/:mapSlug, games/:slug/operators, games/:slug/gadgets

### Battleplans: `/api/battleplans/`
GET (public, paginated), GET mine, POST create, GET/:id, PUT/:id, DELETE/:id, POST/:id/copy, POST/:id/vote

### Draws: `/api/`
POST battleplan-floors/:id/draws (batch), PUT draws/:id, DELETE draws/:id (soft delete)

### Rooms: `/api/rooms/`
POST create, GET/:connString, PUT/:connString/battleplan, DELETE/:connString

### Admin: `/api/admin/`
Full CRUD for games, maps, map-floors, operators, gadgets, operator-gadgets, users, tokens, settings, stats
