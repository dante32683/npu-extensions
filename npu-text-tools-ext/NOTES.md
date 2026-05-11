# NPU Text Tools — maintenance notes

Extension-specific notes for **`npu-text-tools-ext`**.

- **Preferences layout (suite style guide):** **Extension** prefs: success toasts, `ensureModelReady`, selection helper timing (**Selection copy delay**, **Focus wait (max)**). **Per-command** prefs: **Prefill from clipboard** on each of the six **form** rewrite commands; **Quick rewrite mode** + **Quick custom instruction** on **Paste Selection (Quick)** and **Review Selection (Quick)** (Raycast stores them separately — keep both in sync for the same hotkey behavior). See [`docs/SUITE_STYLE_GUIDE.md`](../docs/SUITE_STYLE_GUIDE.md) § Raycast extension preferences.
- **Verify helper:** **Text Tools Diagnostics** (`text-tools-diagnostics`, `view`) shows the helper path and runs the same **`noop`** check via **Verify Helper** (replaces the old root-only **Verify Text Selection Helper** command). The helper is **not** a daemon — Raycast **spawns it per Copy/Paste** (`execFile`); it exits immediately.
- **Automated tests:** `npm run test` (Vitest prefs), `npm run test:dotnet` (xUnit `RaycastDetector`), then `npm run build`. After changing C#, `dotnet publish … -o assets/bin/selection-helper`.
- **Selection + global hotkeys (roadmap §3):** **`closeMainWindow`**, then **`getSelectedText()`** first (no simulated **Ctrl+C** when Raycast can read the prior app’s selection). Fallback: sentinel + **`TextSelectionHelper.exe send-copy` / `send-paste`** (foreground poll + **AttachThreadInput** / **SetForegroundWindow** under Raycast). **Focus wait (max)** pref caps the poll. **Paste Selection (Quick)** / **Review Selection (Quick)** (`no-view`) read **Quick rewrite mode** + **Quick custom instruction** (when mode is Custom); bind hotkeys to these instead of twelve per-mode commands. **Review** flows → **`launchCommand`** → **`review-selection-pane`**. Republish helper when `selection-helper/` changes (see `selection-helper/README.md`).
- **Forward work:** `docs/FORWARD_ROADMAP.md` §4 (`TextRewriter`).
- **Planning archive:** `FEATURE_PLAN.md` §3 (Phi-Silica Text Tools) and §12 (expanded hotkey spec). **Official Phi / Rewrite APIs:** `docs/REWRITE_INFO.md`.
- **Bridge IPC:** `bridge/Program.cs` — argv `phi-rewrite`, modes `grammar | formal | concise | bullets | simplify | custom`; temp file plain text or JSON `{ "instruction", "text" }` for `custom`.
- **UI:** Shared `src/shared/TextRewriteCommand.tsx`; one thin command file per Raycast command under `src/`.
- **Sparse identity:** `NpuTextToolsBridge.Identity` (see `bridge/Package.appxmanifest` and **`EXTENSION_REGISTRY.md`**).
- **Technical depth:** `docs/RUNBOOK.md` (Phi / `LanguageModel` pattern, JSON deserialization).

Append new gotchas here when you fix issues; mirror high-level milestones in **`CHANGELOG.md`**.
