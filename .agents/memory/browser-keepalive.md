---
name: Playwright browser keepalive pattern
description: How to safely cache and reuse a Playwright browser instance across requests
---

## Rule
Always attach a `disconnected` event listener that resets the cached browser promise. Check `browser.isConnected()` before reuse.

## Why
Playwright browsers can crash or close unexpectedly (OOM, OS signal, etc.). If `browserPromise` is cached and the browser dies, subsequent `browser.newContext()` calls fail with "Target page, context or browser has been closed" without a clear explanation. Resetting the cache forces a relaunch on the next call.

## How to apply
```typescript
let browserPromise: Promise<Browser> | null = null;

function launchBrowser(): Promise<Browser> {
  return chromium.launch({ executablePath: ..., args: [...] }).then((browser) => {
    browser.on("disconnected", () => {
      browserPromise = null; // force relaunch on next request
    });
    return browser;
  });
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => { browserPromise = null; throw err; });
  }
  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = launchBrowser().catch((err) => { browserPromise = null; throw err; });
    return browserPromise;
  }
  return browser;
}
```
