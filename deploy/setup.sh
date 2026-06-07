#!/bin/bash
# First-time VM setup for Fish game server.
# Run as root on a fresh Debian 12 / Ubuntu 24 VM.
set -e

echo "=== Fish Server Setup ==="

# 1. Install system dependencies
echo "📦 Installing Node.js 22, Caddy, and git..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs caddy git
corepack enable

# 2. Clone repo (skip if already present)
REPO_DIR="/opt/fish"
if [ ! -d "$REPO_DIR" ]; then
  echo "📥 Cloning repository..."
  git clone https://github.com/raghav-misra/fish.git "$REPO_DIR"
else
  echo "   Repo already exists at $REPO_DIR"
fi

cd "$REPO_DIR"

# 3. Install JS dependencies
echo "📦 Installing pnpm dependencies..."
pnpm install

# 4. Build shared package
echo "🔨 Building shared..."
pnpm --filter @fish/shared build

# 5. Create .env if it doesn't exist
if [ ! -f apps/server/.env ]; then
  cp apps/server/.env.example apps/server/.env
  echo "⚠️  Created apps/server/.env — edit it now to set GAME_KEY, ADMIN_TOKEN, CORS_ORIGINS"
  echo "   Then re-run this script or run: sudo bash deploy/deploy.sh"
  exit 0
fi

# 6. Install systemd service
echo "📋 Installing systemd service..."
cp deploy/fish-server.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable fish-server

# 7. Install Caddyfile
echo "📋 Installing Caddyfile..."
cp deploy/Caddyfile /etc/caddy/Caddyfile
systemctl restart caddy

# 8. Start the server
echo "🚀 Starting fish-server..."
systemctl start fish-server

sleep 2
if systemctl is-active --quiet fish-server; then
  echo ""
  echo "✅ Setup complete! Server is running."
  echo "   Logs: journalctl -u fish-server -f"
  echo "   Deploy: sudo bash /opt/fish/deploy/deploy.sh"
else
  echo "❌ Server failed to start. Check: journalctl -u fish-server -n 20"
  exit 1
fi
