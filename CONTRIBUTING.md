# Contributing to the NPU Extension Suite

How to build, change, and **record** work so humans and any AI tool stay aligned.

## Documentation map (read in order for a new task)

| Order | File | Role |
|-------|------|------|
| 1 | **`FEATURE_PLAN.md`** | **Primary planning database** — roadmap, feature specs, dated lessons. Do not permanently delete entries; strike through and date when superseded. |
| 2 | **`EXTENSION_REGISTRY.md`** | Current facts: which folder has which bridge, sparse `Identity` names, publish conventions. |
| 3 | **`docs/RUNBOOK.md`** | Bridge mechanics, Phi / WinRT patterns, troubleshooting, operational gotchas. |
| 4 | **`<extension>/NOTES.md`** | Extension-specific quirks and pointers (see below). |
| 5 | **`CHANGELOG.md`** | User-visible / bridge **release notes** — append every merged change set. |

**Human onboarding (meta):** [`docs/HOW_TO_USE_THE_DOC_SYSTEM.md`](docs/HOW_TO_USE_THE_DOC_SYSTEM.md) — how to use this doc layout; omitted from automatic context via **`.cursorignore`**, **`.geminiignore`**, **`.claudeignore`** (and **`.agentignore`** as a non-standard extra). **Cursor** uses `.cursorignore`, not `.agentignore` ([Cursor ignore files](https://cursor.com/docs/context/ignore-files)).

Optional: `COPILOT_CONTEXT.md`, `NPU_INFO.md` (if present in your clone), root `README.md` for end-user overview.

### Per-extension notes

- `npu-image-editor-ext/NOTES.md` — image bridge, Explorer workflow (supersedes long-form content formerly only under `GEMINI.md`).
- `npu-text-tools-ext/NOTES.md` — Phi rewrite bridge; cross-links `FEATURE_PLAN.md` §3.
- `npu-notes-ext/NOTES.md` — scaffold / future phi-note.
- `npu-awake-ext/NOTES.md` — keeper helper vs sparse bridge distinction.

### Vendor stub files (Cursor, Claude Code, Gemini CLI, etc.)

`AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` at the repo root are **short redirects** to this file and the map above—keep them small so each tool’s auto-load still lands on the same workflow.

## Prerequisites

- **Windows 11 Build 26100+** where Copilot Runtime features apply (see `NPU_INFO.md` if tracked in your clone).
- **Hardware:** NPU / Copilot+ expectations per feature (registry + plan).
- **.NET 8 SDK** — for `bridge/` projects.
- **Node.js & npm** — per extension.

## Quick start (sparse-package bridge + Raycast)

```powershell
cd <extension-with-bridge>/bridge
dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin
cd ../..
.\register-bridge.ps1   # Administrator, repo root — after first publish or manifest change
cd <same-extension>
npm install
npm run dev
```

Use `-r win-arm64` on ARM64. **`--self-contained true` is mandatory** or Node often fails with `spawn UNKNOWN`.

## Project structure

The repo is a **suite of independent** Raycast extensions:

- Each extension has its own `package.json`, `tsconfig.json`, and `src/` tree.
- Extensions **do not** share npm packages—duplicate small utilities if needed.
- Native code is per extension: typically `bridge/` → `assets/bin/`. Some use other helpers (e.g. `npu-awake-ext/keeper/`). Authoritative table: **`EXTENSION_REGISTRY.md`**.

Illustrative folders (confirm in registry):

- `npu-image-editor-ext/` — image commands, WinRT bridge.
- `npu-text-tools-ext/` — Phi text commands, shared TS + bridge.
- `npu-notes-ext/` — notes commands; bridge scaffold.
- `npu-awake-ext/` — keep-awake; Win32 helper pattern (not the same as sparse AI bridges).

## Build, test, development

Run npm scripts **from the extension** you change:

- `npm install`, `npm run dev`, `npm run build`, `npm run lint`, `npm run fix-lint`, `npm run publish`

**C# bridge** (any extension with `bridge/` that Raycast spawns):

```powershell
cd <ext>/bridge
dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin
```

If `Package.appxmanifest` or `app.manifest` changes, re-run `register-bridge.ps1` from the repo root as Administrator. When adding a **new** loose-registration bridge, update **`register-bridge.ps1`** `$bridges` and **`EXTENSION_REGISTRY.md`**.

## After you finish a change set (required for shared “memory”)

1. **`CHANGELOG.md`** — Add bullets under `[Unreleased]` (Added / Fixed / Changed).
2. **`EXTENSION_REGISTRY.md`** — If binaries, identities, or IPC surface changed, update the table.
3. **`FEATURE_PLAN.md`** — If the change relates to planned work, add or strike through dated notes; **do not erase history**.
4. **`<ext>/NOTES.md`** — Extension-specific gotchas, IPC reminders, or “we tried X, use Y”.
5. **`docs/RUNBOOK.md`** — Reusable debugging steps or SDK pitfalls that apply across extensions.

## Coding style

TypeScript + React JSX, strict TS, `@/*` → `src/*` where `tsconfig.json` defines it. Kebab-case command files; PascalCase for exported components when named. Prettier + `@raycast/eslint-config`; run `npm run lint` before submitting.

Prettier (typical suite defaults): print width 120, tab width 4 spaces, no semicolons, double quotes, arrow parens avoid for single param, trailing commas all.

## Testing

No automated suite. Require `npm run lint` and `npm run build` for touched extensions. Manually verify in Raycast (`npm run dev`); for NPU/Copilot features use compatible hardware/OS and confirm bridge errors surface as toasts.

## Commits and pull requests

Short imperative summaries; scope changes per extension or concern. PRs should include: description, paths touched, manual verification steps, screenshots for UI changes.

## Shell convenience

In this workspace, prefix commands with `rtk` where configured (e.g. `rtk npm run lint`) to reduce noisy output.

## License

See root `README.md` (MIT).
