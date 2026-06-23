import { chromium, type Browser } from "playwright";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { logger } from "./logger";

let browserPromise: Promise<Browser> | null = null;

const CHROMIUM_EXECUTABLE = (() => {
  try {
    const sysBin = execSync(
      "which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null",
      { encoding: "utf8", timeout: 3000 }
    ).trim();
    if (sysBin && existsSync(sysBin)) {
      logger.info({ executablePath: sysBin }, "Using system Chromium");
      return sysBin;
    }
  } catch {}

  const cacheBase = process.cwd().endsWith(path.join("artifacts", "api-server"))
    ? path.resolve(process.cwd(), "../..", ".cache/ms-playwright")
    : path.resolve(process.cwd(), ".cache/ms-playwright");

  const candidates = [
    path.join(cacheBase, "chromium-1228/chrome-linux64/chrome"),
    path.join(cacheBase, "chromium-1227/chrome-linux64/chrome"),
    path.join(cacheBase, "chromium-1229/chrome-linux64/chrome"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return undefined;
})();

function setLibraryPath(): void {
  if (process.env.REPLIT_LD_LIBRARY_PATH && !process.env.LD_LIBRARY_PATH) {
    process.env.LD_LIBRARY_PATH = process.env.REPLIT_LD_LIBRARY_PATH;
  } else if (process.env.REPLIT_LD_LIBRARY_PATH && process.env.LD_LIBRARY_PATH) {
    process.env.LD_LIBRARY_PATH = `${process.env.REPLIT_LD_LIBRARY_PATH}:${process.env.LD_LIBRARY_PATH}`;
  }
}

function launchBrowser(): Promise<Browser> {
  setLibraryPath();
  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
    ],
  };
  if (CHROMIUM_EXECUTABLE) {
    launchOptions.executablePath = CHROMIUM_EXECUTABLE;
  }
  return chromium.launch(launchOptions).then((browser) => {
    browser.on("disconnected", () => {
      logger.warn("Browser disconnected, will relaunch on next request");
      browserPromise = null;
    });
    return browser;
  });
}

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
  }
  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = launchBrowser().catch((err) => {
      browserPromise = null;
      throw err;
    });
    return browserPromise;
  }
  return browser;
}
