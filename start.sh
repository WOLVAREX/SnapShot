#!/bin/bash
set -e

# Build and start the API server in the background
echo "Building API server..."
cd artifacts/api-server && PORT=8080 pnpm run dev &
API_PID=$!

# Wait for API server to be ready
echo "Waiting for API server on port 8080..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "API server is ready"
    break
  fi
  sleep 1
done

# Start the frontend
echo "Starting frontend..."
cd /home/runner/workspace/artifacts/screenshot-tool
PORT=5000 BASE_PATH=/ node node_modules/vite/bin/vite.js --config vite.config.ts --host 0.0.0.0

# If frontend exits, kill the API server
kill $API_PID 2>/dev/null || true
