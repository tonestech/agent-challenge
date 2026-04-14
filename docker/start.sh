#!/usr/bin/env bash
set -uo pipefail

ELIZA_PID=""
SIDECAR_PID=""

cleanup() {
  local exit_code=$?
  echo "[start.sh] Shutdown signal received (exit=$exit_code) — stopping children"
  if [[ -n "$ELIZA_PID" ]] && kill -0 "$ELIZA_PID" 2>/dev/null; then
    kill -TERM "$ELIZA_PID" 2>/dev/null || true
  fi
  if [[ -n "$SIDECAR_PID" ]] && kill -0 "$SIDECAR_PID" 2>/dev/null; then
    kill -TERM "$SIDECAR_PID" 2>/dev/null || true
  fi
  sleep 2
  exit "$exit_code"
}

trap cleanup SIGTERM SIGINT EXIT

echo "[start.sh] Scout container starting"
echo "[start.sh] sidecar on :${SIDECAR_PORT:-3001} (UI + API, exposed)"
echo "[start.sh] eliza on :${SERVER_PORT:-3000} (chat)"

# Start sidecar first (boots in <2s)
npx tsx src/sidecar.ts &
SIDECAR_PID=$!
echo "[start.sh] sidecar PID=$SIDECAR_PID"

# Small gap so sidecar logs don't interleave with eliza's
sleep 1

# Start eliza (boots in ~30-45s)
npx elizaos start &
ELIZA_PID=$!
echo "[start.sh] eliza PID=$ELIZA_PID"

# wait -n returns when ANY child exits. Requires bash 4.3+ (alpine bash >= 5).
wait -n "$SIDECAR_PID" "$ELIZA_PID"
EXIT_CODE=$?
echo "[start.sh] A child exited with code $EXIT_CODE — triggering full shutdown"
exit "$EXIT_CODE"
