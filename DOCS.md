# SnapShot — API Documentation

**Base URL (production):** `https://your-domain`  
**Base URL (development):** `http://localhost:8080/api`  
**Provider:** WOLVAREX · **Creator:** Silent Wolf

All responses are JSON unless otherwise noted. Every response includes `provider` and `creator` fields.

---

## Table of Contents

1. [GET /capture](#1-get-capture) — Direct PNG capture (integration-friendly)
2. [POST /screenshot](#2-post-screenshot) — Capture, returns JSON
3. [GET /screenshots](#3-get-screenshots) — List all captures
4. [GET /screenshots/:id](#4-get-screenshotsid) — Get single capture
5. [GET /screenshots/:id/image](#5-get-screenshotsidimage) — Stream PNG image
6. [POST /pages/discover](#6-post-pagesdiscover) — Discover navigation pages
7. [POST /screenshots/bulk](#7-post-screenshotsbulk) — Start bulk capture
8. [GET /bulk/:jobId](#8-get-bulkjobid) — Poll bulk job
9. [GET /bulk/:jobId/zip](#9-get-bulkjobidzip) — Download ZIP

---

## 1. GET /capture

The primary integration endpoint. Captures a screenshot and returns the **PNG image directly** — no intermediate JSON step. Embed in `<img>` tags, Markdown, Slack messages, or any HTTP client.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `siteUrl` | string | ✅ | — | Full URL to capture (must include `https://`) |
| `viewport` | `desktop` \| `mobile` | ❌ | `desktop` | Viewport device type |
| `fullPage` | `true` \| `false` | ❌ | `false` | Capture full scrollable page |
| `format` | `json` | ❌ | — | Return JSON metadata instead of PNG |

### Response

**Default (PNG image):**
```
Content-Type: image/png
Content-Disposition: inline; filename="capture.png"
Cache-Control: public, max-age=60
```

**With `&format=json`:**
```json
{
  "id": "uuid",
  "url": "https://example.com",
  "viewport": "desktop",
  "fullPage": false,
  "status": "completed",
  "imageUrl": "https://your-domain/api/screenshots/uuid/image",
  "createdAt": "2026-06-23T00:00:00.000Z",
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}
```

### Examples

**HTML — embed as image:**
```html
<img src="https://your-domain/api/capture?siteUrl=https://example.com" alt="Screenshot" />
```

**Markdown:**
```markdown
![Screenshot](https://your-domain/api/capture?siteUrl=https://example.com&viewport=mobile)
```

**cURL — download PNG:**
```bash
curl "https://your-domain/api/capture?siteUrl=https://example.com&viewport=desktop" \
  -o screenshot.png
```

**JavaScript fetch:**
```js
const res = await fetch('/api/capture?siteUrl=https://example.com&format=json');
const data = await res.json();
console.log(data.imageUrl);
```

---

## 2. POST /screenshot

Capture a single screenshot. Returns JSON metadata including the absolute `imageUrl`.

### Request Body

```json
{
  "url": "https://example.com",
  "viewport": "desktop",
  "fullPage": false
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | string | ✅ | — | Full URL to capture |
| `viewport` | `desktop` \| `mobile` | ❌ | `desktop` | Viewport device type |
| `fullPage` | boolean | ❌ | `false` | Capture full scrollable page |

### Response `200 OK`

```json
{
  "id": "3d63b31d-6156-4fd8-a586-1c312ed26f29",
  "url": "https://example.com",
  "viewport": "desktop",
  "fullPage": false,
  "status": "completed",
  "imageUrl": "https://your-domain/api/screenshots/3d63b31d-6156-4fd8-a586-1c312ed26f29/image",
  "createdAt": "2026-06-23T00:00:00.000Z",
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}
```

### cURL

```bash
curl -X POST https://your-domain/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","viewport":"desktop","fullPage":false}'
```

---

## 3. GET /screenshots

List all captures stored in the current session (most recent first). Captures are held in memory and cleaned up after 1 hour.

### Response `200 OK`

```json
[
  {
    "id": "uuid",
    "url": "https://example.com",
    "viewport": "desktop",
    "fullPage": false,
    "status": "completed",
    "imageUrl": "https://your-domain/api/screenshots/uuid/image",
    "createdAt": "2026-06-23T00:00:00.000Z",
    "provider": "WOLVAREX",
    "creator": "Silent Wolf"
  }
]
```

### cURL

```bash
curl https://your-domain/api/screenshots
```

---

## 4. GET /screenshots/:id

Get metadata for a single capture by ID.

### Path Parameters

| Parameter | Description |
|---|---|
| `id` | Screenshot UUID |

### Response `200 OK`

Same shape as a single item from [GET /screenshots](#3-get-screenshots).

### Response `404 Not Found`

```json
{ "error": "Screenshot not found" }
```

---

## 5. GET /screenshots/:id/image

Stream the raw PNG file for a completed capture.

### Response

```
Content-Type: image/png
Content-Disposition: inline; filename="{id}.png"
```

Returns the PNG binary stream directly. Use this URL as the `src` of an `<img>` tag.

---

## 6. POST /pages/discover

Crawl a URL and discover its internal navigation links. Returns a list of paths that can be passed to the bulk capture endpoint.

### Request Body

```json
{
  "url": "https://example.com"
}
```

### Response `200 OK`

```json
{
  "baseUrl": "https://example.com",
  "pages": [
    { "path": "/", "label": "Home" },
    { "path": "/about", "label": "About" },
    { "path": "/contact", "label": "Contact" }
  ]
}
```

### cURL

```bash
curl -X POST https://your-domain/api/pages/discover \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

---

## 7. POST /screenshots/bulk

Start an asynchronous bulk capture job. The job runs in the background — poll [GET /bulk/:jobId](#8-get-bulkjobid) for status.

### Request Body

```json
{
  "baseUrl": "https://example.com",
  "paths": ["/", "/about", "/contact"],
  "viewport": "desktop",
  "fullPage": false
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `baseUrl` | string | ✅ | — | Base URL (scheme + host) |
| `paths` | string[] | ✅ | — | List of paths to capture |
| `viewport` | `desktop` \| `mobile` | ❌ | `desktop` | Viewport for all captures |
| `fullPage` | boolean | ❌ | `false` | Full-page for all captures |

### Response `200 OK`

```json
{
  "jobId": "086b6384-f14e-4f55-a536-d6c8b5fb7aa5",
  "status": "pending",
  "total": 3,
  "completed": 0,
  "failed": 0,
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}
```

### cURL

```bash
curl -X POST https://your-domain/api/screenshots/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://example.com",
    "paths": ["/", "/about"],
    "viewport": "desktop"
  }'
```

---

## 8. GET /bulk/:jobId

Poll the status of a bulk capture job. Call this endpoint every 2 seconds until `status` is `completed` or `failed`.

### Path Parameters

| Parameter | Description |
|---|---|
| `jobId` | Bulk job UUID returned from POST /screenshots/bulk |

### Response `200 OK`

```json
{
  "jobId": "086b6384-f14e-4f55-a536-d6c8b5fb7aa5",
  "status": "completed",
  "total": 3,
  "completed": 3,
  "failed": 0,
  "zipUrl": "https://your-domain/api/bulk/086b6384.../zip",
  "screenshots": [
    {
      "id": "uuid",
      "url": "https://example.com/",
      "status": "completed",
      "imageUrl": "https://your-domain/api/screenshots/uuid/image",
      "provider": "WOLVAREX",
      "creator": "Silent Wolf"
    }
  ],
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}
```

**Status values:** `pending` · `running` · `completed` · `failed`

### cURL (poll until done)

```bash
JOB_ID="your-job-id"
while true; do
  STATUS=$(curl -s "https://your-domain/api/bulk/$JOB_ID" | jq -r '.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ] && break
  sleep 2
done
```

---

## 9. GET /bulk/:jobId/zip

Download all screenshots from a completed bulk job as a single ZIP archive.

Only available when the job `status` is `completed`.

### Response

```
Content-Type: application/zip
Content-Disposition: attachment; filename="screenshots-{jobId}.zip"
```

Returns the ZIP binary stream.

### cURL

```bash
curl "https://your-domain/api/bulk/086b6384.../zip" -o screenshots.zip
```

---

## Error Responses

All errors follow this shape:

```json
{ "error": "Human-readable error message" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request — missing or invalid parameters |
| `404` | Resource not found |
| `500` | Server error — capture or processing failed |

---

## Response Metadata

Every response from this API includes:

| Field | Value |
|---|---|
| `provider` | `"WOLVAREX"` |
| `creator` | `"Silent Wolf"` |

These fields are present on all screenshot objects, bulk job responses, and `GET /capture?format=json`.

---

## Rate Limits

No hard rate limits are enforced, but each capture spawns a headless Chromium instance and takes 5–15 seconds. Running many concurrent captures will degrade performance. For bulk captures, use the `/screenshots/bulk` endpoint — it queues captures internally.

---

## Self-Hosting

See [README.md](./README.md#getting-started) for full setup instructions.

The only required environment variable is `DATABASE_URL`. Chromium is auto-detected from `PATH` (`chromium` or `google-chrome`). On Replit, the Nix-provided system Chromium is used automatically.
