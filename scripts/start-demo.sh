#!/usr/bin/env bash
# start-demo.sh — one-command BUNQSY demo launcher
# Usage: bash scripts/start-demo.sh
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
cd "$ROOT"

echo ""
echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║        BUNQSY  —  bunq Hackathon 7.0         ║${NC}"
echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Validate .env ──────────────────────────────────────────────────────────
if [[ ! -f ".env" ]]; then
  echo -e "${RED}❌  .env not found. Copy .env.example and fill in your keys.${NC}"
  exit 1
fi

# Safely export only KEY=VALUE lines (skip blanks and comments)
set -o allexport
# shellcheck disable=SC2046
eval $(grep -v '^[[:space:]]*#' .env | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*=[[:space:]]*/=/')
set +o allexport

[[ -z "${BUNQ_API_KEY:-}"      ]] && { echo -e "${RED}❌  BUNQ_API_KEY missing from .env${NC}";      exit 1; }
[[ -z "${ANTHROPIC_API_KEY:-}" ]] && { echo -e "${RED}❌  ANTHROPIC_API_KEY missing from .env${NC}"; exit 1; }
[[ -z "${ELEVENLABS_API_KEY:-}"]] && echo -e "${YELLOW}⚠   ELEVENLABS_API_KEY not set — voice disabled${NC}"
echo -e "${GREEN}✓  .env validated${NC}"

# ── 2. Kill stale processes ───────────────────────────────────────────────────
DAEMON_PORT="${PORT:-3001}"
WS="${WS_PORT:-3002}"

_kill_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo -e "${YELLOW}↺  Freeing port ${port}${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 0.4
  fi
}

_kill_port "$DAEMON_PORT"
_kill_port "$WS"
_kill_port 5173
_kill_port 5174

# ── 3. Start daemon ───────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}▶  Starting daemon (port ${DAEMON_PORT})...${NC}"
npm run dev --workspace=packages/daemon > /tmp/bunqsy-daemon.log 2>&1 &
DAEMON_PID=$!

echo -n "   Waiting for daemon"
READY=0
for i in $(seq 1 30); do
  sleep 1
  echo -n "."
  if curl -sf "http://localhost:${DAEMON_PORT}/api/score" > /dev/null 2>&1; then
    READY=1; break
  fi
done
echo ""

if [[ $READY -eq 0 ]]; then
  echo -e "${RED}❌  Daemon did not start within 30 s.${NC}"
  echo -e "    Check logs: ${BOLD}tail -f /tmp/bunqsy-daemon.log${NC}"
  kill "$DAEMON_PID" 2>/dev/null || true
  exit 1
fi
echo -e "${GREEN}✓  Daemon healthy on :${DAEMON_PORT}${NC}"

# ── 4. Start frontend ─────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}▶  Starting frontend (Vite)...${NC}"
npm run dev --workspace=packages/frontend > /tmp/bunqsy-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 4
FRONTEND_PORT=5173
curl -sf "http://localhost:5173" > /dev/null 2>&1 || FRONTEND_PORT=5174
echo -e "${GREEN}✓  Frontend ready on :${FRONTEND_PORT}${NC}"

# ── 5. Ready banner ───────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  🚀  BUNQSY is live                                      ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
printf "${GREEN}${BOLD}║${NC}  Dashboard   →  ${BOLD}http://localhost:${FRONTEND_PORT}${NC}\n"
printf "${GREEN}${BOLD}║${NC}  Daemon API  →  http://localhost:${DAEMON_PORT}\n"
printf "${GREEN}${BOLD}║${NC}  WebSocket   →  ws://localhost:${WS}\n"
[[ -n "${WEBHOOK_PUBLIC_URL:-}" ]] && printf "${GREEN}${BOLD}║${NC}  Webhook     →  ${WEBHOOK_PUBLIC_URL}\n"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Daemon logs  →  tail -f /tmp/bunqsy-daemon.log"
echo -e "${GREEN}${BOLD}║${NC}  Seed data    →  npx tsx scripts/seed-demo.ts"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Press ${RED}${BOLD}Ctrl+C${NC} to stop everything."
echo ""

# ── 6. Cleanup on exit ────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping BUNQSY...${NC}"
  kill "$DAEMON_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo -e "${GREEN}Stopped.${NC}"
}
trap cleanup EXIT INT TERM

wait
