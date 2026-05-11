# Changelog

All notable changes to this suite are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Richer planning history and per-feature specs remain in `FEATURE_PLAN.md`** — that file is the suite planning database; this log is a **summary** for releases and quick scanning.

## [Unreleased]

### Added

- **Suite (roadmap §1)** — Cohesive Raycast **preferences** across all five extensions: success toasts, optional **Ensure AI model readiness** (`--ensure-ready` on Phi/imaging bridges), notes semantic search tuning (debounce, max checks/hits), image editor auto-open + OCR text open, awake default duration/until time + Smart Awake schedule fallbacks, dev toolbox **workspace detection timeout** for PowerShell foreground probes. Bridge headers document readiness + link `docs/REWRITE_INFO.md`.
- **NPU Image Editor**: `Remove Background` command now runs the real NPU pipeline (same as Modify Image) instead of a placeholder scaffold.
- **NPU Awake (`npu-awake-ext`)**: Keyboard-first sleep prevention. Supports indefinite toggle, timed duration, "awake until" specific clock time, and screen-off mode. **Note: Currently being upgraded to "Smart Awake" with NPU natural language parsing.**
- **Smart Note Taker (`npu-notes-ext`)**: Phi-Silica backed note formatting and classification. Includes `add-note` for sloppy note filing and `browse-notes` for categorized listing/searching.
- **Notes discovery (`npu-notes-ext`)**: Added `find-related` and `search-notes`. Search does live keyword matches and a debounced Phi-Silica semantic fallback with caching + early-stop.
- **Sticker Maker (`npu-image-editor-ext`)**: Creates a 480×480 transparent WebP sticker from a selected image using on-device foreground extraction with smart auto-crop and a safe center-crop fallback.
- **NPU Dev Toolbox (`npu-dev-toolbox-ext`)**: New extension with three commands. **Open Workspace** uses the “last interacted” File Explorer folder (persisted as `last-explorer-folder`), lists subfolders as workspaces, and opens a chosen folder in a configurable terminal (Windows Terminal / pwsh / powershell / cmd / custom `.exe` or `.lnk`) and a configurable IDE (Cursor, VS Code, Windsurf, JetBrains IDEs, Sublime Text, Notepad++, custom `.exe` or `.lnk`) plus Explorer—any combination. **Workspace History** stores up to 20 previously opened folders (remove/clear supported) and exposes the same open actions. **Commit Message** detects the active git repo, gathers diff/log/branch context, and asks Phi-Silica for a JSON `{subject, body}` (Conventional Commits or Plain). Adds new sparse-package bridge `NpuDevToolboxBridge.Identity` registered via `register-bridge.ps1`.
- Documentation hub: `CONTRIBUTING.md`, `docs/RUNBOOK.md`, per-extension `NOTES.md`, and root stub files `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` pointing at the same workflow.

### Fixed

- **Phi bridges (`npu-notes-ext`, `npu-dev-toolbox-ext`, `npu-awake-ext`):** Added missing `TryUnlockNpuFeature()` call before any `LanguageModel` access. All three bridges were skipping the LAF unlock step, causing "Access is denied. Limited Access Feature is not available: com.microsoft.windows.ai.languagemodel" at runtime. `npu-text-tools-ext` was the only bridge with the unlock already in place. Token formula: `Base64(SHA256_UTF8("featureId!lafKey!pfn")[0..15])` — UTF-8 encoding is required (UTF-16LE produces Status 0).

### Changed

- **Phi bridges — SDK revert (operator request):** **`npu-notes-ext`** back to **`Microsoft.WindowsAppSDK` 2.0.0-experimental4** (no **`Microsoft.WindowsAppSDK.AI`**); sparse package identity back to **1.0.0.0**. **`npu-text-tools-ext`**, **`npu-dev-toolbox-ext`**, **`npu-awake-ext`**: **`Microsoft.WindowsAppSDK` 2.0.1** without **`Microsoft.WindowsAppSDK.AI`** (restore pre-bump layout). **`npu-image-editor-ext`** unchanged (**2.0.1** + **`Microsoft.WindowsAppSDK.AI`**). Wipe **`assets/bin`** per extension, republish, re-run **`register-bridge.ps1`**.
- **Phi bridges (`npu-notes-ext`, `npu-text-tools-ext`, `npu-dev-toolbox-ext`, `npu-awake-ext`):** Gate **`LanguageModel`** on **`GetReadyState()`**. **`docs/RUNBOOK.md`** documents **`LimitedAccessFeatureStatus`** values. **`npu-notes-ext`** access-denied output maps **Status: 0** to **Unavailable** with Windows HRESULT text. *(LAF unlock approach superseded — see Fixed entry above.)*
- **`docs/FORWARD_ROADMAP.md`**: Section **§1** marked shipped; indexer/TextRewriter items remain future work.
- Consolidated technical depth from former long-form `CLAUDE.md` into `docs/RUNBOOK.md` (no intentional information removal).
- **Notes UX (`npu-notes-ext`)**: `Add Note` clipboard prefill is now optional via preference (disabled by default).
- **Notes UX (`npu-notes-ext`)**: `Browse Notes` can delete notes with `Ctrl+D` (moves to Recycle Bin).
- **Dev Toolbox (`npu-dev-toolbox-ext`)**: Fixed Windows Terminal (`wt`) launching quirks (PATH/alias detection, `new-tab -d` arg placement, optional profile selection).
- **Dev Toolbox (`npu-dev-toolbox-ext`)**: Improved workspace detection for "Commit Message" to scan all open Explorer windows and prioritize Git repositories, preventing unrelated focused folders from blocking detection.

## Historical summary (pre-hub; see FEATURE_PLAN.md for detail)

Prior work recorded in **`FEATURE_PLAN.md`** includes, among other items:

- **2026-05-07** — Codex scaffolding (extensions, bridges, `register-bridge.ps1`).
- **2026-05-07** — Gemini: Super Resolution, OCR / extract text (`npu-image-editor-ext`).
- **2026-05-07** — Claude + follow-up: Phi-Silica text tools (`npu-text-tools-ext`), six Raycast commands, `phi-rewrite` bridge, `LanguageModel` context-based generation, case-insensitive JSON for custom rewrite; bridge publish and sparse registration patterns documented in registry and runbook.
