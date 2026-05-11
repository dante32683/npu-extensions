# NPU Text Tools — maintenance notes

Extension-specific notes for **`npu-text-tools-ext`**.

- **Roadmap §1 prefs:** Clipboard prefill, success toasts, `ensureModelReady` / `--ensure-ready` — see `package.json`.
- **Forward work (clean summary):** `docs/FORWARD_ROADMAP.md` §3 (global hotkeys) and §4 (`TextRewriter`).
- **Planning archive:** `FEATURE_PLAN.md` §3 (Phi-Silica Text Tools) and §12 (expanded hotkey spec). **Official Phi / Rewrite APIs:** `docs/REWRITE_INFO.md`.
- **Bridge IPC:** `bridge/Program.cs` — argv `phi-rewrite`, modes `grammar | formal | concise | bullets | simplify | custom`; temp file plain text or JSON `{ "instruction", "text" }` for `custom`.
- **UI:** Shared `src/shared/TextRewriteCommand.tsx`; one thin command file per Raycast command under `src/`.
- **Sparse identity:** `NpuTextToolsBridge.Identity` (see `bridge/Package.appxmanifest` and **`EXTENSION_REGISTRY.md`**).
- **Technical depth:** `docs/RUNBOOK.md` (Phi / `LanguageModel` pattern, JSON deserialization).

Append new gotchas here when you fix issues; mirror high-level milestones in **`CHANGELOG.md`**.
