# NPU Text Tools — maintenance notes

Extension-specific notes for **`npu-text-tools-ext`**.

- **Roadmap §1 prefs:** Clipboard prefill, success toasts, `ensureModelReady` / `--ensure-ready` — see `package.json`.
- **Verify helper:** Command **Verify Text Selection Helper** runs `TextSelectionHelper.exe noop`. The helper is **not** a daemon — Raycast **spawns it per Copy/Paste** (`execFile`); it exits immediately.
- **Automated tests:** `npm run test` (Vitest prefs), `npm run test:dotnet` (xUnit `RaycastDetector`), then `npm run build`. After changing C#, `dotnet publish … -o assets/bin/selection-helper`.
- **Selection + global hotkeys (roadmap §3):** **`closeMainWindow`**, then **`getSelectedText()`** first (no simulated **Ctrl+C** when Raycast can read the prior app’s selection). Fallback: sentinel + **`TextSelectionHelper.exe send-copy` / `send-paste`** (foreground poll + **AttachThreadInput** / **SetForegroundWindow** under Raycast). **Focus wait (max)** pref caps the poll. **Review Selection** → **`launchCommand`** → **Review Selection (Internal)**. Republish helper when `selection-helper/` changes (see `selection-helper/README.md`).
- **Forward work:** `docs/FORWARD_ROADMAP.md` §4 (`TextRewriter`).
- **Planning archive:** `FEATURE_PLAN.md` §3 (Phi-Silica Text Tools) and §12 (expanded hotkey spec). **Official Phi / Rewrite APIs:** `docs/REWRITE_INFO.md`.
- **Bridge IPC:** `bridge/Program.cs` — argv `phi-rewrite`, modes `grammar | formal | concise | bullets | simplify | custom`; temp file plain text or JSON `{ "instruction", "text" }` for `custom`.
- **UI:** Shared `src/shared/TextRewriteCommand.tsx`; one thin command file per Raycast command under `src/`.
- **Sparse identity:** `NpuTextToolsBridge.Identity` (see `bridge/Package.appxmanifest` and **`EXTENSION_REGISTRY.md`**).
- **Technical depth:** `docs/RUNBOOK.md` (Phi / `LanguageModel` pattern, JSON deserialization).

Append new gotchas here when you fix issues; mirror high-level milestones in **`CHANGELOG.md`**.
