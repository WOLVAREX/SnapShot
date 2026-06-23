import { type BrowserContext } from "playwright";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { existsSync, createWriteStream } from "fs";
import { createRequire } from "module";
import { logger } from "./logger";
import { getBrowser } from "./browser";

const _require = createRequire(import.meta.url);
// archiver v5 is CJS — createRequire loads it correctly as a callable function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const archiverFactory = _require("archiver") as (format: string, opts?: object) => any;

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const screenshotsDir = path.resolve(workspaceRoot, "artifacts/api-server/screenshots");

export interface ScreenshotMeta {
  id: string;
  url: string;
  viewport: "desktop" | "mobile";
  fullPage: boolean;
  status: "pending" | "completed" | "failed";
  error: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface BulkJobMeta {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  total: number;
  completed: number;
  failed: number;
  zipUrl: string | null;
  screenshots: ScreenshotMeta[];
  createdAt: string;
}

// Per-session stores: sessionId → (id → meta)
const sessionScreenshotStore = new Map<string, Map<string, ScreenshotMeta>>();
const sessionBulkJobStore = new Map<string, Map<string, BulkJobMeta>>();

function getScreenshotStore(sessionId: string): Map<string, ScreenshotMeta> {
  let store = sessionScreenshotStore.get(sessionId);
  if (!store) {
    store = new Map();
    sessionScreenshotStore.set(sessionId, store);
  }
  return store;
}

function getBulkStore(sessionId: string): Map<string, BulkJobMeta> {
  let store = sessionBulkJobStore.get(sessionId);
  if (!store) {
    store = new Map();
    sessionBulkJobStore.set(sessionId, store);
  }
  return store;
}

async function ensureScreenshotsDir(): Promise<void> {
  await fs.mkdir(screenshotsDir, { recursive: true });
}

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 390, height: 844, isMobile: true, hasTouch: true };

export async function captureScreenshot(
  sessionId: string,
  url: string,
  viewport: "desktop" | "mobile" = "desktop",
  fullPage = false
): Promise<ScreenshotMeta> {
  await ensureScreenshotsDir();

  const id = randomUUID();
  const meta: ScreenshotMeta = {
    id,
    url,
    viewport,
    fullPage,
    status: "pending",
    error: null,
    imageUrl: null,
    createdAt: new Date().toISOString(),
  };
  getScreenshotStore(sessionId).set(id, meta);

  let context: BrowserContext | null = null;
  try {
    const browser = await getBrowser();
    const vp = viewport === "mobile" ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT;
    context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: "isMobile" in vp ? vp.isMobile : false,
      hasTouch: "hasTouch" in vp ? vp.hasTouch : false,
      userAgent: viewport === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        : undefined,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    const filename = `${id}.png`;
    const filepath = path.join(screenshotsDir, filename);
    await page.screenshot({ path: filepath, fullPage });

    meta.status = "completed";
    meta.imageUrl = `/api/screenshots/${id}/image`;
    logger.info({ id, url }, "Screenshot captured");
  } catch (err) {
    meta.status = "failed";
    meta.error = err instanceof Error ? err.message : String(err);
    logger.error({ id, url, err }, "Screenshot failed");
  } finally {
    if (context) await context.close().catch(() => {});
  }

  getScreenshotStore(sessionId).set(id, meta);
  scheduleCleanup(sessionId, id);
  return meta;
}

export async function discoverPagesFromUrl(url: string): Promise<{ baseUrl: string; pages: Array<{ url: string; path: string; label: string }> }> {
  const parsedUrl = new URL(url);
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

  const pages: Array<{ url: string; path: string; label: string }> = [
    { url: baseUrl + "/", path: "/", label: "Home" },
  ];

  let context: BrowserContext | null = null;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    const links = await page.evaluate((origin) => {
      const anchors = Array.from(document.querySelectorAll("a[href]"));
      const seen = new Set<string>();
      const results: Array<{ href: string; text: string }> = [];

      for (const a of anchors) {
        const href = (a as HTMLAnchorElement).href;
        const text = (a.textContent || "").trim();
        try {
          const linkUrl = new URL(href);
          if (linkUrl.origin !== origin) continue;
          const pathname = linkUrl.pathname;
          if (seen.has(pathname)) continue;
          if (pathname === "/" || !pathname) continue;
          if (pathname.includes("#") || pathname.includes("?")) continue;
          if (/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js|ico)$/i.test(pathname)) continue;
          seen.add(pathname);
          results.push({ href: linkUrl.origin + pathname, text: text.slice(0, 50) || pathname });
          if (results.length >= 20) break;
        } catch {}
      }
      return results;
    }, parsedUrl.origin);

    for (const link of links) {
      const linkPath = new URL(link.href).pathname;
      const label = link.text || linkPath.split("/").filter(Boolean).join(" ") || linkPath;
      pages.push({
        url: link.href,
        path: linkPath,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    }
    logger.info({ url, count: pages.length }, "Pages discovered");
  } catch (err) {
    logger.warn({ url, err }, "Page discovery failed, returning root only");
  } finally {
    if (context) await context.close().catch(() => {});
  }

  return { baseUrl, pages };
}

export async function startBulkJob(
  sessionId: string,
  baseUrl: string,
  paths: string[],
  viewport: "desktop" | "mobile" = "desktop",
  fullPage = false
): Promise<BulkJobMeta> {
  const jobId = randomUUID();
  const job: BulkJobMeta = {
    jobId,
    status: "running",
    total: paths.length,
    completed: 0,
    failed: 0,
    zipUrl: null,
    screenshots: [],
    createdAt: new Date().toISOString(),
  };
  getBulkStore(sessionId).set(jobId, job);

  processBulkJob(sessionId, jobId, baseUrl, paths, viewport, fullPage).catch((err) => {
    logger.error({ jobId, err }, "Bulk job failed");
    const j = getBulkStore(sessionId).get(jobId);
    if (j) { j.status = "failed"; getBulkStore(sessionId).set(jobId, j); }
  });

  return job;
}

async function processBulkJob(
  sessionId: string,
  jobId: string,
  baseUrl: string,
  paths: string[],
  viewport: "desktop" | "mobile",
  fullPage: boolean
): Promise<void> {
  await ensureScreenshotsDir();

  const bulkStore = getBulkStore(sessionId);

  for (const pagePath of paths) {
    const url = baseUrl.replace(/\/$/, "") + (pagePath.startsWith("/") ? pagePath : "/" + pagePath);
    const meta = await captureScreenshot(sessionId, url, viewport, fullPage);
    const job = bulkStore.get(jobId)!;
    job.screenshots.push(meta);
    if (meta.status === "completed") {
      job.completed++;
    } else {
      job.failed++;
    }
    bulkStore.set(jobId, job);
  }

  const job = bulkStore.get(jobId)!;

  const completedShots = job.screenshots.filter((s) => s.status === "completed");
  if (completedShots.length > 0) {
    const zipFilename = `bulk-${jobId}.zip`;
    const zipPath = path.join(screenshotsDir, zipFilename);

    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(zipPath);
      const archive = archiverFactory("zip", { zlib: { level: 6 } });
      output.on("close", resolve);
      archive.on("error", reject);
      archive.pipe(output);
      for (const s of completedShots) {
        const imgPath = path.join(screenshotsDir, `${s.id}.png`);
        const label = new URL(s.url).pathname.replace(/\//g, "_").replace(/^_/, "") || "root";
        const entryName = `${label}_${s.id.slice(0, 8)}.png`;
        archive.file(imgPath, { name: entryName });
      }
      archive.finalize();
    });

    job.zipUrl = `/api/bulk/${jobId}/zip`;
  }

  job.status = "completed";
  bulkStore.set(jobId, job);
  logger.info({ jobId, completed: job.completed, failed: job.failed }, "Bulk job completed");
}

export function getScreenshot(sessionId: string, id: string): ScreenshotMeta | undefined {
  return getScreenshotStore(sessionId).get(id);
}

export function listScreenshots(sessionId: string): ScreenshotMeta[] {
  return Array.from(getScreenshotStore(sessionId).values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);
}

export function getBulkJob(sessionId: string, jobId: string): BulkJobMeta | undefined {
  return getBulkStore(sessionId).get(jobId);
}

export function getScreenshotImagePath(id: string): string {
  return path.join(screenshotsDir, `${id}.png`);
}

export function getBulkZipPath(jobId: string): string {
  return path.join(screenshotsDir, `bulk-${jobId}.zip`);
}

const CLEANUP_DELAY_MS = 60 * 60 * 1000;

function scheduleCleanup(sessionId: string, id: string): void {
  setTimeout(async () => {
    const store = sessionScreenshotStore.get(sessionId);
    if (store) {
      store.delete(id);
      if (store.size === 0) sessionScreenshotStore.delete(sessionId);
    }
    try {
      await fs.unlink(path.join(screenshotsDir, `${id}.png`));
    } catch {}
  }, CLEANUP_DELAY_MS);
}
