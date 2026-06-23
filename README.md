# SnapShot

> Precision web screenshot capture — paste a URL, capture desktop or mobile renders, discover navigation pages, bulk-export as ZIP, and integrate with a single GET request.

**Provider:** WOLVAREX · **Creator:** Silent Wolf

---

## Features

- **Single capture** — desktop or mobile viewport, full-page or viewport-only
- **Page discovery** — crawls a site's navigation links automatically
- **Bulk capture** — select multiple pages and capture them all at once
- **ZIP export** — download all screenshots from a bulk job as a ZIP archive
- **Gallery** — view all captures in-app with PNG download
- **Integration endpoint** — `GET /api/capture?siteUrl=...` returns a PNG directly, embeddable in `<img>` tags, Markdown, Slack, and any HTTP client
- **JSON metadata** — every capture returns `imageUrl`, `provider`, and `creator` fields

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24, TypeScript 5.9 |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (`zod/v4`), `drizzle-zod` |
| API codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Browser | Playwright + system Chromium (Nix) |
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui |
| Monorepo | pnpm workspaces |
| Build | esbuild (CJS bundle) |

---

## Project Structure

```
/
├── artifacts/
│   ├── api-server/          # Express API (port 8080, proxied at /api)
│   └── screenshot-tool/     # React frontend (port varies, proxied at /)
├── lib/
│   ├── api-spec/            # OpenAPI spec (source of truth for contracts)
│   ├── api-zod/             # Generated Zod schemas
│   └── api-client-react/    # Generated React Query hooks
├── scripts/                 # Shared utility scripts
├── replit.nix               # Nix environment (includes system Chromium)
└── pnpm-workspace.yaml      # Workspace catalog + overrides
```

---

## Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- [PostgreSQL](https://www.postgresql.org/) running locally
- Chromium installed on your system (`chromium` or `google-chrome` on PATH)

### 1. Clone the repo

```bash
git clone https://github.com/your-org/snapshot.git
cd snapshot
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set environment variables

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL to your Postgres connection string
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string, e.g. `postgres://user:pass@localhost:5432/snapshot` |
| `SESSION_SECRET` | Secret for session signing (any random string) |

### 4. Push the database schema

```bash
pnpm --filter @workspace/db run push
```

### 5. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

The API will be available at `http://localhost:8080/api`.

### 6. Start the frontend

```bash
pnpm --filter @workspace/screenshot-tool run dev
```

Open `http://localhost:5173` in your browser.

---

## API Quick Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/capture` | **Capture → returns PNG directly** |
| `POST` | `/api/screenshot` | Capture → returns JSON metadata |
| `GET` | `/api/screenshots` | List all captures |
| `GET` | `/api/screenshots/:id` | Get single capture metadata |
| `GET` | `/api/screenshots/:id/image` | Stream screenshot image |
| `POST` | `/api/pages/discover` | Discover navigation pages |
| `POST` | `/api/screenshots/bulk` | Start bulk capture job |
| `GET` | `/api/bulk/:jobId` | Poll bulk job status |
| `GET` | `/api/bulk/:jobId/zip` | Download ZIP archive |

See [DOCS.md](./DOCS.md) for the full API reference with request/response schemas and examples.

---

## Scripts

```bash
# Full typecheck across all packages
pnpm run typecheck

# Build all packages
pnpm run build

# Regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes (dev only)
pnpm --filter @workspace/db run push
```

---

## Contributing

Pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
