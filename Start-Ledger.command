#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

APP_URL="http://localhost:5173/?launcher=$(date +%s)"
HEALTH_URL="http://localhost:5173/"
PID_FILE=".ledger-launcher.pid"

is_family_ledger_running() {
  curl -fsS "$HEALTH_URL" 2>/dev/null | grep -q "<title>家庭账本</title>"
}

project_port_pids() {
  lsof -tiTCP:5173 -sTCP:LISTEN 2>/dev/null || true
}

is_project_process() {
  local pid="$1"
  local process_cwd
  local process_command
  process_cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1)"
  process_command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [ "$process_cwd" = "$(pwd)" ] || [[ "$process_command" == *"$(pwd)"* ]]
}

is_managed_server_running() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  [ -n "$pid" ] || return 1
  kill -0 "$pid" >/dev/null 2>&1 && is_family_ledger_running
}

stop_project_servers() {
  local pids
  pids="$(project_port_pids)"
  [ -n "$pids" ] || return 0
  for pid in $pids; do
    if is_project_process "$pid"; then
      kill "$pid" >/dev/null 2>&1 || true
      local parent_pid
      parent_pid="$(ps -p "$pid" -o ppid= 2>/dev/null | tr -d ' ' || true)"
      if [ -n "$parent_pid" ] && is_project_process "$parent_pid"; then
        kill "$parent_pid" >/dev/null 2>&1 || true
      fi
    fi
  done
  for _ in {1..20}; do
    [ -z "$(project_port_pids)" ] && return 0
    sleep 0.2
  done
}

cleanup() {
  stop_project_servers
  rm -f "$PID_FILE"
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install Node.js LTS first, then double-click this file again:"
  echo "https://nodejs.org/"
  read -r -p "Press Enter to close..."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Reinstall Node.js LTS, then double-click this file again."
  read -r -p "Press Enter to close..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing project dependencies. This only happens the first time..."
  npm install
fi

PORT_PIDS="$(project_port_pids)"
if [ -n "$PORT_PIDS" ]; then
  if is_managed_server_running; then
    echo "Family ledger is already running. Opening browser..."
    open "$APP_URL"
    exit 0
  fi
  if is_family_ledger_running; then
    echo "Restarting orphaned family ledger server..."
    stop_project_servers
    PORT_PIDS="$(project_port_pids)"
  fi
  for PID in $PORT_PIDS; do
    if is_project_process "$PID"; then
      echo "Restarting existing family ledger server..."
      stop_project_servers
    else
      echo "Port 5173 is already used by another program. Close it first, then try again."
      read -r -p "Press Enter to close..."
      exit 1
    fi
  done
  sleep 1
fi

echo "Starting family ledger..."
trap cleanup EXIT INT TERM HUP
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort &
SERVER_PID=$!
echo "$SERVER_PID" >"$PID_FILE"

for _ in {1..30}; do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    open "$APP_URL"
    wait "$SERVER_PID"
    exit $?
  fi
  sleep 1
done

echo "The app did not start within 30 seconds. Check the messages above."
wait "$SERVER_PID"
