# SnapShot

A web screenshot capture tool that renders high-quality PNG snapshots of any website — desktop or mobile — with bulk capture, page discovery, and ZIP export.

## Architecture

**Monorepo** managed with pnpm workspaces.

| Package | Description | Port |
|---|---|---|
| `artifacts/api-server` | Express 5 + Playwright backend | 8080 |
| `artifacts/screenshot-tool` | React 19 + Vite frontend | 5000 |
| `lib/api-spec` | OpenAPI YAML (source of truth) | — |
| `lib/api-client-react` | Generated React Query hooks (Orval) | — |
| `lib/api-zod` | Generated Zod schemas (Orval) | — |
| `lib/db` | Drizzle ORM + PostgreSQL | — |

## Workflows

- **Start application** — Vite dev server at port 5000 (webview)
- **API Server** — Express API at port 8080 (console)

The vite dev server proxies `/api/*` → `http://localhost:8080` so the frontend and backend communicate in dev without CORS issues.

## Key Details

- Screenshots stored in `artifacts/api-server/screenshots/`, auto-deleted after 1 hour.
- Chromium is provided by Nix (`pkgs.chromium`) — do not use Playwright's bundled browser.
- The `lib/api-client-react` package is **generated** from the OpenAPI spec via Orval — edit `lib/api-spec/openapi.yaml` and re-run codegen instead of editing generated files directly.
- Environment requires `DATABASE_URL` (auto-provisioned by Replit), `PORT`, and `BASE_PATH`.

## User Preferences

- (none yet)
