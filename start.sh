#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  DREAM_JOURNAL — proxy launcher
#  Starts the local Claude proxy at localhost:8082
#  Usage: ./start.sh          (or  bash start.sh)
# ═══════════════════════════════════════════════════════════════════

PORT=8082

# Check if something is already bound to the port
if lsof -i :"$PORT" -sTCP:LISTEN -t &>/dev/null 2>&1 || \
   ss -tlnH "sport = :$PORT" 2>/dev/null | grep -q .; then
  echo "[proxy] Port $PORT is already in use — proxy may already be running."
  echo "[proxy] If it isn't, kill the occupying process and re-run this script."
  exit 0
fi

echo "[proxy] Starting Claude proxy on port $PORT..."
uv run uvicorn server:app --host 0.0.0.0 --port "$PORT"
