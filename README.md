# Fish

> **Live:** [fish.raghavmisra.dev](https://fish.raghavmisra.dev)

Online multiplayer Fish (Literature). 6 players, 2 teams, real-time via WebSockets.

## Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node, Fastify, Socket.IO
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

First-time setup:
```bash
gcloud compute ssh fish-server --zone=us-central1-a
sudo bash /opt/fish/deploy/setup.sh
# Edit /opt/fish/apps/server/.env with your GAME_KEY, ADMIN_TOKEN, CORS_ORIGINS
sudo systemctl restart fish-server
```

Subsequent deploys are automatic via GitHub Actions on push to `master` (when `apps/server/` or `packages/shared/` change).

Manual deploy:
```bash
sudo bash /opt/fish/deploy/deploy.sh
```

### Frontend (Netlify)

Auto-deploys on push to `master`. Set env var:
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
