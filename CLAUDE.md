# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast for Windows extension suite with two standalone extensions targeting image editing:

- **image-modification-ext** — Universal image editor using Jimp (pure JS, broad compatibility)
- **npu-image-editor-ext** — AI-accelerated editor using the Windows Copilot Runtime and NPU (Neural Processing Unit), requires Windows 11 Build 26100+ (Copilot+ PC)

## Commands

Both extensions share the same npm scripts. Run them from within the extension directory:

```powershell
cd image-modification-ext   # or npu-image-editor-ext
npm run dev                 # Start Raycast development mode
npm run build               # Production build (ray build -e dist)
npm run lint                # ESLint
npm run fix-lint            # ESLint with auto-fix
npm run publish             # Publish to Raycast store
```

### Building the C# bridge (npu-image-editor-ext only)

After any change to `bridge/Program.cs` or `bridge/NpuBridge.csproj`, rebuild and copy the output:

```powershell
cd npu-image-editor-ext\bridge

# x64 Copilot+ PC (Intel Lunar Lake, AMD Ryzen AI 300)
dotnet publish -c Release -r win-x64 --self-contained true -o ..\assets\bin

# ARM64 Copilot+ PC (Qualcomm Snapdragon X Elite / Plus)
dotnet publish -c Release -r win-arm64 --self-contained true -o ..\assets\bin
```

**`--self-contained true` is mandatory.** Without it the exe is framework-dependent and Node.js will fail to spawn it with `spawn UNKNOWN` because .NET is not installed on most machines.

### Re-registering the sparse package identity

Run as Administrator after first build or after changing `Package.appxmanifest` or `app.manifest`:

```powershell
# From repo root — run as Administrator
.\register-bridge.ps1
```

If registration fails with `0x80073CFB` ("package is already installed"), remove the old registration first:

```powershell
Remove-AppxPackage -Package (Get-AppxPackage -Name "NpuBridge.Identity").PackageFullName
.\register-bridge.ps1
```

## Architecture

### Bridge Pattern

Both extensions follow the same layered architecture:

1. **TypeScript/React UI** (`src/modify-image.tsx`) — Raycast command entry point, renders the List UI with action panels
2. **PowerShell scripts** (inline or `src/utils/powershell-utils.ts`) — OS-level operations: File Explorer selection via COM object (`Shell.Application`), clipboard image capture via Windows Forms
3. **C# bridge** (`bridge/Program.cs` → `assets/bin/NpuBridge.exe`) — NPU extension only; wraps `Microsoft.Windows.AI` APIs; communicates with TypeScript via JSON over stdout / errors on stderr

### IPC Protocol (NPU bridge)

The TypeScript layer spawns `NpuBridge.exe` with `[command, inputPath]` as argv. The bridge writes a single JSON line to stdout:

- Success: `{ "status": "success", "outputPath": "...", "message": "..." }`
- Failure: `{ "status": "error", "message": "..." }`

Diagnostic details (stack traces, model readiness) go to stderr.

The bridge must run with `cwd` set to its own directory so it can find its bundled Windows App SDK DLLs. This is enforced in `modify-image.tsx` via `{ cwd: path.dirname(BRIDGE_PATH), windowsHide: true }` in the `execFileAsync` options.

### Background Removal Flow

1. `ImageForegroundExtractor.GetReadyState()` — check if NPU model weights are ready
2. `ImageForegroundExtractor.EnsureReadyAsync()` — trigger OS download if not ready (first run)
3. `ImageForegroundExtractor.CreateAsync()` — create inference session
4. `extractor.GetMaskFromSoftwareBitmap(source)` — run NPU inference, returns grayscale mask (255 = foreground)
5. `ApplyMaskAsAlpha(source, mask)` — composite: writes mask bytes into the alpha channel of the BGRA8 source pixels using `IMemoryBufferByteAccess` COM interface
6. Encode as PNG via `BitmapEncoder.PngEncoderId`

### Key Files

| File | Purpose |
|------|---------|
| `*/src/modify-image.tsx` | Main Raycast command and UI logic |
| `npu-image-editor-ext/src/utils/powershell-utils.ts` | Reusable PS helpers for Explorer/clipboard |
| `npu-image-editor-ext/bridge/Program.cs` | C# bridge entry point for NPU APIs |
| `npu-image-editor-ext/bridge/NpuBridge.csproj` | C# project config (self-contained, net8.0-windows10.0.26100.0) |
| `npu-image-editor-ext/bridge/Package.appxmanifest` | Sparse package manifest (declares `systemAIModels` capability) |
| `register-bridge.ps1` | Registers the sparse package identity via `Add-AppxPackage` |
| `COPILOT_CONTEXT.md` | Strategic roadmap and implementation mandates |
| `npu-image-editor-ext/NPU_INFO.md` | Hardware requirements and API reference notes |

## Code Style

Prettier config (both extensions):
- Print width: 120
- Tab width: 4 spaces
- No semicolons
- Double quotes
- Arrow parens: avoid (single params)
- Trailing commas: all

ESLint extends `@raycast/eslint-config`.

## Development Notes

- No automated test suite — testing is done manually through `npm run dev` in the Raycast dev environment.
- Each extension is intentionally standalone and feature-complete — do not create shared packages between them.
- All AI processing must remain on-device via NPU; no external AI service calls.
- The `npu-image-editor-ext` path alias `@/*` maps to `src/*`.
- The `systemAIModels` capability in `Package.appxmanifest` requires Developer Mode for development. A LAF token from Microsoft is required for production Store distribution.
- Output PNG for background removal is saved alongside the source file with `_no_bg.png` suffix.
- Use forward slashes in `-o` for `dotnet publish` (e.g. `-o "../assets/bin"`). Backslashes get mangled in MSYS2/bash environments and create a literal directory name instead.
- If DLL version mismatches occur after a rebuild (`deps.json` references a different version than what's in `assets/bin`), delete the entire `assets/bin` directory and republish fresh.

## Troubleshooting

### `spawn UNKNOWN` when Raycast calls NpuBridge.exe

This means the process never started. Causes in priority order:

1. **Invalid publisher in `app.manifest`** — The `<msix>` element's `publisher` must exactly match `Package.appxmanifest`'s `Identity Publisher`. A mismatch causes Windows SxS activation context failure before the process launches. Both must be `publisher="CN=Unsigned"`.
2. **Framework-dependent build** — Must use `--self-contained true`. Without it, .NET is required on the target machine.
3. **Wrong `cwd`** — Bridge must be spawned with `cwd: path.dirname(BRIDGE_PATH)` so it can find its bundled Windows App SDK DLLs.

### `InvalidCastException: Invalid cast from 'WinRT.IInspectable' to '...'`

CsWinRT wraps WinRT objects in proxy types that don't support direct C# interface casts to user-defined COM interfaces (like `IMemoryBufferByteAccess`). Use `IWinRTObject.NativeObject.As(Guid)` to QueryInterface, then call the method via vtable pointer with `delegate* unmanaged[Stdcall]`.

### Registration fails with `0x80073CFB`

The sparse package is already installed with the old manifest. Remove it first:
```powershell
Remove-AppxPackage -Package (Get-AppxPackage -Name "NpuBridge.Identity").PackageFullName
.\register-bridge.ps1
```

### NPU model not ready / first-run delay

`EnsureReadyAsync()` triggers an OS-managed model download on first use. This is expected and may take 30–60 seconds. Subsequent runs use the cached model and are fast.
