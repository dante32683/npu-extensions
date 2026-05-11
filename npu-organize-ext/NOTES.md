# NPU Organize — maintenance notes

Extension-specific detail for **`npu-organize-ext`**. Suite workflow: **`CONTRIBUTING.md`**. Wiring table: **`EXTENSION_REGISTRY.md`**. Forward roadmap (active scope): **`docs/FORWARD_ROADMAP.md` §6**. Deep archive: **`FEATURE_PLAN.md`**.

## Phase coverage

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Bridge spike + TS dry-run | ✅ | `screenshot-title` argv on the bridge; `Dry Run Screenshot Rename` Raycast command. |
| 1 — Manual rename + sanitizer + collisions + prefs | ✅ | `Rename New Screenshots` command, deterministic slug + fallback hash, `-2/-3` collision resolver, prefs in `package.json`. |
| 2 — Resident watcher (`FileSystemWatcher` companion, battery skip, debounce, backlog cursor) | ✅ | `OrganizeKeeper.exe`, `Start/Stop/Status` commands, `%LocalAppData%\NpuOrganize\` state + log + config + stop.flag, hot-reload on config change, parity-checked slug logic. |
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
- `keeper/` — **Phase 2 resident process** (zero-NuGet, BCL-only, self-contained .NET 8 publish):
  - `Program.cs` — argv dispatcher: `watch` (default), `status`, `process-one <path>`, `parity-check`.
  - `Watcher.cs` — `FileSystemWatcher` on the configured folder, **per-path debounce** (`debounceMs` pref) coalescing `Created/Changed/Renamed` bursts. Skips on battery (`PowerStatus.IsOnAcPower` P/Invoke), tries to open the file exclusively for read (up to 5s) before processing so Snipping Tool / Game Bar don't race the rename.
  - `SlugGenerator.cs` — **verbatim port** of `src/utils/slug.ts`. Parity enforced by `ParityCheck.Run()` (invoked via `OrganizeKeeper.exe parity-check`); it includes hardcoded FNV-1a reference values so any algorithmic drift between the C# keeper and the TS Raycast command fails the check.
  - `ParityCheck.cs` — inline assertions mirroring `slug.test.ts`. **Why not xUnit?** The agent shell had a broken NuGet env we couldn't fix from inside the session; folding parity into the keeper exe means zero NuGet dependencies for the test surface.
  - `StateStore.cs` — atomic JSON write helpers for `config.json` / `state.json`; reads with single fallback to defaults so a half-written file never crashes the keeper.
  - `BridgeClient.cs` — spawns the sibling `NpuBridge.exe screenshot-title` (same `cwd = dirname(exe)` rule as the TS helper), parses JSON, surfaces stderr to the keeper log only.
  - `PowerStatus.cs` — `GetSystemPowerStatus` P/Invoke. Treats Unknown (255) as AC so we don't paralyze headless desktops with broken battery telemetry.

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

## Phase 2 — resident watcher

State lives outside the Raycast support folder so the keeper survives Raycast reloads:

```
%LocalAppData%\NpuOrganize\
├── config.json       written by Raycast Start; the keeper hot-reloads on mtime change
├── state.json        counters + heartbeat + last-processed cursor; read by the Status view
├── stop.flag         sentinel; Raycast Stop writes it, keeper polls @1Hz and exits cleanly
└── organize.log      append-only audit trail (no rotation in v1)
```

- **Start Screenshot Watcher** — writes `config.json` from current prefs, spawns `OrganizeKeeper.exe watch` detached (`stdio: 'ignore'`, `windowsHide`), persists the PID in `LocalStorage` under `organize:keeperPid`.
- **Stop Screenshot Watcher** — writes `stop.flag`, waits up to 3s for graceful exit, falls back to `process.kill(pid)`.
- **Screenshot Watcher Status** — `<Detail>` view: status + PID + counters + last activity timestamps + tail of `organize.log`. Live-refreshes every 2s. Start/Stop buttons delegate to the dedicated commands via `launchCommand` (necessary because `skipOnBattery` / `debounceMs` / `ignorePattern` are scoped to **Start Screenshot Watcher** and aren't visible from Status's `getPreferenceValues`). To apply pref changes while the watcher is running, re-run **Start Screenshot Watcher** — `startKeeper()` always rewrites `config.json`, and the keeper hot-reloads on mtime change.
- **Battery skip:** when the `skipOnBattery` pref is on (default) and `GetSystemPowerStatus` reports the device is on battery, the keeper logs `skip ... (on battery)` instead of renaming. Manual Raycast commands always run regardless of power (user has explicit agency).
- **Debounce:** every file event resets the per-path timer; only fires `debounceMs` (default 1500) after the last event. This handles screenshot writers that touch the same file multiple times.
- **Backlog cursor:** the manual `Rename New Screenshots` command updates `state.json` (`lastProcessedAt`, `lastProcessedPath`, `processed`) every time it renames, so the keeper status view shows a unified counter regardless of which entry point did the work.

## Building the binaries

Both binaries land in `assets/bin/` side by side; the bridge requires sparse-package registration (`register-bridge.ps1`), the keeper does not.

```powershell
# Bridge — Image Description + OCR
cd npu-organize-ext\bridge
dotnet publish -c Release -r win-x64 --self-contained true -o ..\assets\bin

# Keeper — resident watcher (Phase 2)
cd ..\keeper
dotnet publish -c Release -r win-x64 --self-contained true -o ..\assets\bin
```

ARM Copilot+ PC: `-r win-arm64`. From the repo root, run `.\register-bridge.ps1` as Administrator after the first **bridge** publish (the script already includes this bridge). The keeper has no identity and runs out-of-process without registration.

## Tests

```powershell
cd npu-organize-ext
npm install
npm run test          # Vitest — covers slug.ts (sanitizer, builder, collision resolver, fallback hash, isAlreadyDateNamed)
npm run lint

# C# parity check (run after keeper publish):
.\assets\bin\OrganizeKeeper.exe parity-check
# Prints "Parity OK: ..." and exits 0 on success, or lists failed assertions on stderr and exits 1.
```

The Vitest suite intentionally has no Windows dependencies. The parity check is self-contained (BCL only, no NuGet) so the keeper exe is the test surface — keeps the TS `slugify()` and the C# `SlugGenerator` provably aligned on the same fixtures.

## API references

- **Image Description (canonical):** [`docs/REWRITE_INFO.md`](../docs/REWRITE_INFO.md) (Phi context) + Microsoft's [`image-description.md`](https://learn.microsoft.com/en-us/windows/ai/apis/image-description). The bridge uses `ImageDescriptionKind.BriefDescription` (caption scenario), matching the AI Dev Gallery "Describe Image WCR" sample.
- **OCR:** `Windows.Media.Ocr.OcrEngine.TryCreateFromUserProfileLanguages()` — same engine the imaging bridge uses for its standalone `ocr` verb.

## Suite pointer

This file **replaces long-form duplication** under `GEMINI.md` / `AGENTS.md` / `CLAUDE.md` for this folder — those stubs live only at the repo root and redirect here.
