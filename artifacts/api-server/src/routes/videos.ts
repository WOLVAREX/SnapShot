import { Router, type IRouter, type Request } from "express";
import fs from "fs";
import { recordVideo, getVideo, listVideos, getVideoFilePath, deleteVideo } from "../lib/screenrecord";

const PROVIDER = "WOLVAREX";
const CREATOR = "Silent Wolf";

function getBaseUrl(req: Request): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0].trim()}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;

  const forwarded = req.get("x-forwarded-host");
  if (forwarded) {
    const proto = req.get("x-forwarded-proto") || "https";
    return `${proto}://${forwarded}`;
  }

  const proto = req.protocol;
  const host = req.get("host");
  if (host && !host.startsWith("localhost")) return `${proto}://${host}`;

  return `${proto}://localhost:${process.env.PORT || 4000}`;
}

const router: IRouter = Router();

router.get("/record", async (req, res): Promise<void> => {
  const { siteUrl, viewport, format } = req.query as Record<string, string | undefined>;

  if (!siteUrl) {
    res.status(400).json({ error: "Missing required query param: siteUrl" });
    return;
  }
  try { new URL(siteUrl); } catch {
    res.status(400).json({ error: "Invalid siteUrl format" });
    return;
  }
  const vp: "desktop" | "mobile" = viewport === "mobile" ? "mobile" : "desktop";

  try {
    const meta = await recordVideo(req.sessionId, siteUrl, vp);
    if (format === "json") {
      const base = getBaseUrl(req);
      res.json({
        ...meta,
        videoUrl: meta.videoUrl ? `${base}${meta.videoUrl}` : null,
        provider: PROVIDER,
        creator: CREATOR,
      });
      return;
    }
    const filePath = getVideoFilePath(meta.id);
    if (!fs.existsSync(filePath)) {
      res.status(500).json({ error: "Video recorded but file not found" });
      return;
    }
    const stat = fs.statSync(filePath);
    res.setHeader("Content-Type", "video/webm");
    res.setHeader("Content-Disposition", `inline; filename="record.webm"`);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=60");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    req.log.error({ err }, "Record endpoint error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Recording failed" });
  }
});

router.post("/video", async (req, res): Promise<void> => {
  const { url, viewport: rawViewport } = req.body ?? {};
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }
  try { new URL(url); } catch {
    res.status(400).json({ error: "Invalid URL format" });
    return;
  }
  const viewport: "desktop" | "mobile" = rawViewport === "mobile" ? "mobile" : "desktop";

  try {
    const meta = await recordVideo(req.sessionId, url, viewport);
    const base = getBaseUrl(req);
    res.json({
      ...meta,
      videoUrl: meta.videoUrl ? `${base}${meta.videoUrl}` : null,
      provider: PROVIDER,
      creator: CREATOR,
    });
  } catch (err) {
    req.log.error({ err }, "Video recording error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Recording failed" });
  }
});

router.get("/videos", (req, res): void => {
  const base = getBaseUrl(req);
  const videos = listVideos(req.sessionId).map((v) => ({
    ...v,
    videoUrl: v.videoUrl ? `${base}${v.videoUrl}` : null,
    provider: PROVIDER,
    creator: CREATOR,
  }));
  res.json(videos);
});

router.get("/videos/:id", (req, res): void => {
  const { id } = req.params;
  if (!id || !/^[a-f0-9-]+$/i.test(id)) {
    res.status(400).json({ error: "Invalid video ID" });
    return;
  }
  const meta = getVideo(req.sessionId, id);
  if (!meta) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  const base = getBaseUrl(req);
  res.json({
    ...meta,
    videoUrl: meta.videoUrl ? `${base}${meta.videoUrl}` : null,
    provider: PROVIDER,
    creator: CREATOR,
  });
});

router.get("/videos/:id/file", (req, res): void => {
  const { id } = req.params;
  if (!id || !/^[a-f0-9-]+$/i.test(id)) {
    res.status(400).json({ error: "Invalid video ID" });
    return;
  }
  const meta = getVideo(req.sessionId, id);
  if (!meta || meta.status !== "completed") {
    res.status(404).json({ error: "Video not ready" });
    return;
  }
  const filePath = getVideoFilePath(id);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Video file not found" });
    return;
  }
  const stat = fs.statSync(filePath);
  res.setHeader("Content-Type", "video/webm");
  res.setHeader("Content-Disposition", `inline; filename="${id}.webm"`);
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Accept-Ranges", "bytes");
  fs.createReadStream(filePath).pipe(res);
});

router.delete("/videos/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!id || !/^[a-f0-9-]+$/i.test(id)) {
    res.status(400).json({ error: "Invalid video ID" });
    return;
  }
  const deleted = await deleteVideo(req.sessionId, id);
  if (!deleted) {
    res.status(404).json({ error: "Video not found" });
    return;
  }
  res.status(204).end();
});

export default router;
