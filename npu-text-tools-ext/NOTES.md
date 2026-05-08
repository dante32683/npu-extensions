# NPU Text Tools — maintenance notes

Extension-specific notes for **`npu-text-tools-ext`**.

- **Planning & prompts:** `FEATURE_PLAN.md` §3 (Phi-Silica Text Tools)—**primary spec and lesson-learned log** for this extension.
- **Bridge IPC:** `bridge/Program.cs` — argv `phi-rewrite`, modes `grammar | formal | concise | bullets | simplify | custom`; temp file plain text or JSON `{ "instruction", "text" }` for `custom`.
- **UI:** Shared `src/shared/TextRewriteCommand.tsx`; one thin command file per Raycast command under `src/`.
- **Sparse identity:** `NpuTextToolsBridge.Identity` (see `bridge/Package.appxmanifest` and **`EXTENSION_REGISTRY.md`**).
- **Technical depth:** `docs/RUNBOOK.md` (Phi / `LanguageModel` pattern, JSON deserialization).

Append new gotchas here when you fix issues; mirror high-level milestones in **`CHANGELOG.md`**.
