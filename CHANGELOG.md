# Changelog

All notable changes to this suite are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Richer planning history and per-feature specs remain in `FEATURE_PLAN.md`** — that file is the suite planning database; this log is a **summary** for releases and quick scanning.

## [Unreleased]

### Added

- **NPU Awake (`npu-awake-ext`)**: Keyboard-first sleep prevention. Supports indefinite toggle, timed duration, "awake until" specific clock time, and screen-off mode. **Note: Currently being upgraded to "Smart Awake" with NPU natural language parsing.**
- **Smart Note Taker (`npu-notes-ext`)**: Phi-Silica backed note formatting and classification. Includes `add-note` for sloppy note filing and `browse-notes` for categorized listing/searching.
- **Notes discovery (`npu-notes-ext`)**: Added `find-related` and `search-notes`. Search does live keyword matches and a debounced Phi-Silica semantic fallback with caching + early-stop.
- **Sticker Maker (`npu-image-editor-ext`)**: Creates a 480×480 transparent WebP sticker from a selected image using on-device foreground extraction with smart auto-crop and a safe center-crop fallback.
- **NPU Dev Toolbox (`npu-dev-toolbox-ext`)**: New extension with three commands. **Open Workspace** uses the “last interacted” File Explorer folder (persisted as `last-explorer-folder`), lists subfolders as workspaces, and opens a chosen folder in a configurable terminal (Windows Terminal / pwsh / powershell / cmd / custom `.exe` or `.lnk`) and a configurable IDE (Cursor, VS Code, Windsurf, JetBrains IDEs, Sublime Text, Notepad++, custom `.exe` or `.lnk`) plus Explorer—any combination. **Workspace History** stores up to 20 previously opened folders (remove/clear supported) and exposes the same open actions. **Commit Message** detects the active git repo, gathers diff/log/branch context, and asks Phi-Silica for a JSON `{subject, body}` (Conventional Commits or Plain). Adds new sparse-package bridge `NpuDevToolboxBridge.Identity` registered via `register-bridge.ps1`.
- Documentation hub: `CONTRIBUTING.md`, `docs/RUNBOOK.md`, per-extension `NOTES.md`, and root stub files `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` pointing at the same workflow.

### Changed

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
