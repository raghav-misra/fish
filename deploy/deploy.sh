#!/bin/bash
# Fish game server deploy script.
# Handles both first-time setup and subsequent deploys.
# Run on the VM: sudo bash /opt/fish/deploy/deploy.sh
set -e

REPO_DIR="/opt/fish"
SERVICE_NAME="fish-server"
CADDY_CONFIG="/etc/caddy/Caddyfile"

# ─── First-time dependencies (idempotent) ───────────────────────────────────

if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  corepack enable
fi

if ! command -v caddy &> /dev/null; then
  echo "📦 Installing Caddy..."
  apt-get install -y caddy
fi

if ! command -v redis-server &> /dev/null; then
  echo "📦 Installing Redis..."
  apt-get install -y redis-server
fi

# ─── Clone or pull ───────────────────────────────────────────────────────────

if [ ! -d "$REPO_DIR" ]; then
  echo "📥 Cloning repository..."
  apt-get install -y git
  git clone https://github.com/raghav-misra/fish.git "$REPO_DIR"
fi

cd "$REPO_DIR"

echo "⬇️  Pulling latest..."
git pull

# ─── Create .env if missing ─────────────────────────────────────────────────

if [ ! -f apps/server/.env ]; then
  cp apps/server/.env.example apps/server/.env
  echo "⚠️  Created apps/server/.env — edit it to set GAME_KEY, ADMIN_TOKEN, CORS_ORIGINS"
  echo "   Then re-run: sudo bash /opt/fish/deploy/deploy.sh"
  exit 0
fi

# ─── Build ───────────────────────────────────────────────────────────────────

echo "📦 Installing dependencies..."
pnpm install

echo "🔨 Building shared..."
pnpm --filter @fish/shared build

echo "🔨 Building server..."
pnpm --filter @fish/server build

# ─── Sync config files ───────────────────────────────────────────────────────

echo "📋 Syncing Caddyfile..."
if ! diff -q deploy/Caddyfile "$CADDY_CONFIG" > /dev/null 2>&1; then
  cp deploy/Caddyfile "$CADDY_CONFIG"
  echo "   Caddyfile updated, reloading Caddy..."
  systemctl reload caddy
else
  echo "   Caddyfile unchanged."
fi

echo "📋 Syncing systemd service..."
if ! diff -q deploy/fish-server.service /etc/systemd/system/fish-server.service > /dev/null 2>&1; then
  cp deploy/fish-server.service /etc/systemd/system/fish-server.service
  systemctl daemon-reload
  echo "   Service file updated."
fi

systemctl enable "$SERVICE_NAME" 2>/dev/null || true

# ─── Restart ─────────────────────────────────────────────────────────────────

echo "🔄 Restarting $SERVICE_NAME..."
systemctl restart "$SERVICE_NAME"

sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "✅ Deployed successfully! Server is running."
else
  echo "❌ Server failed to start. Check logs:"
  echo "   journalctl -u $SERVICE_NAME -n 20"
  exit 1
fi
