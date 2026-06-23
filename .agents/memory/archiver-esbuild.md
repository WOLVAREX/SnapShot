---
name: Archiver CJS on ESM esbuild bundle
description: How to use the archiver ZIP library in an esbuild-bundled ESM server
---

## Rule
Use **archiver v5** (not v8) and externalize it from esbuild. Load it with `createRequire`.

## Why
- archiver v8 is pure ESM with named class exports (`ZipArchive`, etc.) — no default callable function
- archiver v5 is CJS with `module.exports = archiver` (a callable function)
- esbuild bundles CJS modules and wraps them; the wrapped result may not be callable when accessed via dynamic import or a second `createRequire`
- Externalizing archiver ensures Node loads it as a real CJS module at runtime

## How to apply
1. Install archiver v5: `pnpm add archiver@5`
2. Add `"archiver"` to the `external` array in `build.mjs`
3. In the source file:
```typescript
import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const archiverFactory = _require("archiver") as (format: string, opts?: object) => any;
```
4. Use: `const archive = archiverFactory("zip", { zlib: { level: 6 } });`
