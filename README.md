# TactiHub

**Collaborative tactical strategy planning for competitive games.**

TactiHub is a real-time collaboration tool that lets teams draw tactics on game maps, create and share battle plans, and coordinate strategies together. It supports multiple games (Rainbow Six Siege, Valorant, and more) with a powerful canvas drawing system, live cursors, and persistent battle plan management.

![Version](https://img.shields.io/badge/version-1.5.0-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Node](https://img.shields.io/badge/Node.js-20+-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## Table of Contents

- [Features](#features)
- [Color Palette](#color-palette)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation (Debian 13)](#installation-debian-13)
- [Useful Commands](#useful-commands)
- [Updating](#updating)
- [Database Management](#database-management)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)
- [Map Images](#map-images)
- [Credits & Acknowledgments](#credits--acknowledgments)
- [Disclaimer](#disclaimer)

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
- **View Mode Switcher** — Toggle between Blueprint, Darkprint, and Whiteprint floor views (when available). Default is always Blueprint.
- **Compass** — SVG north indicator overlay on every canvas.
- **Sandbox Mode** — Try drawing on any map without creating an account. Drawings are local only.
- **Guest Access** — Rooms are viewable without login (read-only). Log in to draw.
- **Admin Panel** — Full CRUD management for games, maps, floors, operators, gadgets, users, and registration tokens.
- **Token-Based Registration** — Admin can toggle public registration on/off and create invite tokens for controlled access.
- **Email Verification** — New accounts must verify their email. Admins can also manually verify users from the admin panel.
- **Floor Layout Management** — Upload and manage floor layout images (blueprint, darkprint, whiteprint) per map through the admin panel with reordering support.
- **Pre-Seeded Map Images** — 165 R6 map floor images (Blueprint/Darkprint/Whiteprint) + 23 gadget icons included in the repo as WebP. Works out of the box after seeding.
- **Dark Theme** — Built with a dark color scheme matching the TactiHub brand (see color palette below).
- **Help & FAQ** — Built-in help page with tool descriptions, keyboard shortcuts, and frequently asked questions.

---

## Color Palette

The color scheme is derived from the TactiHub logo gradient and uses the [OKLCH](https://oklch.com/) color space in CSS. All colors are defined in `packages/client/src/index.css` via Tailwind v4 `@theme` variables.

| Role | Hex | OKLCH | Usage |
|------|-----|-------|-------|
| **Primary** | `#fd7100` | `oklch(0.68 0.19 45)` | Buttons, links, accents, focus rings, glow effects |
| **Primary Foreground** | `#ffffff` | `oklch(0.98 0 0)` | Text on primary-colored backgrounds |
| **Destructive** | `#da2c00` | `oklch(0.55 0.22 25)` | Error states, delete actions, warnings |
| **Background** | `#2a2f38` | `oklch(0.185 0.01 250)` | Page background |
| **Foreground** | `#c3c9cc` | `oklch(0.88 0.005 250)` | Primary text color |
| **Card** | `#323842` | `oklch(0.22 0.012 250)` | Card / dialog backgrounds |
| **Secondary / Muted** | `#3c4653` | `oklch(0.28 0.015 250)` | Secondary backgrounds, inactive badges |
| **Muted Foreground** | — | `oklch(0.65 0.01 250)` | Secondary text, labels, placeholders |
| **Border / Input** | — | `oklch(0.32 0.015 250)` | Borders, input field outlines |
| **Chart 1** | — | `oklch(0.68 0.19 45)` | Orange (matches primary) |
| **Chart 2** | — | `oklch(0.55 0.22 25)` | Red-orange (matches destructive) |
| **Chart 3** | — | `oklch(0.65 0.15 60)` | Amber |
| **Chart 4** | — | `oklch(0.65 0.15 160)` | Teal |
| **Chart 5** | — | `oklch(0.65 0.15 310)` | Purple |

> **Logo colors**: The logo uses a gradient from `#fd7100` (orange) to `#da2c00` (red-orange), with gray tones from `#c3c9cc` to `#3c4653`.

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
├── package.json                # Root workspace config (v1.3.0)
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
│   │   ├── uploads/            # Image assets (maps/ + gadgets/ tracked, games/ + operators/ gitignored)
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

**Strongly recommended:**
- **SMTP server or email service** (e.g., Gmail App Password, Brevo, Mailgun, own SMTP server) — **Users must verify their email after registration before they can log in.** Without a working SMTP setup, the admin has to manually verify every single user in the admin panel (Users > Verify).

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
- `APP_URL` — Your public frontend URL (e.g. `https://tactihub.de`). Used for links in emails and the logo. **Must point to the frontend, not the API server.**
- `JWT_SECRET` — A long random string for access tokens (`openssl rand -base64 48`)
- `JWT_REFRESH_SECRET` — A different long random string for refresh tokens (`openssl rand -base64 48`)
- `SMTP_*` — Your email server credentials (**strongly recommended** — without it, users can't verify their email and the admin must manually verify each user)

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
- **Rainbow Six Siege**: 21 maps (correct per-map floor counts with Blueprint/Darkprint/Whiteprint image paths), 42 operators, 55 gadgets (23 with pre-seeded icons)
- **Valorant**: 4 maps (2 floors each), 11 agents, 40 abilities

All R6 map floor images (165 WebP files) and gadget icons (23 WebP files) are included in the repository under `packages/server/uploads/`. They're available immediately after seeding — no extra import step needed.

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
- On first login with default credentials, you'll be forced to set a new email and password
- The seed user has email already verified. If you registered a new user, you must verify the email first (check SMTP config)

### Email links go to wrong URL / "Route not found" error

Email links (verify, reset password) use the `APP_URL` environment variable. This must point to the **frontend** (your public domain or `http://localhost:5173` for dev), NOT the API server (port 3001):

```bash
# Correct — points to frontend
APP_URL=https://tactihub.de

# Wrong — points to API server, will show "Route not found"
APP_URL=http://localhost:3001
```

### Verification emails not arriving

Check your SMTP configuration in `.env`:

```bash
SMTP_HOST=smtp.example.com     # Your SMTP server hostname
SMTP_PORT=587                   # 587 for STARTTLS, 465 for SSL
SMTP_SECURE=false               # Set to "true" for port 465 (SSL)
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
```

Common issues:
- **Port 465** requires `SMTP_SECURE=true` (SSL)
- **Port 587** uses STARTTLS — leave `SMTP_SECURE=false` (default)
- **Gmail**: Use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`
- **SMTP_FROM**: Some providers require this to match your authenticated email
- Check server logs (`pnpm --filter @tactihub/server dev`) for SMTP error messages

Test your SMTP connection:
```bash
# From the server, try sending a test email with curl
curl --url "smtp://SMTP_HOST:SMTP_PORT" --ssl-reqd \
  --mail-from "SMTP_FROM" --mail-rcpt "your@email.com" \
  --user "SMTP_USER:SMTP_PASS" \
  -T /dev/null
```

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

All R6 Siege map floor images (Blueprint, Darkprint, Whiteprint variants) and gadget icons are **pre-seeded in the repository** under `packages/server/uploads/maps/` and `packages/server/uploads/gadgets/`. After running `pnpm db:seed`, the database references these files and they work out of the box.

Additional images can be uploaded through the admin panel under Games > Maps > Floors. Admin-uploaded images override the seed paths in the database. Supported formats: PNG, JPG, WebP — all are automatically converted to WebP via Sharp.

To re-process images from an external source folder (e.g. after obtaining new map data):

```bash
pnpm --filter @tactihub/server tsx src/scripts/process-images.ts "/path/to/source/folder"
```

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
