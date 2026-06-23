import { Router, type IRouter, type Request } from "express";
import fs from "fs";
import {
  TakeScreenshotBody,
  TakeBulkScreenshotsBody,
  GetScreenshotParams,
  GetBulkJobParams,
} from "@workspace/api-zod";
import {
  captureScreenshot,
  getScreenshot,
  listScreenshots,
  startBulkJob,
  getBulkJob,
  getScreenshotImagePath,
  getBulkZipPath,
} from "../lib/screenshot";

const PROVIDER = "WOLVAREX";
const CREATOR = "Silent Wolf";

function getBaseUrl(req: Request): string {
  // Replit deployment
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0].trim()}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;

  // Behind a reverse proxy (nginx sets X-Forwarded-Host or Host)
  const forwarded = req.get("x-forwarded-host");
  if (forwarded) {
    const proto = req.get("x-forwarded-proto") || "https";
    return `${proto}://${forwarded}`;
  }

  // req.protocol is correct when app.set('trust proxy', 1) is set
  const proto = req.protocol;
  const host = req.get("host");
  if (host && !host.startsWith("localhost")) {
    return `${proto}://${host}`;
  }

  return `${proto}://localhost:${process.env.PORT || 4000}`;
}

function withMeta<T extends { imageUrl?: string | null }>(
  base: string,
  data: T
): T & { provider: string; creator: string } {
  return {
    ...data,
    imageUrl: data.imageUrl ? `${base}${data.imageUrl}` : data.imageUrl,
    provider: PROVIDER,
    creator: CREATOR,
  };
}

function withMetaList<T extends { imageUrl?: string | null }>(
  base: string,
  items: T[]
): (T & { provider: string; creator: string })[] {
  return items.map((item) => withMeta(base, item));
}

const router: IRouter = Router();

router.post("/screenshot", async (req, res): Promise<void> => {
  const parsed = TakeScreenshotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { url, viewport = "desktop", fullPage = false } = parsed.data;

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL format" });
    return;
  }

  try {
    const result = await captureScreenshot(req.sessionId, url, viewport, fullPage);
    res.json(withMeta(getBaseUrl(req), result));
  } catch (err) {
    req.log.error({ err }, "Screenshot capture error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Screenshot failed" });
  }
});

router.get("/screenshots", (req, res): void => {
  res.json(withMetaList(getBaseUrl(req), listScreenshots(req.sessionId)));
});

router.post("/screenshots/bulk", async (req, res): Promise<void> => {
  const parsed = TakeBulkScreenshotsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { baseUrl, paths, viewport = "desktop", fullPage = false } = parsed.data;

  try {
    new URL(baseUrl);
  } catch {
    res.status(400).json({ error: "Invalid base URL format" });
    return;
  }

  try {
    const job = await startBulkJob(req.sessionId, baseUrl, paths, viewport, fullPage);
    res.json({ ...job, provider: PROVIDER, creator: CREATOR });
  } catch (err) {
    req.log.error({ err }, "Bulk screenshot error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Bulk job failed" });
  }
});

router.get("/capture", async (req, res): Promise<void> => {
  const { siteUrl, viewport, fullPage, format } = req.query as Record<string, string | undefined>;

  if (!siteUrl) {
    res.status(400).json({ error: "Missing required query param: siteUrl" });
    return;
  }
  try {
    new URL(siteUrl);
  } catch {
    res.status(400).json({ error: "Invalid siteUrl format" });
    return;
  }

  const vp = viewport === "mobile" ? "mobile" : "desktop";
  const fp = fullPage === "true" || fullPage === "1";

  try {
    const result = await captureScreenshot(req.sessionId, siteUrl, vp, fp);
    if (format === "json") {
      res.json(withMeta(getBaseUrl(req), result));
      return;
    }
    const imgPath = getScreenshotImagePath(result.id);
    if (!fs.existsSync(imgPath)) {
      res.status(500).json({ error: "Screenshot captured but file not found" });
      return;
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="capture.png"`);
    res.setHeader("Cache-Control", "public, max-age=60");
    fs.createReadStream(imgPath).pipe(res);
  } catch (err) {
    req.log.error({ err }, "Capture endpoint error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Capture failed" });
  }
});

router.get("/screenshots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetScreenshotParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const meta = getScreenshot(req.sessionId, params.data.id);
  if (!meta) {
    res.status(404).json({ error: "Screenshot not found" });
    return;
  }
  res.json(withMeta(getBaseUrl(req), meta));
});

router.get("/screenshots/:id/image", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!raw || !/^[a-f0-9-]+$/i.test(raw)) {
    res.status(400).json({ error: "Invalid screenshot ID" });
    return;
  }
  const meta = getScreenshot(req.sessionId, raw);
  if (!meta || meta.status !== "completed") {
    res.status(404).json({ error: "Screenshot image not found" });
    return;
  }
  const imgPath = getScreenshotImagePath(raw);
  if (!fs.existsSync(imgPath)) {
    res.status(404).json({ error: "Screenshot file not found" });
    return;
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `inline; filename="${raw}.png"`);
  fs.createReadStream(imgPath).pipe(res);
});

router.get("/bulk/:jobId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const params = GetBulkJobParams.safeParse({ jobId: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const job = getBulkJob(req.sessionId, params.data.jobId);
  if (!job) {
    res.status(404).json({ error: "Bulk job not found" });
    return;
  }
  const base = getBaseUrl(req);
  res.json({
    ...job,
    zipUrl: job.zipUrl ? `${base}${job.zipUrl}` : job.zipUrl,
    screenshots: withMetaList(base, job.screenshots),
    provider: PROVIDER,
    creator: CREATOR,
  });
});

router.get("/bulk/:jobId/zip", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  if (!raw || !/^[a-f0-9-]+$/i.test(raw)) {
    res.status(400).json({ error: "Invalid job ID" });
    return;
  }
  const job = getBulkJob(req.sessionId, raw);
  if (!job || job.status !== "completed" || !job.zipUrl) {
    res.status(404).json({ error: "ZIP not ready or not found" });
    return;
  }
  const zipPath = getBulkZipPath(raw);
  if (!fs.existsSync(zipPath)) {
    res.status(404).json({ error: "ZIP file not found" });
    return;
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="screenshots-${raw}.zip"`);
  fs.createReadStream(zipPath).pipe(res);
});

export default router;
