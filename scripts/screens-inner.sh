#!/usr/bin/env bash
# Runs under the API's with-worker runner (BASE_URL = the API). Not for direct
# use: see scripts/screens.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
# The API runner exports a TypeScript loader for its own steps; the web app
# and Playwright must not inherit it.
unset NODE_OPTIONS

BEARER="test:walker-demo"
WEB_URL="http://localhost:${WEB_PORT:-5199}"
export WEB_URL

API_URL="$BASE_URL" SEED_BEARER="$BEARER" node scripts/seed-demo.mjs

# setsid gives the dev server its own process group so the trap stops all of it.
API_BASE_URL="$BASE_URL" API_DEV_BEARER="$BEARER" \
	setsid npx vite dev --port "${WEB_PORT:-5199}" --strictPort > e2e/web-dev.log 2>&1 &
web_pid=$!
trap 'kill -- -"$web_pid" 2>/dev/null || true' EXIT

for _ in $(seq 1 90); do
	curl -fsS -o /dev/null "$WEB_URL/" 2>/dev/null && break
	sleep 1
done
curl -fsS -o /dev/null "$WEB_URL/" || { echo "web app did not start; see e2e/web-dev.log" >&2; exit 1; }

# shellcheck disable=SC2086
# Chromium formats native date and time inputs in the operating system's
# locale, not the page's lang, so run it as a British machine would.
LANG=en_GB.UTF-8 LC_ALL=en_GB.UTF-8 LANGUAGE=en_GB npx playwright test ${PW_ARGS:-}
