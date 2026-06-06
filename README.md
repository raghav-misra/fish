# Fish

Online multiplayer Fish — room-based play with live video/voice chat.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind v4 + Zustand
- **Backend:** Node + Fastify + Socket.IO
- **Shared types:** Zod schemas + socket event contracts, used by both apps
- **Video/voice:** LiveKit Cloud or Daily (wired in later)

## Develop

```bash
pnpm install
pnpm dev      # runs web + server together
```

- Web: http://localhost:5173
- Server: http://localhost:3000 (health at `/health`)

Copy the `.env.example` files in each app before running.

## Deploy

- **Frontend** → Vercel or Netlify. Point `VITE_SERVER_URL` at the server's HTTPS URL.
- **Server** → a VM behind Caddy for TLS. Set `CORS_ORIGINS` to your frontend origin; run it with the included systemd unit or Dockerfile.
- **Video** → LiveKit Cloud or Daily; the server mints access tokens.
