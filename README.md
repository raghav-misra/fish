# Fish

> **Live:** [fish.raghavmisra.dev](https://fish.raghavmisra.dev)

Online multiplayer Fish (Literature). 6 players, 2 teams, real-time via WebSockets.

## Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node, Fastify, Socket.IO
- **Persistence:** Redis (room state survives restarts)
- **Infra:** GCE VM, Caddy (auto-HTTPS), systemd, GitHub Actions CI
- **Frontend hosting:** Netlify

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
pnpm lint        # eslint strict
pnpm typecheck   # tsc --noEmit across all packages
```

## Deployment

### Server (GCE VM)

```bash
gcloud compute ssh fish-server --zone=us-central1-a
sudo bash /opt/fish/deploy/deploy.sh
```

On first run it installs Node, Caddy, Redis, and creates `.env` for you to edit. On subsequent runs it pulls, builds, syncs configs, and restarts the service.

Auto-deploys via GitHub Actions on push to `master` (when `apps/server/` or `packages/shared/` change).

### Frontend (Netlify)

Auto-deploys on push to `master`. Set env var:
- `VITE_SERVER_URL=https://fish-api.raghavmisra.dev`

## Environment Variables

### Server (`apps/server/.env`)

- `PORT` - Server port (default: 3000)
- `HOST` - Bind address (default: 0.0.0.0)
- `CORS_ORIGINS` - Comma-separated allowed origins (required in prod)
- `ADMIN_TOKEN` - Secret for the admin testing API (required in prod)
- `GAME_KEY` - Site-wide access key (empty = no gate)
- `REDIS_URL` - Redis connection (default: redis://localhost:6379)

### Frontend (`apps/web/.env`)

- `VITE_SERVER_URL` - Backend URL (default: http://localhost:3000)
