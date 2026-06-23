import { Router, type IRouter } from "express";
import { DiscoverPagesBody } from "@workspace/api-zod";
import { discoverPagesFromUrl } from "../lib/screenshot";

const router: IRouter = Router();

router.post("/pages/discover", async (req, res): Promise<void> => {
  const parsed = DiscoverPagesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { url } = parsed.data;

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL format" });
    return;
  }

  try {
    const result = await discoverPagesFromUrl(url);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Page discovery error");
    res.status(500).json({ error: err instanceof Error ? err.message : "Page discovery failed" });
  }
});

export default router;
