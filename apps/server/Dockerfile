# Optional: containerized build of the game server for the Compute Engine VM.
# (You can also just run `node dist/index.js` directly via systemd — see
# deploy/fish-server.service. The container is handy if you prefer Docker.)

# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable

# Copy workspace manifests first for better layer caching.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile=false

# Copy sources and build shared + server.
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
RUN pnpm --filter @fish/shared build && pnpm --filter @fish/server build

# Prune dev deps for a lean runtime.
RUN pnpm --filter @fish/server --prod deploy /app/out

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/out ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
