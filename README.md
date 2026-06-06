# Fish

Online multiplayer card game with room-based play and live video/voice chat.

## Stack

| Layer            | Tech                                                      |
| ---------------- | -------------------------------------------------------- |
| Frontend         | React + TypeScript + Vite + Tailwind v4 + Zustand        |
| Realtime backend | Node + Fastify + Socket.IO                               |
| Shared types     | `@fish/shared` (Zod schemas + socket event contracts)    |
| Video / voice    | LiveKit Cloud or Daily (managed) — wired in later        |

## Layout

```
fish/
├── packages/
│   └── shared/        # Types, Zod schemas, socket event contracts (used by both apps)
├── apps/
│   ├── web/           # React client (deploy to Vercel / Netlify)
│   └── server/        # Fastify + Socket.IO (deploy to Compute Engine VM)
└── deploy/
    ├── Caddyfile          # Auto-HTTPS reverse proxy for the VM
    └── fish-server.service# systemd unit to keep the server running
```

## Develop

```bash
pnpm install
pnpm build:shared        # build shared types once (or run pnpm dev which watches)
pnpm dev                 # runs web + server together
```

- Web:    http://localhost:5173
- Server: http://localhost:3000 (health check at /health)

Copy the example env files before running:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

## Deploy

- **Frontend** → Vercel or Netlify. Set `VITE_SERVER_URL` to your VM's HTTPS URL
  (e.g. `https://api.yourdomain.com`).
- **Server** → Compute Engine VM behind Caddy (TLS). Set `CORS_ORIGINS` to your
  frontend origin. Use the systemd unit (or the Dockerfile) to run it.
- **Video** → LiveKit Cloud / Daily; the server mints access tokens.
```
