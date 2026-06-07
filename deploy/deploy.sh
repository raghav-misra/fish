#!/bin/bash
# Run on the VM: sudo bash /opt/fish/deploy/deploy.sh
set -e

cd /opt/fish

echo "⬇️  Pulling latest..."
git pull

echo "📦 Installing deps..."
pnpm install

echo "🔨 Building shared..."
pnpm --filter @fish/shared build

echo "🔄 Restarting server..."
sudo systemctl restart fish-server

echo "✅ Deployed! Checking status..."
sleep 2
systemctl is-active fish-server
