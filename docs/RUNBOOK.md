# Runbook — bridges, WinRT, Phi, troubleshooting

Operational and technical reference for **all** extensions. Planning specs and per-feature narratives stay in **`FEATURE_PLAN.md`**. Factual wiring (identities, folders) in **`EXTENSION_REGISTRY.md`**. Contributor workflow in **`CONTRIBUTING.md`**.

## Suite layout (volatile data)

**Authoritative inventory:** `EXTENSION_REGISTRY.md` — extension folders, bridge exes, sparse `Identity Name` values, and rules for updating when new features land.

Do not duplicate the registry table here; update that file when wiring changes.

## Project overview

This is a **suite of standalone** Raycast for Windows extensions. Each folder under the repo root that contains a `package.json` is an installable Raycast extension. Several use a **C# bridge** to call Windows Copilot Runtime / WinRT APIs; others may use only TypeScript or a non–sparse-package native helper.

**Non-exhaustive examples** (see registry for truth):

- **NPU / WinRT imaging** — e.g. foreground extraction, scaling, OCR-related paths.
- **Phi-Silica / text** — e.g. `Microsoft.Windows.AI.Text.LanguageModel` (used in `npu-text-tools-ext`, `npu-notes-ext`, and `npu-awake-ext`).
- **Awake / Win32** — background persistence for system state.

### Background process pattern

Used by **`npu-awake-ext`** for persistent state:
1. **Spawn detached**: `spawn(exe, args, { detached: true, stdio: 'ignore' })`.
2. **PID Management**: Store `child.pid` in `LocalStorage` to track the process across command invocations.
3. **Kill on demand**: Use `process.kill(pid)` to stop the session.
4. **Lifecycle**: Use `child.unref()` so the Node.js event loop doesn't wait for the helper to exit.

## npm commands (any extension)

```powershell
cd <extension-directory>
npm run dev
npm run build
npm run lint
npm run fix-lint
npm run publish
```

## Building C# bridges (generic)

Applies to any extension with `bridge/NpuBridge.csproj` (or equivalent) that Raycast spawns from `assets/bin/`:

```powershell
cd <extension-directory>\bridge
dotnet publish -c Release -r win-x64 --self-contained true -o ..\assets\bin
```

- **ARM64:** `-r win-arm64`
- **`--self-contained true` is mandatory** — otherwise `spawn UNKNOWN` from Node when the .NET runtime is not installed for the user.

`register-bridge.ps1` (repo root, Administrator) copies `bridge/Package.appxmanifest` → `assets/bin/AppxManifest.xml` for each configured bridge and runs `Add-AppxPackage -Register`. **When you add a new sparse-package bridge, edit the script’s `$bridges` array and `EXTENSION_REGISTRY.md`.**

### Re-registering after `0x80073CFB`

Remove the package whose **Identity Name** matches the extension you changed (see that extension’s `Package.appxmanifest` or the registry), then re-run `register-bridge.ps1`:

```powershell
Remove-AppxPackage -Package (Get-AppxPackage -Name "<Identity-Name-from-manifest>").PackageFullName
```

To list related registrations: `Get-AppxPackage | Where-Object { $_.Name -match 'Bridge' }` (adjust filter as needed).

## Architecture

### Bridge pattern (NPU / sparse-package exes)

1. **TypeScript/React** — Raycast commands under `src/*.tsx`; may share components in `src/shared/`.
2. **Optional shell/PowerShell** — Explorer selection, clipboard, etc., where the feature needs it.
3. **C# bridge** — `bridge/Program.cs` built to **`assets/bin/NpuBridge.exe`** (name may vary; registry + csproj). Communicates via **one JSON line on stdout**; diagnostics on stderr.

**Invariant:** `execFile` / `execFileAsync` must use **`cwd: path.dirname(pathToExe)`** so bundled Windows App SDK DLLs resolve. Use `windowsHide: true` where supported.

### IPC contracts (extension-specific)

- **Argv and JSON shapes differ per bridge** — the image editor uses command names + paths; text tools uses `phi-rewrite` + mode + temp file; future bridges add new verbs in their own `Program.cs`.
- **Do not** assume all bridges share the same success JSON—read the spawn site in TS and the matching C# branch.
- **Reference:** `EXTENSION_REGISTRY.md` + top-of-file or per-`case` comments in `bridge/Program.cs`.

### Phi-Silica / `LanguageModel` (reusable pattern)

Use for on-device text generation when the feature is backed by `Microsoft.Windows.AI.Text.LanguageModel`:

1. `LanguageModel.GetReadyState()` / `EnsureReadyAsync()` as needed.
2. `await using` / `using var model = await LanguageModel.CreateAsync()`.
3. `using var ctx = model.CreateContext(systemPrompt);`
4. `await model.GenerateResponseAsync(ctx, userText, new LanguageModelOptions());`
5. Read **`LanguageModelResponseResult.Text`**.

**API gotcha:** `CreateContext(string, …)` — second parameter is **`ContentFilterOptions`**, not user text. Wrong usage → CS1503.

**Namespace:** `Microsoft.Windows.AI.Text` — not `Microsoft.Windows.AI.Generative`.

**JSON from TypeScript:** camelCase keys — use `JsonSerializerOptions.PropertyNameCaseInsensitive = true` or `[JsonPropertyName]` for C# DTOs.

### Image editor flows (reference — details stay in source)

When working in **`npu-image-editor-ext/bridge/Program.cs`**:

- **Background removal** — `ImageObjectExtractor` readiness → mask → alpha via pixel buffer access; watch CsWinRT/COM casting issues. (Older Microsoft docs / drafts call this `ImageForegroundExtractor`; the WAS 2.0-experimental class shipped under the `ImageObjectExtractor` name.)
- **Super resolution** — `ImageScaler` readiness; respect scale limits per OS/hardware.
- **OCR** — `SoftwareBitmap` → **Bgra8** for `OcrEngine`; dimension limits per docs.

## Key file patterns (not a full inventory)

| Pattern | Role |
|---------|------|
| `<ext>/bridge/Program.cs` | Bridge entry and command dispatch |
| `<ext>/bridge/Package.appxmanifest` | Sparse identity + capabilities |
| `<ext>/bridge/app.manifest` | `msix` `publisher` / `packageName` must match manifest Identity |
| `<ext>/assets/bin/` | Published exe + deps — **never swap between extensions** |
| `register-bridge.ps1` | Registers all configured loose packages |
| `EXTENSION_REGISTRY.md` | **Update when adding bridges or identities** |
| `FEATURE_PLAN.md` | Product scope and lessons learned per feature |

## Development notes

- Manual testing via `npm run dev`; no shared automated test suite.
- **No shared npm packages** between extensions.
- On-device AI only — no cloud inference for NPU/Phi features.
- `systemAIModels` / sparse registration: Developer Mode for dev; LAF / Store rules for production distribution.
- `dotnet publish -o` — prefer forward slashes in mixed shell environments (`-o "../assets/bin"`).
- After messy bridge rebuilds, if `deps.json` / DLLs disagree, delete `assets/bin` and republish clean.

## Troubleshooting

### `spawn UNKNOWN`

Activation or runtime failed before the process ran: check **`app.manifest`** `publisher` matches `Package.appxmanifest` `Identity Publisher`; **`packageName`** matches **that extension’s** `Identity Name`; build is **self-contained**; **`cwd`** is the exe directory.

### `InvalidCastException` / `IInspectable`

For custom COM access from CsWinRT (e.g. `IMemoryBufferByteAccess`), use WinRT interop patterns (`IWinRTObject`, `Guid`, unmanaged delegates)—see existing `Program.cs` in the image bridge.

### Model not ready / slow first run

`EnsureReadyAsync()` may download weights; 30–60s first time is normal.
