import { useState } from "react";
import { Link } from "wouter";
import { Copy, Check, ChevronRight, ArrowLeft, ExternalLink, Zap, Code2, BookOpen, Globe, Film } from "lucide-react";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${window.location.origin}${BASE_PATH}/api`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded border transition-all ${
        copied ? "border-primary/60 text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <div className="relative group">
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <CopyButton text={code} />
      </div>
      <pre className={`bg-background border border-border rounded-lg p-4 text-[11px] font-mono text-foreground/80 overflow-x-auto leading-relaxed whitespace-pre`}>
        <code>{code}</code>
      </pre>
      {lang && (
        <span className="absolute top-2.5 left-3 text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">{lang}</span>
      )}
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const isGet = method === "GET";
  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
      isGet ? "bg-primary/10 text-primary border-primary/20" : "bg-primary/20 text-primary border-primary/30"
    }`}>
      {method}
    </span>
  );
}

function ParamTable({ rows }: { rows: { name: string; type: string; required?: boolean; default?: string; desc: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border border-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-3 py-2 text-muted-foreground font-semibold tracking-wider text-[10px] uppercase">Param</th>
            <th className="text-left px-3 py-2 text-muted-foreground font-semibold tracking-wider text-[10px] uppercase">Type</th>
            <th className="text-left px-3 py-2 text-muted-foreground font-semibold tracking-wider text-[10px] uppercase">Req</th>
            <th className="text-left px-3 py-2 text-muted-foreground font-semibold tracking-wider text-[10px] uppercase">Default</th>
            <th className="text-left px-3 py-2 text-muted-foreground font-semibold tracking-wider text-[10px] uppercase">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2.5"><code className="text-primary">{r.name}</code></td>
              <td className="px-3 py-2.5 text-foreground/60">{r.type}</td>
              <td className="px-3 py-2.5">{r.required ? <span className="text-primary text-[10px]">Yes</span> : <span className="text-muted-foreground/50 text-[10px]">No</span>}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{r.default ?? "—"}</td>
              <td className="px-3 py-2.5 text-foreground/70">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NAV = [
  { id: "overview", label: "Overview" },
  { id: "capture", label: "GET /capture" },
  { id: "screenshot", label: "POST /screenshot" },
  { id: "list", label: "GET /screenshots" },
  { id: "single", label: "GET /screenshots/:id" },
  { id: "image", label: "GET /screenshots/:id/image" },
  { id: "discover", label: "POST /pages/discover" },
  { id: "bulk-start", label: "POST /screenshots/bulk" },
  { id: "bulk-poll", label: "GET /bulk/:jobId" },
  { id: "bulk-zip", label: "GET /bulk/:jobId/zip" },
  { id: "video-get", label: "GET /record" },
  { id: "video-record", label: "POST /video" },
  { id: "video-list", label: "GET /videos" },
  { id: "video-single", label: "GET /videos/:id" },
  { id: "video-file", label: "GET /videos/:id/file" },
  { id: "errors", label: "Errors" },
];

export default function Docs() {
  const [active, setActive] = useState("overview");

  const scrollTo = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Link>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-mono font-bold text-primary leading-none">SnapShot</span>
              <span className="text-xs font-mono text-muted-foreground hidden sm:inline">/ API Docs</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground shrink-0">
            <span className="hidden sm:inline">Provider: <span className="text-foreground/60">WOLVAREX</span></span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> GitHub
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-52 shrink-0">
          <nav className="sticky top-24 space-y-0.5">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50 px-3 py-2 mb-1">Endpoints</p>
            {NAV.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`w-full text-left text-[11px] font-mono px-3 py-2 rounded transition-colors ${
                  active === item.id
                    ? "bg-primary/10 text-primary border-l-2 border-primary pl-2.5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-16">

          {/* Overview */}
          <section id="overview" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 border border-primary/25 p-2 rounded-lg">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-mono font-bold text-foreground">API Reference</h1>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">SnapShot by WOLVAREX · Creator: Silent Wolf</p>
              </div>
            </div>

            <div className="prose-sm space-y-4 text-sm text-foreground/80 font-mono leading-relaxed">
              <p>
                The SnapShot API lets you capture screenshots of any public URL programmatically. All endpoints are HTTP — no SDK required.
              </p>
            </div>

            <div className="mt-5 bg-card border border-border rounded-xl p-5 space-y-3">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Base URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary">{API_BASE}</code>
                  <CopyButton text={API_BASE} />
                </div>
              </div>
              <div className="border-t border-border/60 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-mono">
                <div>
                  <p className="text-muted-foreground mb-0.5">Format</p>
                  <p className="text-foreground/80">JSON (unless PNG endpoint)</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Auth</p>
                  <p className="text-foreground/80">None required</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Rate limit</p>
                  <p className="text-foreground/80">No hard limit</p>
                </div>
              </div>
            </div>

            {/* Endpoint index */}
            <div className="mt-6 bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Screenshot Endpoints</span>
              </div>
              <div className="divide-y divide-border/50">
                {[
                  { method: "GET",  path: "/capture",              desc: "Capture → returns PNG directly" },
                  { method: "POST", path: "/screenshot",           desc: "Capture → returns JSON metadata" },
                  { method: "GET",  path: "/screenshots",          desc: "List all captures" },
                  { method: "GET",  path: "/screenshots/:id",      desc: "Get single capture metadata" },
                  { method: "GET",  path: "/screenshots/:id/image",desc: "Stream PNG image" },
                  { method: "POST", path: "/pages/discover",       desc: "Discover navigation pages" },
                  { method: "POST", path: "/screenshots/bulk",     desc: "Start bulk capture job" },
                  { method: "GET",  path: "/bulk/:jobId",          desc: "Poll bulk job status" },
                  { method: "GET",  path: "/bulk/:jobId/zip",      desc: "Download ZIP archive" },
                ].map(e => (
                  <div key={e.path + e.method} className="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-2.5 hover:bg-muted/20 transition-colors">
                    <MethodBadge method={e.method} />
                    <code className="text-xs font-mono flex-1">
                      <span className="text-muted-foreground">{API_BASE}</span>
                      <span className="text-primary">{e.path}</span>
                    </code>
                    <span className="text-[10px] font-mono text-muted-foreground">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Video endpoint index */}
            <div className="mt-4 bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Video Endpoints</span>
              </div>
              <div className="divide-y divide-border/50">
                {[
                  { method: "GET",  path: "/record",          desc: "Record → streams WebM directly" },
                  { method: "POST", path: "/video",           desc: "Record → returns JSON metadata" },
                  { method: "GET",  path: "/videos",          desc: "List all recordings" },
                  { method: "GET",  path: "/videos/:id",      desc: "Get single recording metadata" },
                  { method: "GET",  path: "/videos/:id/file", desc: "Stream raw WebM file" },
                ].map(e => (
                  <div key={e.path + e.method} className="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-2.5 hover:bg-muted/20 transition-colors">
                    <MethodBadge method={e.method} />
                    <code className="text-xs font-mono flex-1">
                      <span className="text-muted-foreground">{API_BASE}</span>
                      <span className="text-primary">{e.path}</span>
                    </code>
                    <span className="text-[10px] font-mono text-muted-foreground">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* GET /capture */}
          <section id="capture" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-1">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/capture</h2>
              <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground">— Primary integration endpoint</span>
            </div>
            <div className="flex items-center gap-2 ml-0 mb-5 mt-1">
              <Zap className="w-3 h-3 text-primary" />
              <p className="text-xs font-mono text-muted-foreground">Returns a PNG image directly — embed in <code className="text-primary">&lt;img&gt;</code>, Markdown, or any HTTP client.</p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Query Parameters</p>
                <ParamTable rows={[
                  { name: "siteUrl", type: "string", required: true, desc: "Full URL to capture (must include https://)" },
                  { name: "viewport", type: "desktop | mobile", default: "desktop", desc: "Viewport device type" },
                  { name: "fullPage", type: "true | false", default: "false", desc: "Capture full scrollable page height" },
                  { name: "format", type: "json", desc: "Return JSON metadata instead of PNG image" },
                ]} />
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Examples</p>
                <div className="space-y-3">
                  <CodeBlock lang="html" code={`<img src="${API_BASE}/capture?siteUrl=https://example.com" alt="Screenshot" />`} />
                  <CodeBlock lang="markdown" code={`![Screenshot](${API_BASE}/capture?siteUrl=https://example.com&viewport=mobile)`} />
                  <CodeBlock lang="bash" code={`curl "${API_BASE}/capture?siteUrl=https://example.com&viewport=desktop" -o screenshot.png`} />
                  <CodeBlock lang="js" code={`const res = await fetch('/api/capture?siteUrl=https://example.com&format=json');\nconst data = await res.json();\nconsole.log(data.imageUrl); // absolute PNG URL`} />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Response (format=json)</p>
                <CodeBlock lang="json" code={`{
  "id": "3d63b31d-6156-4fd8-a586-1c312ed26f29",
  "url": "https://example.com",
  "viewport": "desktop",
  "fullPage": false,
  "status": "completed",
  "imageUrl": "${API_BASE}/screenshots/3d63b31d.../image",
  "createdAt": "2026-06-23T00:00:00.000Z",
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}`} />
              </div>
            </div>
          </section>

          {/* POST /screenshot */}
          <section id="screenshot" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="POST" />
              <h2 className="text-base font-mono font-bold text-foreground">/screenshot</h2>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Request Body</p>
                <ParamTable rows={[
                  { name: "url", type: "string", required: true, desc: "Full URL to capture" },
                  { name: "viewport", type: "desktop | mobile", default: "desktop", desc: "Viewport device type" },
                  { name: "fullPage", type: "boolean", default: "false", desc: "Capture full scrollable page" },
                ]} />
              </div>
              <CodeBlock lang="bash" code={`curl -X POST ${API_BASE}/screenshot \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","viewport":"desktop","fullPage":false}'`} />
              <CodeBlock lang="json" code={`{
  "id": "uuid",
  "url": "https://example.com",
  "viewport": "desktop",
  "fullPage": false,
  "status": "completed",
  "imageUrl": "${API_BASE}/screenshots/uuid/image",
  "createdAt": "2026-06-23T00:00:00.000Z",
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}`} />
            </div>
          </section>

          {/* GET /screenshots */}
          <section id="list" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/screenshots</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">Returns all captures. Items are held in memory for 1 hour then auto-removed.</p>
            <CodeBlock lang="bash" code={`curl ${API_BASE}/screenshots`} />
            <div className="mt-3">
              <CodeBlock lang="json" code={`[
  {
    "id": "uuid",
    "url": "https://example.com",
    "viewport": "desktop",
    "status": "completed",
    "imageUrl": "${API_BASE}/screenshots/uuid/image",
    "createdAt": "2026-06-23T00:00:00.000Z",
    "provider": "WOLVAREX",
    "creator": "Silent Wolf"
  }
]`} />
            </div>
          </section>

          {/* GET /screenshots/:id */}
          <section id="single" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/screenshots/:id</h2>
            </div>
            <CodeBlock lang="bash" code={`curl ${API_BASE}/screenshots/3d63b31d-6156-4fd8-a586-1c312ed26f29`} />
          </section>

          {/* GET /screenshots/:id/image */}
          <section id="image" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/screenshots/:id/image</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">
              Streams the raw PNG file. Use as the <code className="text-primary">src</code> of an <code className="text-primary">&lt;img&gt;</code> tag.
              Responds with <code className="text-primary">Content-Type: image/png</code>.
            </p>
            <CodeBlock lang="html" code={`<img src="${API_BASE}/screenshots/uuid/image" alt="Captured screenshot" />`} />
          </section>

          {/* POST /pages/discover */}
          <section id="discover" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="POST" />
              <h2 className="text-base font-mono font-bold text-foreground">/pages/discover</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">Crawls internal navigation links on a page. Use the returned paths with the bulk endpoint.</p>
            <div className="space-y-3">
              <CodeBlock lang="bash" code={`curl -X POST ${API_BASE}/pages/discover \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`} />
              <CodeBlock lang="json" code={`{
  "baseUrl": "https://example.com",
  "pages": [
    { "path": "/",       "label": "Home" },
    { "path": "/about",  "label": "About" },
    { "path": "/contact","label": "Contact" }
  ]
}`} />
            </div>
          </section>

          {/* POST /screenshots/bulk */}
          <section id="bulk-start" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="POST" />
              <h2 className="text-base font-mono font-bold text-foreground">/screenshots/bulk</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">Starts an async bulk job. Poll <code className="text-primary">GET /bulk/:jobId</code> for status.</p>
            <div className="space-y-3">
              <ParamTable rows={[
                { name: "baseUrl", type: "string", required: true, desc: "Base URL (scheme + host)" },
                { name: "paths", type: "string[]", required: true, desc: "List of paths to capture" },
                { name: "viewport", type: "desktop | mobile", default: "desktop", desc: "Viewport for all pages" },
                { name: "fullPage", type: "boolean", default: "false", desc: "Full-page for all pages" },
              ]} />
              <CodeBlock lang="bash" code={`curl -X POST ${API_BASE}/screenshots/bulk \\
  -H "Content-Type: application/json" \\
  -d '{
    "baseUrl": "https://example.com",
    "paths": ["/", "/about", "/contact"],
    "viewport": "desktop"
  }'`} />
              <CodeBlock lang="json" code={`{
  "jobId": "086b6384-f14e-4f55-a536-d6c8b5fb7aa5",
  "status": "pending",
  "total": 3,
  "completed": 0,
  "failed": 0,
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}`} />
            </div>
          </section>

          {/* GET /bulk/:jobId */}
          <section id="bulk-poll" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/bulk/:jobId</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-3">Poll every 2 seconds until <code className="text-primary">status</code> is <code className="text-primary">completed</code> or <code className="text-primary">failed</code>.</p>
            <div className="mb-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Status values</p>
              <div className="flex flex-wrap gap-2">
                {["pending","running","completed","failed"].map(s => (
                  <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted/30 text-foreground/70">{s}</span>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <CodeBlock lang="bash" code={`curl ${API_BASE}/bulk/086b6384-f14e-4f55-a536-d6c8b5fb7aa5`} />
              <CodeBlock lang="json" code={`{
  "jobId": "086b6384-f14e-4f55-a536-d6c8b5fb7aa5",
  "status": "completed",
  "total": 3,
  "completed": 3,
  "failed": 0,
  "zipUrl": "${API_BASE}/bulk/086b6384.../zip",
  "screenshots": [
    {
      "id": "uuid",
      "url": "https://example.com/",
      "status": "completed",
      "imageUrl": "${API_BASE}/screenshots/uuid/image",
      "provider": "WOLVAREX",
      "creator": "Silent Wolf"
    }
  ],
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}`} />
              <CodeBlock lang="bash" code={`# Poll until done
JOB_ID="086b6384-f14e-4f55-a536-d6c8b5fb7aa5"
while true; do
  STATUS=$(curl -s "${API_BASE}/bulk/$JOB_ID" | jq -r '.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ] && break
  sleep 2
done`} />
            </div>
          </section>

          {/* GET /bulk/:jobId/zip */}
          <section id="bulk-zip" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/bulk/:jobId/zip</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">
              Download all screenshots as a ZIP archive. Only available when the job <code className="text-primary">status</code> is <code className="text-primary">completed</code>.
              Responds with <code className="text-primary">Content-Type: application/zip</code>.
            </p>
            <CodeBlock lang="bash" code={`curl "${API_BASE}/bulk/086b6384-f14e-4f55-a536-d6c8b5fb7aa5/zip" -o screenshots.zip`} />
          </section>

          {/* GET /record */}
          <section id="video-get" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-1">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/record</h2>
              <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground">— Primary video integration endpoint</span>
            </div>
            <div className="flex items-center gap-2 ml-0 mb-5 mt-1">
              <Zap className="w-3 h-3 text-primary" />
              <p className="text-xs font-mono text-muted-foreground">Records the page and streams the WebM video directly — paste in browser, embed in <code className="text-primary">&lt;video&gt;</code>, or pipe with cURL.</p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Query Parameters</p>
                <ParamTable rows={[
                  { name: "siteUrl",  type: "string",           required: true,  desc: "Full URL to record (must include https://)" },
                  { name: "viewport", type: "desktop | mobile", default: "desktop", desc: "Viewport device type" },
                  { name: "format",   type: "json",                               desc: "Return JSON metadata instead of the video file" },
                ]} />
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Examples</p>
                <div className="space-y-3">
                  <CodeBlock lang="html" code={`<video src="${API_BASE}/record?siteUrl=https://example.com" controls autoplay />`} />
                  <CodeBlock lang="markdown" code={`<!-- paste directly in browser address bar -->
${API_BASE}/record?siteUrl=https://example.com&viewport=mobile`} />
                  <CodeBlock lang="bash" code={`curl "${API_BASE}/record?siteUrl=https://example.com&viewport=desktop" -o recording.webm`} />
                  <CodeBlock lang="js" code={`const res = await fetch('/api/record?siteUrl=https://example.com&format=json');
const data = await res.json();
console.log(data.videoUrl); // absolute WebM URL`} />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Response (format=json)</p>
                <CodeBlock lang="json" code={`{
  "id": "3d63b31d-6156-4fd8-a586-1c312ed26f29",
  "url": "https://example.com",
  "viewport": "desktop",
  "status": "completed",
  "videoUrl": "${API_BASE}/videos/3d63b31d.../file",
  "duration": 12,
  "createdAt": "2026-06-23T00:00:00.000Z",
  "provider": "WOLVAREX",
  "creator": "Silent Wolf"
}`} />
              </div>
            </div>
          </section>

          {/* POST /video */}
          <section id="video-record" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-1">
              <MethodBadge method="POST" />
              <h2 className="text-base font-mono font-bold text-foreground">/video</h2>
              <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground">— Returns JSON metadata</span>
            </div>
            <div className="flex items-center gap-2 ml-0 mb-5 mt-1">
              <Film className="w-3 h-3 text-primary" />
              <p className="text-xs font-mono text-muted-foreground">Scrolls through the page and records a WebM video. Returns JSON with a direct <code className="text-primary">videoUrl</code>.</p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Request Body</p>
                <ParamTable rows={[
                  { name: "url",      type: "string",           required: true,  desc: "Full URL to record (must include https://)" },
                  { name: "viewport", type: "desktop | mobile", default: "desktop", desc: "Viewport device type" },
                ]} />
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Examples</p>
                <div className="space-y-3">
                  <CodeBlock lang="bash" code={`curl -X POST ${API_BASE}/video \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","viewport":"desktop"}'`} />
                  <CodeBlock lang="js" code={`const res = await fetch('/api/video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com', viewport: 'desktop' }),
});
const { videoUrl } = await res.json();
// videoUrl is a direct WebM link`} />
                  <CodeBlock lang="html" code={`<video src="/api/videos/uuid/file" controls />`} />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Response</p>
                <CodeBlock lang="json" code={`{
  "id": "3d63b31d-6156-4fd8-a586-1c312ed26f29",
  "url": "https://example.com",
  "viewport": "desktop",
  "status": "completed",
  "videoUrl": "${API_BASE}/videos/3d63b31d.../file",
  "duration": 12,
  "createdAt": "2026-06-23T00:00:00.000Z"
}`} />
              </div>
            </div>
          </section>

          {/* GET /videos */}
          <section id="video-list" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/videos</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">Returns all recordings for the current session. Videos are held in memory for 1 hour then auto-removed.</p>
            <CodeBlock lang="bash" code={`curl ${API_BASE}/videos`} />
            <div className="mt-3">
              <CodeBlock lang="json" code={`[
  {
    "id": "uuid",
    "url": "https://example.com",
    "viewport": "desktop",
    "status": "completed",
    "videoUrl": "${API_BASE}/videos/uuid/file",
    "duration": 12,
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
]`} />
            </div>
          </section>

          {/* GET /videos/:id */}
          <section id="video-single" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/videos/:id</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">Get metadata for a single recording by ID.</p>
            <CodeBlock lang="bash" code={`curl ${API_BASE}/videos/3d63b31d-6156-4fd8-a586-1c312ed26f29`} />
          </section>

          {/* GET /videos/:id/file */}
          <section id="video-file" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <MethodBadge method="GET" />
              <h2 className="text-base font-mono font-bold text-foreground">/videos/:id/file</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">
              Streams the raw WebM video file. Use as the <code className="text-primary">src</code> of a <code className="text-primary">&lt;video&gt;</code> tag.
              Responds with <code className="text-primary">Content-Type: video/webm</code>.
            </p>
            <CodeBlock lang="html" code={`<video src="${API_BASE}/videos/uuid/file" controls autoplay />`} />
            <div className="mt-3">
              <CodeBlock lang="bash" code={`curl "${API_BASE}/videos/uuid/file" -o recording.webm`} />
            </div>
          </section>

          {/* Errors */}
          <section id="errors" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-base font-mono font-bold text-foreground">Error Responses</h2>
            </div>
            <p className="text-xs font-mono text-muted-foreground mb-5">All errors follow a consistent shape:</p>
            <CodeBlock lang="json" code={`{ "error": "Human-readable error message" }`} />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-xs font-mono border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-3 py-2 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Status</th>
                    <th className="text-left px-3 py-2 text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["400", "Bad request — missing or invalid parameters"],
                    ["404", "Resource not found"],
                    ["500", "Server error — capture or processing failed"],
                  ].map(([code, msg]) => (
                    <tr key={code} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2.5"><code className="text-primary">{code}</code></td>
                      <td className="px-3 py-2.5 text-foreground/70">{msg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Back link */}
          <div className="pt-4 pb-8 border-t border-border flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Playground
            </Link>
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground/50">
              <ChevronRight className="w-3 h-3" />
              <span>Provider: WOLVAREX · Creator: Silent Wolf</span>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
