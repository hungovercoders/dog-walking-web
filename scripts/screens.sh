#!/usr/bin/env bash
# Seed the pinned API with a demo week, start the web app against it, and run
# the Playwright screenshot and accessibility specs. Screenshots land in
# e2e/screenshots/. Used by `task screens` and the CI `screens` job.
#
#   API_PORT  port for the API worker (default 8787)
#   WEB_PORT  port for the web dev server (default 5199)
#   PW_ARGS   extra arguments for `playwright test` (e.g. "e2e/screens.spec.ts")
set -euo pipefail
cd "$(dirname "$0")/.."
root=$PWD

repo=$(awk '$1=="repo:"{print $2}' e2e/api.lock)
sha=$(awk '$1=="sha:"{print $2}' e2e/api.lock)
[ -n "$repo" ] && [ -n "$sha" ] || { echo "e2e/api.lock needs repo: and sha:" >&2; exit 1; }

# The pinned API in .api/ (CI checks it out with actions/checkout first; locally
# it is fetched here). Re-fetched whenever the lock moves.
if [ "$(git -C .api rev-parse HEAD 2>/dev/null || true)" != "$sha" ]; then
	rm -rf .api && git init -q .api
	git -C .api remote add origin "https://github.com/$repo"
	git -C .api fetch -q --depth 1 origin "$sha"
	git -C .api checkout -q FETCH_HEAD
	echo "checked out $repo@$sha into .api/"
fi
[ -d .api/node_modules ] || (cd .api && npm ci --no-audit --no-fund)

export API_PORT="${API_PORT:-8787}" WEB_PORT="${WEB_PORT:-5199}"
mkdir -p e2e/screenshots
# The API's own runner starts its worker in test auth mode on a fresh local
# D1 and runs our inner script with BASE_URL pointing at it.
(cd .api && WORKER_PORT="$API_PORT" node scripts/with-worker.mjs -- bash "$root/scripts/screens-inner.sh")
