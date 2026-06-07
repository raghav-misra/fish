# Fish

> **Live:** [fish.raghavmisra.dev](https://fish.raghavmisra.dev)

Online multiplayer Fish (Literature) — a 6-player team card game with real-time WebSocket gameplay.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind v4, Zustand, Framer Motion |
| Backend | Node 22, Fastify, Socket.IO |
| Shared | Zod schemas + typed Socket.IO event contracts (`@fish/shared`) |
| Infra | GCE VM (Debian), Caddy (auto-HTTPS), systemd, GitHub Actions CI |
| Frontend hosting | Netlify (static deploy from `apps/web`) |
| Voice/Video | **TODO** — planned via LiveKit or Daily |

## Monorepo Structure

```
packages/shared/   — Card types, game logic types, socket event schemas
apps/server/       — Fastify + Socket.IO game server
apps/web/          — React SPA
deploy/            — systemd unit, Caddyfile, deploy/setup scripts
.github/workflows/ — CI: auto-deploy server on push to master
```

## Local Development

```bash
pnpm install
cp apps/server/.env.example apps/server/.env   # edit GAME_KEY etc.
pnpm dev                                        # runs web + server in parallel
```

- Web: http://localhost:5173
- Server: http://localhost:3000 (health at `/health`)
- Admin CLI: `pnpm admin <command>` (fill, start, ask, call, room)

## Linting

```bash
pnpm lint        # ESLint with typescript-eslint strict
pnpm typecheck   # tsc --noEmit across all packages
```

## Deployment

### Server (GCE VM)

#### First-time setup

```bash
gcloud compute ssh fish-server --zone=us-central1-a
# On the VM:
sudo bash /opt/fish/deploy/setup.sh
# Edit /opt/fish/apps/server/.env with your GAME_KEY, ADMIN_TOKEN, CORS_ORIGINS
sudo systemctl restart fish-server
```

#### Subsequent deploys

Automatic via GitHub Actions on push to `master` (paths: `apps/server/**`, `packages/shared/**`).

Or manually:
```bash
sudo bash /opt/fish/deploy/deploy.sh
```

#### Runbook

| Task | Command |
|------|---------|
| SSH into VM | `gcloud compute ssh fish-server --zone=us-central1-a` |
| View server logs | `journalctl -u fish-server -f` |
| Restart server | `sudo systemctl restart fish-server` |
| View Caddy logs | `journalctl -u caddy -f` |
| Deploy latest | `sudo bash /opt/fish/deploy/deploy.sh` |
| Check server status | `systemctl status fish-server` |
| Edit env vars | `sudo nano /opt/fish/apps/server/.env` |

### Frontend (Netlify)

Auto-deploys on push to `master`. Environment variable:
- `VITE_SERVER_URL=https://fish-api.raghavmisra.dev`

## Environment Variables

### Server (`apps/server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `HOST` | No | Bind address (default: 0.0.0.0) |
| `CORS_ORIGINS` | Yes (prod) | Comma-separated allowed origins |
| `ADMIN_TOKEN` | Yes (prod) | Secret for the admin testing API |
| `GAME_KEY` | No | Site-wide access key (empty = no gate) |

### Frontend (`apps/web/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SERVER_URL` | Yes (prod) | Backend URL (default: http://localhost:3000) |

## TODO

- [ ] **Voice/Video chat** — LiveKit Cloud or Daily integration for in-game comms
- [ ] Live game can withstand server dying (Redis?)
