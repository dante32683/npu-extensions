# NPU Awake — maintenance notes

Extension-specific notes for **`npu-awake-ext`**.

- **Strategic Pivot (2026-05-07):** Evolving from “manual Awake” into a reliable **Smart Awake** (natural language) feature.
- **Goal:** Keep the **manual commands** fast and deterministic, while adding **one** natural-language entrypoint that routes to the same stable actions.

## Current state (implemented)

- **Keeper**: `keeper/AwakeKeeper.exe` (Win32) calls `SetThreadExecutionState` for:
  - `indefinite`, `timed`, `until`, `screen-off`
- **Raycast commands**: `awake`, `awake-for`, `awake-until`, `screen-off-mode`, `let-sleep`, `awake-status`
- **Process model**: detached spawn + PID tracked in Raycast `LocalStorage` (see `src/utils/keeper-utils.ts`)

## Smart Awake design (planning)

**Design rule (reliability):** Phi-Silica is used for **intent extraction only**. No timestamps and no arithmetic are trusted from the model output.

### Components

- **Policy + routing (TypeScript)**:
  - `awake-natural` behaves like a constrained tool-caller: check status first, then (if needed) call the intent extractor, then execute a stable action.
- **Intent extractor (C# sparse bridge)**:
  - `bridge/` uses `Microsoft.Windows.AI.Text.LanguageModel`
  - outputs a small, strict JSON schema (action/mode + raw fields only)
  - must do “surgical JSON extraction” from Phi output (code fences/prose are common)
- **Executor/daemon (Win32 keeper)**:
  - keeper remains the only long-running loop asserting execution state
  - adds **daemon/scheduler** support reading a persistent `schedules.json` and hot-reloading it when it changes

### Persistence requirements

- Recurrent schedules are stored in a real `schedules.json` file under the extension’s support/data folder (not `LocalStorage`).
- TS must write schedules atomically (temp file + rename).
- Keeper daemon must treat `schedules.json` as the source of truth on startup and on change.

### UX disclaimer (important)

`SetThreadExecutionState` prevents idle sleep. It cannot override lid-close or power-button behavior unless the user’s Windows power settings allow it. Surface this as a short disclaimer when starting Smart Awake sessions/schedules.

- **Planning:** `FEATURE_PLAN.md` §5 (Smart Awake).
- **Suite workflow:** `CONTRIBUTING.md`, `EXTENSION_REGISTRY.md`, `docs/RUNBOOK.md`.
