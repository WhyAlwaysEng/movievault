#!/bin/bash
# MovieVault OrangePi Production Startup Script
# Optimize for ARM low-power single board computers

set -e

export NODE_ENV=production
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}

# Ensure data directories exist
mkdir -p data/db data/media data/actresses data/backups

echo "================================================"
echo " Starting MovieVault on OrangePi (ARM)"
echo " Port: $PORT"
echo " Data dir: $(pwd)/data"
echo "================================================"

# Run using standalone output if built, or fallback to next start
if [ -f ".next/standalone/server.js" ]; then
  echo "Using standalone server (.next/standalone/server.js)..."
  node .next/standalone/server.js
else
  echo "Standalone server not found. Starting with npm start..."
  npm run start
fi