# Changelog

All notable changes to this suite are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

**Richer planning history and per-feature specs remain in `FEATURE_PLAN.md`** — that file is the suite planning database; this log is a **summary** for releases and quick scanning.

## [Unreleased]

### Added

- Documentation hub: `CONTRIBUTING.md`, `docs/RUNBOOK.md`, per-extension `NOTES.md`, and root stub files `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` pointing at the same workflow.

### Changed

- Consolidated technical depth from former long-form `CLAUDE.md` into `docs/RUNBOOK.md` (no intentional information removal).

## Historical summary (pre-hub; see FEATURE_PLAN.md for detail)

Prior work recorded in **`FEATURE_PLAN.md`** includes, among other items:

- **2026-05-07** — Codex scaffolding (extensions, bridges, `register-bridge.ps1`).
- **2026-05-07** — Gemini: Super Resolution, OCR / extract text (`npu-image-editor-ext`).
- **2026-05-07** — Claude + follow-up: Phi-Silica text tools (`npu-text-tools-ext`), six Raycast commands, `phi-rewrite` bridge, `LanguageModel` context-based generation, case-insensitive JSON for custom rewrite; bridge publish and sparse registration patterns documented in registry and runbook.
