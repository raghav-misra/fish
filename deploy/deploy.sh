#!/bin/bash
# Automated deploy script for Fish game server.
# Run on the VM: sudo bash /opt/fish/deploy/deploy.sh
set -e

REPO_DIR="/opt/fish"
SERVICE_NAME="fish-server"
CADDY_CONFIG="/etc/caddy/Caddyfile"

cd "$REPO_DIR"

echo "⬇️  Pulling latest..."
git pull

echo "📦 Installing dependencies..."
pnpm install

echo "🔨 Building shared package..."
pnpm --filter @fish/shared build

echo "🔨 Building server..."
pnpm --filter @fish/server build

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
