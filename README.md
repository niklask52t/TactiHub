# TactiHub

**Collaborative tactical strategy planning for competitive games.**

TactiHub is a real-time collaboration tool that lets teams draw tactics on game maps, create and share battle plans, and coordinate strategies together. It supports multiple games (Rainbow Six Siege, Valorant, and more) with a powerful canvas drawing system, live cursors, and persistent battle plan management.

![Version](https://img.shields.io/badge/version-1.2.1-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node](https://img.shields.io/badge/Node.js-20+-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## Features

- **Multi-Game Support** — Built as a generic platform. Ships with Rainbow Six Siege and Valorant data, but any game with top-down maps can be added through the admin panel.
- **Real-Time Collaboration** — Create rooms and draw together in real-time with Socket.IO. See teammates' cursors and drawings appear instantly.
- **Canvas Drawing System** — 3-layer canvas with tools for freehand pen, straight lines, rectangles, text, and operator/gadget icons.
- **Zoom + Pan** — Mouse wheel zoom centered on cursor (25%-400%), pan tool, middle-click pan, and reset button.
- **Eraser** — Click on any drawing to delete it with precise hit-testing.
- **Undo / Redo** — Ctrl+Z / Ctrl+Y keyboard shortcuts and toolbar buttons.
- **Battle Plan Management** — Save, name, and organize battle plans. Mark as public to share with the community, or keep private.
- **Share by Link** — Public toggle + share button copies a direct link. Public plans are viewable without login.
- **Voting System** — Upvote/downvote public battle plans to surface the best strategies.
- **Operator/Agent Slots** — Assign operators (R6) or agents (Valorant) to 5 slots per plan, synced in real-time.
- **Floor Switching** — Navigate multi-floor maps with keyboard shortcuts (J/K) or buttons.
- **Compass** — SVG north indicator overlay on every canvas.
- **Sandbox Mode** — Try drawing on any map without creating an account. Drawings are local only.
- **Guest Access** — Rooms are viewable without login (read-only). Log in to draw.
- **Admin Panel** — Full CRUD management for games, maps, floors, operators, gadgets, users, and registration tokens.
- **Token-Based Registration** — Admin can toggle public registration on/off and create invite tokens for controlled access.
- **Email Verification** — New accounts must verify their email. Unverified accounts are cleaned up after 30 days.
- **Dark Theme** — Built with a dark color scheme matching the TactiHub brand (orange/red + dark grays).
- **Help & FAQ** — Built-in help page with tool descriptions, keyboard shortcuts, and frequently asked questions.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + Vite | 19.0 / 6.x |
| **UI** | Tailwind CSS v4 + shadcn/ui | 4.0 |
| **State** | Zustand + TanStack Query | 5.x |
| **Routing** | React Router | 7.x |
| **Forms** | react-hook-form + zod | 7.x / 3.x |
| **Backend** | Fastify | 5.x |
| **ORM** | Drizzle ORM + drizzle-kit | 0.45+ |
| **Database** | PostgreSQL | 16 |
| **Cache** | Redis (ioredis) | 7 |
| **Realtime** | Socket.IO | 4.8 |
| **Auth** | JWT (access + refresh tokens) | — |
| **Email** | Nodemailer | 6.x |
| **Images** | Sharp | 0.33 |
| **Language** | TypeScript | 5.7 |
| **Package Manager** | pnpm (workspaces) | 10.x |
| **Containerization** | Docker Compose | — |

---

## Project Structure

```
TactiHub/
├── docker-compose.yml          # PostgreSQL 16 + Redis 7
├── package.json                # Root workspace config (v1.2.1)
├── pnpm-workspace.yaml         # Workspace definition
├── tsconfig.base.json          # Shared TypeScript config
├── .env.example                # Environment template
├── CLAUDE.md                   # AI assistant project guide
│
├── packages/
│   ├── shared/                 # @tactihub/shared — Types, constants, enums
│   │   └── src/
│   │       ├── types/          # Auth, Game, Battleplan, Room, Admin, API, Canvas
│   │       └── constants/      # Colors, defaults, limits, APP_VERSION
│   │
│   ├── server/                 # @tactihub/server — Fastify API + Socket.IO
│   │   ├── drizzle.config.ts
│   │   ├── uploads/            # User-uploaded images (gitignored)
│   │   └── src/
│   │       ├── db/
│   │       │   ├── schema/     # 11 Drizzle schema files (15 tables)
│   │       │   ├── connection.ts
│   │       │   └── seed.ts     # R6 Siege + Valorant seed data
│   │       ├── plugins/        # Fastify plugins (Redis, Auth)
│   │       ├── middleware/      # Auth middleware (requireAuth, optionalAuth, requireAdmin)
│   │       ├── routes/         # REST API routes
│   │       │   ├── admin/      # Admin CRUD endpoints (9 files)
│   │       │   ├── auth.ts     # Registration, login, JWT refresh, email verify
│   │       │   ├── games.ts    # Public game data
│   │       │   ├── battleplans.ts
│   │       │   ├── draws.ts
│   │       │   ├── rooms.ts
│   │       │   └── operator-slots.ts
│   │       ├── services/       # Business logic (auth, email, upload, cleanup)
│   │       ├── socket/         # Socket.IO handlers (room, drawing, cursor)
│   │       └── index.ts        # Server entry point
│   │
│   └── client/                 # @tactihub/client — React SPA
│       ├── public/             # Static assets (logos)
│       ├── vite.config.ts
│       └── src/
│           ├── components/
│           │   ├── ui/         # shadcn/ui components (15+)
│           │   ├── layout/     # AppLayout, AdminLayout, AuthLayout
│           │   └── auth/       # ProtectedRoute
│           ├── features/
│           │   ├── admin/      # Admin panel pages (8 pages)
│           │   ├── auth/       # Login, Register, Forgot/Reset Password, Verify Email
│           │   ├── battleplan/ # My Plans, Public Plans, Viewer (with sharing)
│           │   ├── canvas/     # CanvasView, CanvasLayer, Toolbar, Compass, hitTest
│           │   ├── game/       # Game Dashboard
│           │   ├── home/       # Landing page
│           │   ├── legal/      # Impressum, Help, FAQ
│           │   ├── room/       # Create Room (game/map flow), Room (live collaboration)
│           │   └── sandbox/    # Sandbox (local drawing without login)
│           ├── stores/         # Zustand stores (auth, canvas with viewport+history, room)
│           ├── lib/            # API client, Socket.IO client, utilities
│           └── main.tsx        # App entry point
```

---

## Requirements

- **OS**: Debian 13 (Trixie) recommended — also works on Ubuntu 22.04+, Debian 12, or any Linux with Docker support
- **Node.js** >= 20.0 (LTS recommended)
- **pnpm** >= 9.0 (`npm install -g pnpm`)
- **Docker** + **Docker Compose** (for PostgreSQL and Redis)
- **Git**

Optional (for email features in production):
- An SMTP server or email service (e.g., Gmail, SendGrid, Mailgun)

> **Proxmox LXC**: If you're running this inside a Proxmox LXC container, make sure **Nesting** is enabled in the container features (Options > Features > Nesting). For unprivileged containers, also enable **keyctl**. A privileged Debian 13 LXC with Nesting works out of the box.

---

## Installation (Debian 13)

The following steps assume a fresh **Debian 13 (Trixie)** installation or LXC container. Adjust package manager commands if you're using a different distribution.

### 1. Install system dependencies

```bash
# Update packages
apt update && apt upgrade -y

# Install essentials
apt install -y curl git ca-certificates gnupg

# Install Node.js 22 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

Verify everything is installed:

```bash
node -v    # v22.x
pnpm -v    # 10.x
docker -v  # 27.x
```

### 2. Clone the repository

```bash
git clone https://github.com/niklask52t/TactiHub.git
cd TactiHub
```

The default branch is `main`. For the latest development features, use `git checkout dev`.

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and configure at minimum:
- `JWT_SECRET` — A long random string for access tokens (`openssl rand -base64 48`)
- `JWT_REFRESH_SECRET` — A different long random string for refresh tokens (`openssl rand -base64 48`)
- `SMTP_*` — Your email server credentials (optional for development, required for registration emails)

The default database and Redis URLs work with the included Docker Compose setup.

### 4. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432` (user: `tactihub`, password: `tactihub`, db: `tactihub`)
- **Redis 7** on port `6379`

### 5. Install dependencies

```bash
pnpm install
```

### 6. Set up the database

```bash
# Generate migration files from schema
pnpm db:generate

# Run migrations to create tables
pnpm db:migrate

# Seed with initial data (admin user + R6 Siege + Valorant)
pnpm db:seed
```

The seed creates:
- **Admin account**: `admin` / `admin@tactihub.local` / `changeme`
- **Rainbow Six Siege**: 19 maps (4 floors each), 42 operators, 55 gadgets
- **Valorant**: 4 maps (2 floors each), 11 agents, 40 abilities

### 7. Start development servers

**Option A — Localhost only (single command):**

```bash
pnpm dev
```

This starts both the server (port 3001) and client (port 5173) on `localhost`.

**Option B — Network accessible (for remote servers / LXC containers):**

Open two terminals:

```bash
# Terminal 1 — Backend API
pnpm --filter @tactihub/server dev

# Terminal 2 — Frontend (exposed to network)
pnpm --filter @tactihub/client exec vite --host
```

The `--host` flag makes the Vite dev server listen on `0.0.0.0` so you can access it from other machines on your network.

The Vite dev server proxies API requests (`/api/*`) and Socket.IO to the Fastify server on port 3001 automatically.

### 8. Open the app

Navigate to `http://localhost:5173` (or `http://<server-ip>:5173` for remote access) in your browser.

Log in with the default admin credentials to access the admin panel and manage games, maps, operators, etc. The login accepts both username and email.

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Email** | `admin@tactihub.local` |
| **Password** | `changeme` |

> **Important:** Change the admin password after your first login.

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start both server and client in dev mode |
| `pnpm build` | Build all packages for production |
| `pnpm db:generate` | Generate Drizzle migration files from schema changes |
| `pnpm db:migrate` | Apply pending database migrations |
| `pnpm db:seed` | Seed the database with initial data |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |
| `docker compose up -d` | Start PostgreSQL + Redis containers |
| `docker compose down` | Stop containers (data persists in volumes) |
| `docker compose down -v` | Stop containers and **delete all data** (DB + Redis) |

---

## Updating

### Pull latest changes

```bash
git pull origin main
```

### Install new dependencies

```bash
pnpm install
```

### Apply database changes

If the schema has changed:

```bash
pnpm db:generate
pnpm db:migrate
```

### Rebuild

```bash
pnpm build
```

---

## Database Management

### Reset the database

If you need to start fresh (this **deletes all data** — users, battleplans, everything):

```bash
# Stop containers and delete volumes
docker compose down -v

# Restart containers
docker compose up -d

# Wait for PostgreSQL to be ready
sleep 3

# Re-run migrations and seed
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### Browse the database

```bash
pnpm db:studio
```

This opens Drizzle Studio at `https://local.drizzle.studio` where you can browse and edit tables visually.

---

## Troubleshooting

### "ECONNREFUSED" errors in Vite console / No data loads

The backend server is not running. The Vite client proxies all API requests to `localhost:3001`. Start the server first:

```bash
pnpm --filter @tactihub/server dev
```

### Site not accessible from other machines on the network

Vite defaults to `localhost` only. Start with `--host`:

```bash
pnpm --filter @tactihub/client exec vite --host
```

### `docker compose down -v` — What gets deleted?

| Volume | Contents | Lost? |
|--------|----------|-------|
| `pgdata` | PostgreSQL database (users, games, maps, battleplans, everything) | **Yes** |
| `redisdata` | Redis data (sessions, refresh tokens) | **Yes** |
| Code / `.env` / uploads on disk | Source code, config, uploaded images | No |

After `down -v`, re-run: `docker compose up -d && pnpm db:generate && pnpm db:migrate && pnpm db:seed`

### `db:generate` fails with "Cannot find module './users.js'"

The drizzle-kit scripts must run through `tsx`. Check that `packages/server/package.json` has:
```json
"db:generate": "tsx ./node_modules/drizzle-kit/bin.cjs generate"
```

### `db:migrate` fails with `url: undefined`

The `.env` file is in the project root, but scripts run from `packages/server/`. Make sure `drizzle.config.ts` and `connection.ts` use:
```typescript
import { config } from 'dotenv';
config({ path: '../../.env' });
```

### Login doesn't work

- The login field accepts both **username** (`admin`) and **email** (`admin@tactihub.local`)
- Default password is `changeme`
- The seed user has email already verified. If you registered a new user, you must verify the email first (check SMTP config)

---

## Production Deployment

For production, you need to:

1. Set `NODE_ENV=production` in `.env`
2. Set real `JWT_SECRET` and `JWT_REFRESH_SECRET` values (use `openssl rand -base64 48`)
3. Configure proper SMTP credentials for email verification
4. Build all packages: `pnpm build`
5. Run the server: `node packages/server/dist/index.js`
6. Serve the client build (`packages/client/dist/`) with a reverse proxy (nginx, Caddy, etc.)

---

## Map Images

Map floor images must be placed in the `packages/server/uploads/` directory structure. They can be uploaded through the admin panel under Games > Maps > Floors.

Supported image formats: PNG, JPG, WebP. Images are automatically processed and converted to WebP via Sharp.

---

## Credits & Acknowledgments

TactiHub is developed by **Niklas Kronig**.

This project is based on and inspired by two original open-source projects:

### [r6-map-planner](https://github.com/prayansh/r6-map-planner) by prayansh
A real-time collaborative map planning tool built with Node.js, Express and Socket.IO. It provided the foundation for the real-time collaboration features, live cursor tracking, color assignment, and the multi-game canvas drawing system.

### [r6-maps](https://github.com/jayfoe/r6-maps) by jayfoe
A battle plan management system built with Laravel and Vue.js. It provided the blueprint for user authentication, database persistence, battle plan CRUD, the voting system, operator management, and the admin panel architecture.

Both projects have been inactive for several years. TactiHub merges their best concepts into a modern TypeScript application with a completely rewritten codebase, updated tech stack, and additional features.

---

## Disclaimer

TactiHub is a fan-made tool and is not affiliated with, endorsed by, or connected to Ubisoft, Riot Games, or any other game publisher. All game names, logos, and related assets are trademarks of their respective owners. Map images and operator/agent icons are property of their respective game publishers and are used for informational and educational purposes only.
