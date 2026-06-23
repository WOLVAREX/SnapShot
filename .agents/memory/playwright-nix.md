---
name: Playwright Chromium on Replit Nix
description: How to run Playwright headless Chromium in Replit's Nix environment
---

## Rule
Use the Nix system Chromium (`pkgs.chromium`) as the `executablePath` for Playwright — do NOT rely on Playwright's downloaded binary.

## Why
Playwright's pre-built Chromium binary requires `libgbm.so.1` (Mesa GBM). In Replit's Nix environment, even after installing `pkgs.mesa`, the library is in a Nix store path not on the standard linker search path. The Nix-patched system Chromium has all dependencies correctly patchelf'd.

**REPLIT_LD_LIBRARY_PATH** contains all Nix library paths — setting `LD_LIBRARY_PATH = REPLIT_LD_LIBRARY_PATH` helps for most libraries but NOT for libgbm (it's in a subdirectory of mesa, not the main lib path).

## How to apply
1. Add `pkgs.chromium` to `replit.nix`
2. At startup, run `which chromium` via `execSync` to get the Nix store path
3. Pass that path as `executablePath` to `chromium.launch()`
4. Keep `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu` flags
5. Attach `browser.on("disconnected", () => { browserPromise = null; })` so the browser auto-relaunches

## Detection snippet (in screenshot.ts)
```typescript
const sysBin = execSync("which chromium 2>/dev/null", { encoding: "utf8", timeout: 3000 }).trim();
if (sysBin && existsSync(sysBin)) return sysBin;
```
