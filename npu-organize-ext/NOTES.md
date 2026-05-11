# NPU Organize — maintenance notes

Extension-specific detail for **`npu-organize-ext`**. Suite workflow: **`CONTRIBUTING.md`**. Wiring table: **`EXTENSION_REGISTRY.md`**. Forward roadmap (active scope): **`docs/FORWARD_ROADMAP.md` §6**. Deep archive: **`FEATURE_PLAN.md`**.

## Phase coverage

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Bridge spike + TS dry-run | ✅ | `screenshot-title` argv on the bridge; `Dry Run Screenshot Rename` Raycast command. |
| 1 — Manual rename + sanitizer + collisions + prefs | ✅ | `Rename New Screenshots` command, deterministic slug + fallback hash, `-2/-3` collision resolver, prefs in `package.json`. |
| 2 — Resident watcher (`FileSystemWatcher` companion) | ⏳ Roadmap §6.5 / §9 | Not in this extension yet. |
| 3 — Polish (multi-folder, monthly subfolders, telemetry) | ⏳ Roadmap §6.5 / §9 | Not in this extension yet. |

## Structure

- `src/`
  - `rename-new-screenshots.tsx` — thin entrypoint that mounts the shared list in rename mode.
  - `dry-run-screenshot-rename.tsx` — same list in read-only mode.
  - `shared/screenshot-list.tsx` — `<List>` UI; sequentially calls `planRename` per candidate, supports per-row and batch rename with confirmation.
  - `utils/slug.ts` — pure title→slug pipeline (lowercase, allowlist `[a-z0-9-]`, token cap, length cap, fallback hash). Imported by tests; no Node/Raycast imports.
  - `utils/slug.test.ts` — Vitest suite (`npm run test`).
  - `utils/screenshots.ts` — preferences resolver + screenshot folder scanner.
  - `utils/rename-pipeline.ts` — `planRename` (bridge call + slug + collision) and `applyProposal` (atomic `fs.renameSync` with overwrite guard).
  - `utils/run-bridge.ts` — `execFile`-based spawner; appends `--ensure-ready` when the pref is on.
  - `utils/ensure-bridge-registered.ts` — one-shot sparse-package registration (matches the image-editor pattern).
- `bridge/`
  - `Program.cs` — single verb `screenshot-title <imagePath> [--ensure-ready] [--no-ocr]`. Loads the image, optionally runs `OcrEngine.RecognizeAsync`, then calls `ImageDescriptionGenerator.DescribeAsync(buffer, ImageDescriptionKind.BriefDescription, ContentFilterOptions)` and emits one JSON line.
  - `NpuBridge.csproj` — `Microsoft.WindowsAppSDK 2.0.1` **+** `Microsoft.WindowsAppSDK.AI 2.0.185` (mirrors the imaging bridge, since `ImageDescriptionGenerator` ships in the AI satellite). Output assembly name is `NpuBridge.exe`.
  - `Package.appxmanifest` — identity `NpuOrganizeBridge.Identity`, capability `systemAIModels` (required for Image Description per Microsoft docs).

## Behavior

- **Watched folder** defaults to `%UserProfile%\Pictures\Screenshots`. Override via the **Screenshots Folder** preference.
- **Date format** matches the notes convention (`{YYYY-MM-DD}_{slug}.{ext}`) — see `npu-notes-ext/src/utils/note-utils.ts` `saveNote`.
- **Capture date** is the file's `birthtime` when valid, else `mtime` — see `pickCaptureDate` in `utils/screenshots.ts`.
- **Slug pipeline:**
  1. Bridge returns the brief description and an OCR excerpt.
  2. TS `slugify()` lowercases, strips diacritics + punctuation, drops stopwords (including "screenshot", "image", "shows"), keeps the first N tokens (`maxSlugTokens` pref), caps at 60 chars.
  3. If `confidence` is `low` or the slug is empty, falls back to `screenshot-{8-char FNV-1a hash}` derived from the file path + capture timestamp (deterministic).
- **Collisions:** `resolveCollision` appends `-2`, `-3`, ... using a case-insensitive name set seeded from `fs.readdirSync` plus any names queued earlier in the same batch.
- **Never overwrites:** `applyProposal` checks `fs.existsSync(dest)` again before `renameSync`.
- **Anti-loop guard:** the **Skip Already-Named Files** pref (default on) filters out any file whose basename already begins with `YYYY-MM-DD_`.

## Building the bridge

```powershell
cd npu-organize-ext\bridge
dotnet publish -c Release -r win-x64 --self-contained true -o ..\assets\bin
```

ARM Copilot+ PC: `-r win-arm64`. From the repo root, run `.\register-bridge.ps1` as Administrator after the first publish (the script already includes this bridge).

## Tests

```powershell
cd npu-organize-ext
npm install
npm run test   # Vitest — covers slug.ts (sanitizer, builder, collision resolver, fallback hash, isAlreadyDateNamed)
npm run lint
```

The Vitest suite intentionally has no Windows dependencies; it runs the same way in CI and on dev machines without the WindowsAppSDK.

## API references

- **Image Description (canonical):** [`docs/REWRITE_INFO.md`](../docs/REWRITE_INFO.md) (Phi context) + Microsoft's [`image-description.md`](https://learn.microsoft.com/en-us/windows/ai/apis/image-description). The bridge uses `ImageDescriptionKind.BriefDescription` (caption scenario), matching the AI Dev Gallery "Describe Image WCR" sample.
- **OCR:** `Windows.Media.Ocr.OcrEngine.TryCreateFromUserProfileLanguages()` — same engine the imaging bridge uses for its standalone `ocr` verb.

## Suite pointer

This file **replaces long-form duplication** under `GEMINI.md` / `AGENTS.md` / `CLAUDE.md` for this folder — those stubs live only at the repo root and redirect here.
