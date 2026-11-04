# dog-walking-web

The walker's app: a SvelteKit site on Cloudflare Workers where a solo dog
walker keeps their clients, the clients' dogs, and the walks they schedule,
start, complete or cancel. It is a **consumer** of two specified services and
owns none of their contracts.

## The three repos

| repo | role |
| --- | --- |
| [dog-walking-spec](https://github.com/hungovercoders/dog-walking-spec) | the contracts of record: OpenAPI, AsyncAPI, Gherkin features and data contracts for the `clients` and `walks` services, gated with [sysspec](https://github.com/hungovercoders/sysspec) |
| [dog-walking-api](https://github.com/hungovercoders/dog-walking-api) | the implementation of both services (Hono on Workers, D1, Queues) |
| **dog-walking-web** (this) | the UI, built against the pinned contracts and their mocks |

`contracts.lock` names the released contract surface this app is built
against (`clients/v1.0.0`, `walks/v1.0.0`, with the commit sha of each).
`task contracts:fetch` resolves it into read-only `.contracts/<service>/`;
`task types:generate` turns the pinned OpenAPI into the TypeScript under
`src/lib/api/generated/`, which is committed so the app builds without the
fetch and CI fails when it drifts. Renovate bumps the lock when the spec repo
tags a new version; green minors auto-merge.

## Sign-in

Every page except `/sign-in` and `/sign-up` needs a session. Sign-in is
[Clerk](https://clerk.com) via `svelte-clerk`: the server hook authenticates
each request, load functions take the session token and send it to the API
as `Authorization: Bearer <token>`. The API, not this app, decides what the
walker may see.

## Run it locally

```sh
npm install
cp .env.example .env            # fill in the values below
npm run dev                     # http://localhost:5173
```

| variable | what |
| --- | --- |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (dashboard → API keys) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `API_BASE_URL` | where the SvelteKit server reaches dog-walking-api, e.g. `http://localhost:8787` |
| `API_CLIENTS_URL`, `API_WALKS_URL` | optional, one URL per service, each defaulting to `API_BASE_URL`. The API serves both services at one URL; the Microcks mocks serve each at its own path (below). |
| `API_DEV_BEARER` | optional. When set, Clerk is bypassed and this literal token is sent to the API. The API accepts `Bearer test:<walker_id>` in its test auth mode, so `API_DEV_BEARER=test:walker-anna` runs the whole UI with no Clerk account. Never set in production. |

`npm run preview` runs the built Worker under `wrangler dev`, reading
`.dev.vars` (see `.dev.vars.example`) instead of `.env`.

### Against the contract mocks

The spec repo publishes Microcks mocks of both services, pinned by
`contracts.lock`. With Docker you can build screens with no API running:

```sh
task contracts:fetch
task mocks:up          # starts Microcks and loads both services
task dev:mocks         # npm run dev with the two mock URLs and API_DEV_BEARER=mock
task mocks:down
```

`task dev:mocks` sets `API_CLIENTS_URL=http://localhost:8585/rest/Clients+API/1.0.0`,
`API_WALKS_URL=http://localhost:8585/rest/Walks+API/1.0.0` and
`API_DEV_BEARER=mock` (the mocks accept any token).

What the mocks can and cannot show:

- They serve the fixtures in the spec repo's `mocks/*.rest.examples.yaml`:
  one client (Alice Ahmed) with Biscuit and Rex, a second client, and a few
  walks dated 2–5 November 2026. List and detail pages render real-looking
  data; Today and the current week are empty because of those dates.
- Writes return the example's canned response and change nothing: a
  scheduled walk, an edit or a cancellation will not show up afterwards.
- Query filters (`scheduled_from`, `status`, `client_id`) do not select
  among the examples.

Use the mocks for building list and detail screens and for checking the app
speaks the contract. Use the API in test mode (`API_DEV_BEARER=test:<walker>`)
or `task screens` to click through flows.

## Checks

```sh
npm run check        # svelte-check
npx vitest run       # unit tests for the pure helpers
npm run build
task contracts:verify   # all of the above plus the types drift check
```

`tests/mocks.test.ts` exercises the generated clients against the spec
repo's Microcks mocks. It is skipped unless `MOCKS_BASE_URL` is set; the CI
`mocks` job starts the stack and runs it on every push. Locally, with Docker:

```sh
task contracts:fetch
task mocks:up                                     # loads both services' mocks
MOCKS_BASE_URL=http://localhost:8585/rest npx vitest run tests
task mocks:down
```

## Screenshots and accessibility

`task screens` shows every main page as a walker would see it, so UI changes
can be reviewed as pictures:

1. checks out the API commit pinned in `e2e/api.lock` into `.api/` and starts
   it in test auth mode on a fresh local D1 (its own `scripts/with-worker.mjs`);
2. seeds a demo week through the public API (`scripts/seed-demo.mjs`: three
   clients, four dogs, walks scheduled, in progress, completed and cancelled
   around today in Europe/London);
3. starts the web app against it with `API_DEV_BEARER=test:walker-demo`;
4. runs Playwright (`e2e/`): full-page screenshots of Today, Walks, a walk in
   progress, the schedule form, Clients, a client and a dog at 390×844 and
   1280×800, light and dark, into `e2e/screenshots/`; and an axe check
   (`@axe-core/playwright`, WCAG 2.1 A/AA) that fails on serious or critical
   violations.

```sh
task screens                                   # everything
PW_ARGS=e2e/a11y.spec.ts task screens          # just the axe check
API_PORT=8797 WEB_PORT=5299 task screens       # when 8787/5199 are taken
```

It needs Chromium for Playwright (`npx playwright install chromium`). The CI
`screens` job runs the same task and uploads the images as the `screenshots`
artifact; for a private API repository it needs an `API_REPO_TOKEN` secret
with read access to it. The browser clock is fixed 15 minutes after the seed
ran, so in-progress timings are the same on every run.

## Deploy

`.github/workflows/deploy.yml` builds and runs `wrangler deploy` on every
push to `main`. It needs the repository secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`. The Worker itself needs:

- `CLERK_SECRET_KEY` as a secret: `npx wrangler secret put CLERK_SECRET_KEY`
- `PUBLIC_CLERK_PUBLISHABLE_KEY` and `API_BASE_URL` as vars (edit
  `wrangler.jsonc` or set them in the dashboard)

Add the deployed hostname to the Clerk application's allowed origins.

### Previews

`.github/workflows/preview.yml` deploys every pull request to a
[Worker Preview](https://developers.cloudflare.com/workers/previews/) and
comments the URL on the PR. There is one Preview, named `preview`, so its
origin is stable and can be listed in the API's `CLERK_AUTHORIZED_PARTIES`;
the newest push to any open PR is what it serves. Previews do not inherit
production settings: the vars live in the `previews` block of
`wrangler.jsonc`, and `CLERK_SECRET_KEY` is set once on the Previews Base
(dashboard, or `npx wrangler preview base-config secret put
CLERK_SECRET_KEY`). The Preview is recreated on every run so it always
starts from that base, and deleted when the PR closes.

## Layout

```
contracts.lock            pinned contract versions + shas
Taskfile.yml              contracts:fetch, types:generate, types:check, contracts:verify, mocks:*
src/lib/api/              generated types, openapi-fetch clients, Problem and date helpers
src/lib/server/api.ts     per-request authenticated clients
src/hooks.server.ts       Clerk handler + route guard (or the API_DEV_BEARER shortcut)
src/routes/               /, /clients, /clients/[client_id], /dogs/[dog_id], /walks, /walks/new, /walks/[walk_id]
tests/mocks.test.ts       the mock-backed contract check
scripts/seed-demo.mjs     a demo week through the public API
scripts/screens.sh        task screens: pinned API + seed + web app + Playwright
e2e/                      Playwright screenshot and axe specs; api.lock pins the API they run against
```
