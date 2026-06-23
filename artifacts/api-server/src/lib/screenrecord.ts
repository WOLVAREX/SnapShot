import { type BrowserContext } from "playwright";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { getBrowser } from "./browser";
import { logger } from "./logger";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const videosDir = path.resolve(workspaceRoot, "artifacts/api-server/videos");

export interface VideoMeta {
  id: string;
  url: string;
  viewport: "desktop" | "mobile";
  status: "pending" | "recording" | "completed" | "failed";
  error: string | null;
  videoUrl: string | null;
  duration: number | null;
  createdAt: string;
}

const sessionVideoStore = new Map<string, Map<string, VideoMeta>>();

function getVideoStore(sessionId: string): Map<string, VideoMeta> {
  let store = sessionVideoStore.get(sessionId);
  if (!store) {
    store = new Map();
    sessionVideoStore.set(sessionId, store);
  }
  return store;
}

async function ensureVideosDir(): Promise<void> {
  await fs.mkdir(videosDir, { recursive: true });
}

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

export async function recordVideo(
  sessionId: string,
  url: string,
  viewport: "desktop" | "mobile" = "desktop"
): Promise<VideoMeta> {
  await ensureVideosDir();

  const id = randomUUID();
  const meta: VideoMeta = {
    id,
    url,
    viewport,
    status: "recording",
    error: null,
    videoUrl: null,
    duration: null,
    createdAt: new Date().toISOString(),
  };
  getVideoStore(sessionId).set(id, meta);

  const startTime = Date.now();
  const vp = viewport === "mobile" ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT;

  const videoTempDir = path.join(videosDir, `tmp-${id}`);
  await fs.mkdir(videoTempDir, { recursive: true });

  let context: BrowserContext | null = null;

  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: viewport === "mobile",
      hasTouch: viewport === "mobile",
      userAgent: viewport === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
        : undefined,
      recordVideo: {
        dir: videoTempDir,
        size: { width: vp.width, height: vp.height },
      },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // Pause at top so the initial view is captured
    await new Promise((r) => setTimeout(r, 1200));

    // Smooth scroll down the page
    await page.evaluate(async () => {
      const totalHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const viewportH = window.innerHeight;
      const scrollable = totalHeight - viewportH;
      if (scrollable <= 0) return;

      await new Promise<void>((resolve) => {
        let scrolled = 0;
        const step = 3;
        const id = setInterval(() => {
          scrolled += step;
          window.scrollBy(0, step);
          if (scrolled >= scrollable) {
            window.scrollTo(0, scrollable);
            clearInterval(id);
            resolve();
          }
        }, 16);
      });
    });

    // Pause at bottom
    await new Promise((r) => setTimeout(r, 1500));

    // Scroll back to top
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const id = setInterval(() => {
          window.scrollBy(0, -6);
          if (window.scrollY <= 0) {
            window.scrollTo(0, 0);
            clearInterval(id);
            resolve();
          }
        }, 16);
      });
    });

    // Pause at top again before ending
    await new Promise((r) => setTimeout(r, 800));

    // Get video reference before closing
    const video = page.video();
    await page.close();
    await context.close();
    context = null;

    if (!video) throw new Error("No video recorded — check Playwright recordVideo support");

    const rawPath = await video.path();
    const destPath = path.join(videosDir, `${id}.webm`);
    await fs.rename(rawPath, destPath);

    // Clean up temp dir
    await fs.rm(videoTempDir, { recursive: true, force: true }).catch(() => {});

    meta.status = "completed";
    meta.videoUrl = `/api/videos/${id}/file`;
    meta.duration = Math.round((Date.now() - startTime) / 1000);
    logger.info({ id, url, duration: meta.duration }, "Video recorded");
  } catch (err) {
    meta.status = "failed";
    meta.error = err instanceof Error ? err.message : String(err);
    logger.error({ id, url, err }, "Video recording failed");
    await fs.rm(videoTempDir, { recursive: true, force: true }).catch(() => {});
  } finally {
    if (context) await context.close().catch(() => {});
  }

  getVideoStore(sessionId).set(id, meta);
  scheduleVideoCleanup(sessionId, id);
  return meta;
}

export function getVideo(sessionId: string, id: string): VideoMeta | undefined {
  return getVideoStore(sessionId).get(id);
}

export function listVideos(sessionId: string): VideoMeta[] {
  return Array.from(getVideoStore(sessionId).values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
}

export function getVideoFilePath(id: string): string {
  return path.join(videosDir, `${id}.webm`);
}

export async function deleteVideo(sessionId: string, id: string): Promise<boolean> {
  const store = sessionVideoStore.get(sessionId);
  if (!store || !store.has(id)) return false;
  store.delete(id);
  if (store.size === 0) sessionVideoStore.delete(sessionId);
  try { await fs.unlink(path.join(videosDir, `${id}.webm`)); } catch {}
  return true;
}

const CLEANUP_DELAY_MS = 60 * 60 * 1000;

function scheduleVideoCleanup(sessionId: string, id: string): void {
  setTimeout(async () => {
    const store = sessionVideoStore.get(sessionId);
    if (store) {
      store.delete(id);
      if (store.size === 0) sessionVideoStore.delete(sessionId);
    }
    try { await fs.unlink(path.join(videosDir, `${id}.webm`)); } catch {}
  }, CLEANUP_DELAY_MS);
}
