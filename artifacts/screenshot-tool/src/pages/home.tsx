import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { 
  useTakeScreenshot, 
  useDiscoverPages, 
  useTakeBulkScreenshots, 
  useListScreenshots,
  useGetBulkJob,
  getGetBulkJobQueryKey,
  getListScreenshotsQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Monitor, Smartphone, Download, AlertCircle, Play, 
  Layers, Search, CheckSquare, Copy, Check, ExternalLink, Zap, Code2,
  Film, Camera, Trash2, RotateCcw
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${window.location.origin}${BASE_PATH}/api`;

const ALL_ENDPOINTS = [
  { method: "GET",  path: "/capture",           params: "?siteUrl=&viewport=desktop&fullPage=false", desc: "Capture → returns PNG directly" },
  { method: "POST", path: "/screenshot",         params: "",   desc: "Capture → returns JSON metadata" },
  { method: "GET",  path: "/screenshots",        params: "",   desc: "List all captures" },
  { method: "GET",  path: "/screenshots/:id",    params: "",   desc: "Get single capture metadata" },
  { method: "POST", path: "/pages/discover",     params: "",   desc: "Discover navigation pages" },
  { method: "POST", path: "/screenshots/bulk",   params: "",   desc: "Start bulk capture job" },
  { method: "GET",  path: "/bulk/:jobId",        params: "",   desc: "Poll bulk job status" },
  { method: "GET",  path: "/bulk/:jobId/zip",    params: "",   desc: "Download ZIP archive" },
];

const ALL_VIDEO_ENDPOINTS = [
  { method: "GET",  path: "/record",          params: "?siteUrl=&viewport=desktop", desc: "Record → streams WebM directly" },
  { method: "POST", path: "/video",           params: "", desc: "Record → returns JSON metadata" },
  { method: "GET",  path: "/videos",          params: "", desc: "List all recordings" },
  { method: "GET",  path: "/videos/:id",      params: "", desc: "Get single recording metadata" },
  { method: "GET",  path: "/videos/:id/file", params: "", desc: "Stream raw WebM file" },
];

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded border transition-all ${
        copied
          ? "border-primary/60 text-primary bg-primary/10"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5"
      } ${className}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function EndpointRefRow({ method, path, params, desc }: { method: string; path: string; params: string; desc: string }) {
  const full = `${API_BASE}${path}${params}`;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5 border-b border-border/50 last:border-0 group">
      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 w-10 text-center ${
        method === "POST" ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary/80"
      }`}>
        {method}
      </span>
      <code className="text-xs font-mono text-foreground/80 flex-1 truncate">
        <span className="text-muted-foreground">{API_BASE}</span>
        <span className="text-primary">{path}</span>
        {params && <span className="text-foreground/40">{params}</span>}
      </code>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-muted-foreground hidden lg:inline">{desc}</span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={full} />
        </div>
      </div>
    </div>
  );
}

interface VideoMeta {
  id: string;
  url: string;
  viewport: "desktop" | "mobile";
  status: "pending" | "recording" | "completed" | "failed";
  error: string | null;
  videoUrl: string | null;
  duration: number | null;
  createdAt: string;
}

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("https://");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [fullPage, setFullPage] = useState(false);

  const [mode, setMode] = useState<"screenshot" | "video">("screenshot");
  const [isRecording, setIsRecording] = useState(false);
  const [videos, setVideos] = useState<VideoMeta[]>([]);

  const [showDiscover, setShowDiscover] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: screenshots, isLoading: loadingScreenshots } = useListScreenshots();

  const { data: bulkJob } = useGetBulkJob(activeJobId || "", {
    query: {
      enabled: !!activeJobId,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return (status === "completed" || status === "failed") ? false : 2000;
      },
      queryKey: getGetBulkJobQueryKey(activeJobId || "")
    }
  });

  const takeScreenshot = useTakeScreenshot();
  const discoverPages = useDiscoverPages();
  const takeBulkScreenshots = useTakeBulkScreenshots();

  const isValidUrl = (u: string) => {
    try { new URL(u.trim()); return true; } catch { return false; }
  };

  const liveEndpointUrl = useMemo(() => {
    const base = `${API_BASE}/capture`;
    const siteUrl = isValidUrl(url) ? url : "https://example.com";
    const params = new URLSearchParams({ siteUrl, viewport });
    if (fullPage) params.set("fullPage", "true");
    return `${base}?${params.toString()}`;
  }, [url, viewport, fullPage]);

  const liveEndpointUrlJson = useMemo(() => {
    return liveEndpointUrl + (fullPage ? "&format=json" : `${liveEndpointUrl.includes("?") ? "&" : "?"}format=json`);
  }, [liveEndpointUrl, fullPage]);

  const liveVideoEndpointUrl = useMemo(() => {
    const base = `${API_BASE}/record`;
    const siteUrl = isValidUrl(url) ? url : "https://example.com";
    const params = new URLSearchParams({ siteUrl, viewport });
    return `${base}?${params.toString()}`;
  }, [url, viewport]);

  const handleTakeScreenshot = () => {
    if (!isValidUrl(url)) {
      toast({ title: "Invalid URL", variant: "destructive" });
      return;
    }
    takeScreenshot.mutate({ data: { url, viewport, fullPage } }, {
      onSuccess: () => {
        toast({ title: "Screenshot captured" });
        queryClient.invalidateQueries({ queryKey: getListScreenshotsQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Failed", description: (err as { error?: { error?: string } }).error?.error || "Network error", variant: "destructive" });
      }
    });
  };

  const handleRecordVideo = async (recordUrl?: string, recordViewport?: string) => {
    const trimmedUrl = (typeof recordUrl === "string" ? recordUrl : url).trim();
    const resolvedViewport = (typeof recordViewport === "string" ? recordViewport : viewport) as "desktop" | "mobile";
    if (!isValidUrl(trimmedUrl)) {
      toast({ title: "Invalid URL", variant: "destructive" });
      return;
    }
    setIsRecording(true);
    toast({ title: "Recording started", description: "Scrolling through the page…" });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, viewport: resolvedViewport }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recording failed");
      setVideos((prev) => [data, ...prev.filter((v) => v.id !== data.id)]);
      toast({ title: "Video ready", description: `Recorded in ${data.duration}s` });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast({ title: "Recording timed out", description: "The page took too long to record", variant: "destructive" });
      } else {
        toast({ title: "Recording failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
      }
    } finally {
      clearTimeout(timer);
      setIsRecording(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await fetch(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/videos/${id}`, {
        method: "DELETE",
      });
    } catch {}
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/videos`);
        if (res.ok) setVideos(await res.json());
      } catch {}
    };
    fetchVideos();
  }, []);

  const handleDiscover = () => {
    if (!isValidUrl(url)) {
      toast({ title: "Invalid URL", variant: "destructive" });
      return;
    }
    setShowDiscover(true);
    discoverPages.mutate({ data: { url } }, {
      onSuccess: (data) => {
        setSelectedPaths(new Set(data.pages.map(p => p.path)));
      },
      onError: (err) => {
        toast({ title: "Discovery failed", description: (err as { error?: { error?: string } }).error?.error || "Network error", variant: "destructive" });
        setShowDiscover(false);
      }
    });
  };

  const handleBulkCapture = () => {
    if (!discoverPages.data?.baseUrl || selectedPaths.size === 0) return;
    takeBulkScreenshots.mutate({
      data: { baseUrl: discoverPages.data.baseUrl, paths: Array.from(selectedPaths), viewport, fullPage }
    }, {
      onSuccess: (job) => {
        setActiveJobId(job.jobId);
        setShowDiscover(false);
        toast({ title: "Bulk capture started" });
      },
      onError: (err) => {
        toast({ title: "Bulk failed", description: (err as { error?: { error?: string } }).error?.error || "Network error", variant: "destructive" });
      }
    });
  };

  const togglePath = (p: string) => {
    const s = new Set(selectedPaths);
    if (s.has(p)) s.delete(p); else s.add(p);
    setSelectedPaths(s);
  };

  const selectAll = (select: boolean) => {
    if (select && discoverPages.data) setSelectedPaths(new Set(discoverPages.data.pages.map(p => p.path)));
    else setSelectedPaths(new Set());
  };

  useEffect(() => {
    if (bulkJob && (bulkJob.status === "completed" || bulkJob.status === "failed")) {
      queryClient.invalidateQueries({ queryKey: getListScreenshotsQueryKey() });
    }
  }, [bulkJob?.status, queryClient]);

  const displayScreenshots = (bulkJob?.status === "running" || bulkJob?.status === "pending")
    ? [...(bulkJob.screenshots || []), ...(screenshots || [])].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    : screenshots;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">

      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary/15 border border-primary/30 p-2 rounded-md shrink-0">
              <Monitor className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-mono font-bold tracking-tight text-primary leading-none">SnapShot</h1>
              <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase leading-none mt-0.5">by WOLVAREX</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-[10px] font-mono text-muted-foreground">
            <span className="hidden sm:inline">Creator: <span className="text-foreground/70">Silent Wolf</span></span>
            <span className="hidden md:inline text-border">|</span>
            <Link href="/docs" className="hidden md:inline hover:text-primary transition-colors">API Docs →</Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-6">

        {/* ── Playground ── */}
        <section className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">Playground</p>
              <p className="text-xs font-mono text-muted-foreground/70 mt-0.5 hidden sm:block">
                {mode === "screenshot"
                  ? "Paste any URL below — capture, discover pages, or bulk-export as ZIP."
                  : "Paste any URL below — records a scrolling video of the landing page."}
              </p>
            </div>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 shrink-0">
              <button
                onClick={() => setMode("screenshot")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                  mode === "screenshot"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Camera className="w-3 h-3" /> Screenshot
              </button>
              <button
                onClick={() => setMode("video")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                  mode === "video"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Film className="w-3 h-3" /> Video
              </button>
            </div>
          </div>

          {/* URL row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="url" className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1.5 block">
                Target URL
              </Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTakeScreenshot()}
                className="font-mono bg-background border-border focus-visible:ring-primary text-sm py-5"
                placeholder="https://example.com"
              />
            </div>

            {/* Viewport + fullPage toggles */}
            <div className="flex items-end gap-0">
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 h-[42px] sm:h-auto sm:py-3 self-end">
                <Monitor className={`w-3.5 h-3.5 shrink-0 ${viewport === "desktop" ? "text-primary" : "text-muted-foreground/40"}`} />
                <Switch
                  checked={viewport === "mobile"}
                  onCheckedChange={(c) => setViewport(c ? "mobile" : "desktop")}
                  className="data-[state=checked]:bg-primary"
                />
                <Smartphone className={`w-3.5 h-3.5 shrink-0 ${viewport === "mobile" ? "text-primary" : "text-muted-foreground/40"}`} />
                <div className="w-px h-5 bg-border mx-1" />
                <Switch
                  id="fullpage"
                  checked={fullPage}
                  onCheckedChange={setFullPage}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="fullpage" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground cursor-pointer whitespace-nowrap">
                  Full
                </Label>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {mode === "screenshot" ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                className="flex-1 sm:flex-none font-mono tracking-wider font-semibold text-xs sm:text-sm py-5 border border-border hover:border-primary/40 hover:text-primary"
                onClick={handleDiscover}
                disabled={discoverPages.isPending || takeScreenshot.isPending}
              >
                {discoverPages.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <Search className="w-4 h-4 mr-2" />}
                DISCOVER PAGES
              </Button>
              <Button
                className="flex-1 sm:flex-none font-mono tracking-wider font-semibold text-xs sm:text-sm py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                onClick={handleTakeScreenshot}
                disabled={takeScreenshot.isPending || discoverPages.isPending}
              >
                {takeScreenshot.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <Play className="w-4 h-4 mr-2" />}
                CAPTURE SCREENSHOT
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 font-mono tracking-wider font-semibold text-xs sm:text-sm py-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                onClick={() => handleRecordVideo()}
                disabled={isRecording}
              >
                {isRecording
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> RECORDING…</>
                  : <><Film className="w-4 h-4 mr-2" /> RECORD VIDEO</>}
              </Button>
              {isRecording && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground self-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Scrolling &amp; capturing — takes ~15–20s
                </div>
              )}
            </div>
          )}

          {/* Discover Pages Panel */}
          {showDiscover && (
            <div className="pt-5 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-4 gap-4">
                <h3 className="text-sm font-mono font-bold tracking-tight text-foreground">Discovered Pages</h3>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => selectAll(true)} className="text-[10px] font-mono h-7 px-2">All</Button>
                  <Button variant="ghost" size="sm" onClick={() => selectAll(false)} className="text-[10px] font-mono h-7 px-2">None</Button>
                </div>
              </div>
              {discoverPages.isPending ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                  <p className="font-mono text-xs">Crawling target URL…</p>
                </div>
              ) : discoverPages.data?.pages.length ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {discoverPages.data.pages.map((page) => (
                      <div
                        key={page.path}
                        className={`flex items-start gap-2.5 p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedPaths.has(page.path)
                            ? "bg-primary/10 border-primary/40"
                            : "bg-background border-border hover:border-primary/20"
                        }`}
                        onClick={() => togglePath(page.path)}
                      >
                        <Checkbox checked={selectedPaths.has(page.path)} className="mt-0.5 shrink-0" />
                        <div className="space-y-0.5 overflow-hidden">
                          <p className="text-xs font-medium truncate">{page.label || page.path}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{page.path}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={handleBulkCapture}
                      disabled={selectedPaths.size === 0 || takeBulkScreenshots.isPending}
                      className="font-mono font-bold tracking-wide text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {takeBulkScreenshots.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                        : <Layers className="w-3.5 h-3.5 mr-2" />}
                      CAPTURE {selectedPaths.size} PAGE{selectedPaths.size !== 1 ? "S" : ""}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground font-mono text-xs text-center py-8">No pages discovered.</p>
              )}
            </div>
          )}

          {/* Bulk Job Progress */}
          {activeJobId && bulkJob && (
            <div className="pt-5 border-t border-border animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {bulkJob.status === "running" || bulkJob.status === "pending"
                    ? <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    : bulkJob.status === "completed"
                      ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}
                  <span className="font-mono text-xs uppercase tracking-wider">
                    Bulk: <span className="font-bold text-foreground">{bulkJob.status}</span>
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {bulkJob.completed}/{bulkJob.total} done · {bulkJob.failed} failed
                </span>
              </div>
              <Progress value={(bulkJob.completed + bulkJob.failed) / bulkJob.total * 100} className="h-1.5" />
              {bulkJob.status === "completed" && bulkJob.zipUrl && (
                <div className="mt-4 flex justify-end">
                  <a href={bulkJob.zipUrl} download>
                    <Button className="font-mono font-bold tracking-wide text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Download className="w-3.5 h-3.5 mr-2" />
                      DOWNLOAD ZIP
                    </Button>
                  </a>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Gallery ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-mono font-bold tracking-widest uppercase text-foreground">Recent Captures</h2>
            <Badge variant="outline" className="font-mono text-[10px] border-border text-muted-foreground">
              {displayScreenshots?.length || 0} ITEMS
            </Badge>
          </div>

          {loadingScreenshots && !displayScreenshots?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-xl border border-border h-64 animate-pulse" />
              ))}
            </div>
          ) : !displayScreenshots?.length ? (
            <div className="text-center py-20 bg-card border border-border rounded-xl">
              <Layers className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-mono text-xs">No captures yet — run one above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayScreenshots.map((s) => (
                <Card key={s.id} className="overflow-hidden bg-card border-border hover:border-primary/30 transition-all duration-200 group shadow-md">
                  <div className="aspect-[16/10] bg-background relative flex items-center justify-center border-b border-border overflow-hidden">
                    {s.status === "completed" && s.imageUrl ? (
                      <img src={s.imageUrl} alt={s.url} className="w-full h-full object-cover object-top" loading="lazy" />
                    ) : s.status === "failed" ? (
                      <div className="text-destructive flex flex-col items-center gap-2 p-4 text-center">
                        <AlertCircle className="w-7 h-7 opacity-70" />
                        <span className="text-[10px] font-mono">{s.error || "Capture Failed"}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-primary">
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Rendering…</span>
                      </div>
                    )}
                    {s.status === "completed" && s.imageUrl && (
                      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a href={s.imageUrl} download target="_blank" rel="noreferrer">
                          <Button size="sm" className="font-mono font-bold tracking-wider text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                            <Download className="w-3.5 h-3.5 mr-1.5" /> PNG
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-3 sm:p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-mono truncate text-foreground font-semibold flex-1" title={s.url}>{s.url}</p>
                      <Badge
                        className={`uppercase text-[9px] tracking-wider shrink-0 border-transparent ${
                          s.status === "completed"
                            ? "bg-primary/15 text-primary"
                            : s.status === "failed"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {s.status}
                      </Badge>
                    </div>

                    {s.status === "completed" && s.imageUrl && (
                      <div className="bg-background border border-border/60 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">Image URL</p>
                          <CopyButton text={s.imageUrl} className="h-5 px-1.5 text-[8px]" />
                        </div>
                        <p className="text-[9px] font-mono text-primary/80 break-all leading-relaxed">{s.imageUrl}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                      <div className="flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border/60">
                        {s.viewport === "desktop" ? <Monitor className="w-2.5 h-2.5" /> : <Smartphone className="w-2.5 h-2.5" />}
                        <span className="font-mono uppercase">{s.viewport}</span>
                      </div>
                      {s.fullPage && (
                        <div className="bg-background px-1.5 py-0.5 rounded border border-border/60">
                          <span className="font-mono uppercase">Full</span>
                        </div>
                      )}
                      <span className="ml-auto font-mono opacity-60">
                        {new Date(s.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── Video Gallery ── */}
        {videos.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-mono font-bold tracking-widest uppercase text-foreground">Recent Recordings</h2>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] border-border text-muted-foreground">
                {videos.length} VIDEO{videos.length !== 1 ? "S" : ""}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((v) => (
                <Card key={v.id} className="overflow-hidden bg-card border-border hover:border-primary/30 transition-all duration-200 shadow-md">
                  <div className="aspect-video bg-background border-b border-border relative flex items-center justify-center overflow-hidden">
                    {v.status === "completed" && v.videoUrl ? (
                      <video
                        src={v.videoUrl}
                        controls
                        className="w-full h-full object-contain bg-black"
                        preload="metadata"
                      />
                    ) : v.status === "failed" ? (
                      <div className="text-destructive flex flex-col items-center gap-2 p-4 text-center">
                        <AlertCircle className="w-7 h-7 opacity-70" />
                        <span className="text-[10px] font-mono">{v.error || "Recording Failed"}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-primary">
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Recording…</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 sm:p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-mono truncate text-foreground font-semibold flex-1" title={v.url}>{v.url}</p>
                      <Badge
                        className={`uppercase text-[9px] tracking-wider shrink-0 border-transparent ${
                          v.status === "completed"
                            ? "bg-primary/15 text-primary"
                            : v.status === "failed"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {v.status}
                      </Badge>
                    </div>
                    {v.status === "completed" && v.videoUrl && (
                      <div className="bg-background border border-border/60 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">Video URL</p>
                          <CopyButton text={v.videoUrl} className="h-5 px-1.5 text-[8px]" />
                        </div>
                        <p className="text-[9px] font-mono text-primary/80 break-all leading-relaxed">{v.videoUrl}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                      <div className="flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border/60">
                        {v.viewport === "desktop" ? <Monitor className="w-2.5 h-2.5" /> : <Smartphone className="w-2.5 h-2.5" />}
                        <span className="font-mono uppercase">{v.viewport}</span>
                      </div>
                      {v.duration != null && (
                        <div className="bg-background px-1.5 py-0.5 rounded border border-border/60">
                          <span className="font-mono">{v.duration}s</span>
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        {v.status === "completed" && v.videoUrl && (
                          <a href={v.videoUrl} download>
                            <Button size="sm" variant="ghost" className="h-6 px-2 font-mono text-[9px] hover:text-primary">
                              <Download className="w-3 h-3 mr-1" /> WEBM
                            </Button>
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 font-mono text-[9px] hover:text-primary"
                          disabled={isRecording}
                          onClick={() => handleRecordVideo(v.url, v.viewport)}
                          title="Record again"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 font-mono text-[9px] hover:text-destructive"
                          onClick={() => handleDeleteVideo(v.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Integration Endpoint ── */}
        {mode === "screenshot" ? (
          <section id="integration" className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center gap-3">
              <div className="bg-primary/10 border border-primary/25 p-1.5 rounded">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-primary">Integration Endpoint</h2>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  Live URL — updates as you change settings above
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Live URL block */}
              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">GET</span>
                    <span className="text-[10px] font-mono text-muted-foreground">Returns PNG directly — embed in anything</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyButton text={liveEndpointUrl} />
                    <a
                      href={liveEndpointUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Try
                    </a>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-lg p-3 sm:p-4 font-mono text-xs break-all">
                  <span className="text-muted-foreground">{API_BASE}</span>
                  <span className="text-primary font-semibold">/capture</span>
                  <span className="text-foreground/50">?</span>
                  <span className="text-primary/70">siteUrl</span>
                  <span className="text-foreground/50">=</span>
                  <span className="text-foreground/80 break-all">{isValidUrl(url) ? url : "https://example.com"}</span>
                  <span className="text-foreground/50">&amp;</span>
                  <span className="text-primary/70">viewport</span>
                  <span className="text-foreground/50">=</span>
                  <span className="text-foreground/80">{viewport}</span>
                  {fullPage && (
                    <>
                      <span className="text-foreground/50">&amp;</span>
                      <span className="text-primary/70">fullPage</span>
                      <span className="text-foreground/50">=</span>
                      <span className="text-foreground/80">true</span>
                    </>
                  )}
                </div>

                <p className="text-[10px] font-mono text-muted-foreground mt-2">
                  Add <code className="text-primary/80 bg-primary/8 px-1 rounded">&amp;format=json</code> to get JSON metadata instead of PNG image.
                </p>
              </div>

              {/* Usage examples */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-background border border-border rounded-lg p-3">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">HTML img tag</p>
                  <code className="text-[10px] font-mono text-foreground/70 break-all block leading-relaxed">
                    <span className="text-primary/60">&lt;img </span>
                    <span className="text-foreground/50">src=</span>
                    <span className="text-foreground/80 break-all">"…/api/capture?siteUrl=…"</span>
                    <span className="text-primary/60"> /&gt;</span>
                  </code>
                </div>
                <div className="bg-background border border-border rounded-lg p-3">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">cURL</p>
                  <code className="text-[10px] font-mono text-foreground/70 break-all block leading-relaxed">
                    <span className="text-primary/60">curl </span>
                    <span className="text-foreground/80 break-all">"{isValidUrl(url) ? liveEndpointUrl.slice(0, 60) + "…" : "…/api/capture?siteUrl=https://…"}"</span>
                    <span className="text-foreground/50"> -o capture.png</span>
                  </code>
                </div>
              </div>

              {/* All screenshot endpoints reference */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">All Endpoints</span>
                </div>
                <div className="bg-background border border-border rounded-lg px-3 sm:px-4 divide-y divide-border/50">
                  {ALL_ENDPOINTS.map(e => (
                    <EndpointRefRow key={e.path + e.method} {...e} />
                  ))}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-2">
                  Base: <span className="text-primary/70">{API_BASE}</span>
                  <span className="mx-2 text-border">·</span>
                  Provider: <span className="text-foreground/60">WOLVAREX</span>
                  <span className="mx-2 text-border">·</span>
                  Creator: <span className="text-foreground/60">Silent Wolf</span>
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section id="video-integration" className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center gap-3">
              <div className="bg-primary/10 border border-primary/25 p-1.5 rounded">
                <Film className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-primary">Video Integration Endpoint</h2>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  Live URL — paste in browser or fetch to get the video directly
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Live GET /record block */}
              <div>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">GET</span>
                    <span className="text-[10px] font-mono text-muted-foreground">Streams WebM directly — paste in browser or embed in anything</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyButton text={liveVideoEndpointUrl} />
                    <a
                      href={liveVideoEndpointUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Try
                    </a>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-lg p-3 sm:p-4 font-mono text-xs break-all">
                  <span className="text-muted-foreground">{API_BASE}</span>
                  <span className="text-primary font-semibold">/record</span>
                  <span className="text-foreground/50">?</span>
                  <span className="text-primary/70">siteUrl</span>
                  <span className="text-foreground/50">=</span>
                  <span className="text-foreground/80 break-all">{isValidUrl(url) ? url : "https://example.com"}</span>
                  <span className="text-foreground/50">&amp;</span>
                  <span className="text-primary/70">viewport</span>
                  <span className="text-foreground/50">=</span>
                  <span className="text-foreground/80">{viewport}</span>
                </div>

                <p className="text-[10px] font-mono text-muted-foreground mt-2">
                  Add <code className="text-primary/80 bg-primary/8 px-1 rounded">&amp;format=json</code> to get JSON metadata instead of the video file.
                </p>
              </div>

              {/* Usage examples */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-background border border-border rounded-lg p-3">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">HTML video tag</p>
                  <code className="text-[10px] font-mono text-foreground/70 break-all block leading-relaxed">
                    <span className="text-primary/60">&lt;video </span>
                    <span className="text-foreground/50">src=</span>
                    <span className="text-foreground/80 break-all">"…/api/record?siteUrl=…"</span>
                    <span className="text-primary/60"> controls /&gt;</span>
                  </code>
                </div>
                <div className="bg-background border border-border rounded-lg p-3">
                  <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-2">cURL</p>
                  <code className="text-[10px] font-mono text-foreground/70 break-all block leading-relaxed">
                    <span className="text-primary/60">curl </span>
                    <span className="text-foreground/80 break-all">"{isValidUrl(url) ? liveVideoEndpointUrl.slice(0, 55) + "…" : "…/api/record?siteUrl=https://…"}"</span>
                    <span className="text-foreground/50"> -o record.webm</span>
                  </code>
                </div>
              </div>

              {/* All video endpoints reference */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-3">
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Video Endpoints</span>
                </div>
                <div className="bg-background border border-border rounded-lg px-3 sm:px-4 divide-y divide-border/50">
                  {ALL_VIDEO_ENDPOINTS.map(e => (
                    <EndpointRefRow key={e.path + e.method} {...e} />
                  ))}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-2">
                  Base: <span className="text-primary/70">{API_BASE}</span>
                  <span className="mx-2 text-border">·</span>
                  Provider: <span className="text-foreground/60">WOLVAREX</span>
                  <span className="mx-2 text-border">·</span>
                  Creator: <span className="text-foreground/60">Silent Wolf</span>
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-border pt-5 pb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground/50">
            <div className="flex items-center gap-4">
              <span>Provider: <span className="text-muted-foreground/70 font-bold">WOLVAREX</span></span>
              <span>Creator: <span className="text-muted-foreground/70 font-bold">Silent Wolf</span></span>
            </div>
            <span>API: <code className="text-primary/50">{API_BASE}</code></span>
          </div>
        </footer>
      </div>
    </div>
  );
}
