# Extension & bridge registry

**Purpose:** Single place to record how each folder in the suite is wired. When you add a command, bridge, or Raycast extension, **append or edit the relevant row** so narrative docs stay short: point people to **`CONTRIBUTING.md`**, **`docs/RUNBOOK.md`**, and per-extension **`NOTES.md`** (root stubs `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` only redirect to the hub).

**Related automation:** `register-bridge.ps1` only registers paths listed in its `$bridges` array. When you add a new sparse-package bridge, update **both** this table and that script.

## Suite map

| Folder | Kind | Native binary | Sparse package `Identity Name`¹ | IPC / commands (authoritative: `bridge/Program.cs`) | Status |
|--------|------|---------------|---------------------------------|-----------------------------------------------------|--------|
| `npu-image-editor-ext` | Raycast + WinRT bridge | `assets/bin/NpuBridge.exe` | `NpuBridge.Identity` | `remove-background`, `super-resolution`, `ocr`, … (see source) | Active |
| `npu-text-tools-ext` | Raycast + Phi bridge | `assets/bin/NpuBridge.exe` | `NpuTextToolsBridge.Identity` | `phi-rewrite` + modes in source | Active |
| `npu-notes-ext` | Raycast + bridge | `assets/bin/NpuBridge.exe` | `NpuNotesBridge.Identity` | `phi-note` | Active |
| `npu-awake-ext` | Raycast + Win32 helper | `keeper/` → publish target `assets/bin/` (exe name from `AwakeKeeper.csproj`) | *None* for sparse AI — not a Copilot bridge | CLI args per `keeper/Program.cs` | Partial |
| `image-modification-ext` | Raycast (if present) | *None* | *None* | Pure TS | Optional |

¹ Always confirm in that extension’s `bridge/Package.appxmanifest` and match `app.manifest` `packageName` when the bridge uses embedded MSIX activation.

## Conventions (stable — rarely change)

- **One extension = one `assets/bin/`** for its shipped native binary(ies). Never copy `NpuBridge.exe` from another extension; activation context follows the manifest beside it.
- **Publish template** (from `bridge/`):

  ```powershell
  dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin
  ```

  Use `win-arm64` on ARM Copilot+ PCs. **`--self-contained true` is mandatory** for Raycast-spawned bridges.
- **Spawn options (bridges):** `cwd` must be `path.dirname(pathToExe)`; `windowsHide: true` where supported.
- **Stdout:** one JSON line per invocation unless a command is explicitly documented as streaming (none today).
- **Phi / `LanguageModel`:** `Microsoft.Windows.AI.Text`; system prompt via `CreateContext(systemPrompt)`; user content via `GenerateResponseAsync(context, userText, new LanguageModelOptions())`.

## When you implement a new feature

1. Change code and, if needed, argv / JSON contract — document the contract in a short comment at the top of `bridge/Program.cs` or next to the new `case`.
2. Update **this file** if you added a new extension, bridge, or sparse identity.
3. Update `register-bridge.ps1` if a new loose-registration package is required.
4. Update **`FEATURE_PLAN.md`** (or roadmap doc) for product-facing scope; keep this registry **factual** (what exists and how it’s named).
