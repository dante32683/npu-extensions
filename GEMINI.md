# NPU Extension Suite for Raycast (Windows)

High-performance Raycast for Windows extensions leveraging the Windows Copilot Runtime and NPU.

## Quick Start

```powershell
# 1. Build the bridge (required after any C# change, or on first setup)
cd npu-image-editor-ext\bridge

# x64 PC (Intel Lunar Lake, AMD Ryzen AI 300)
dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin

# ARM64 PC (Qualcomm Snapdragon X Elite / Plus)
dotnet publish -c Release -r win-arm64 --self-contained true -o ../assets/bin

# 2. Register the sparse package identity (once per machine, run as Administrator)
cd ..\..
.\register-bridge.ps1

# If registration fails with 0x80073CFB ("already installed"), remove old first:
# Remove-AppxPackage -Package (Get-AppxPackage -Name "NpuBridge.Identity").PackageFullName
# .\register-bridge.ps1

# 3. Start Raycast dev mode
cd npu-image-editor-ext
npm run dev
```

> **`--self-contained true` is required.** Omitting it produces a framework-dependent exe that fails to start with `spawn UNKNOWN` because Node.js can't load a .NET-dependent binary without the .NET runtime pre-installed.

## Architecture

Raycast extensions are TypeScript/Node.js; Windows Copilot Runtime APIs are WinRT (C#). The **Bridge Pattern** connects them:

```
Raycast (TypeScript/React)
    ↓ execFileAsync(NpuBridge.exe, [command, inputPath], { cwd: bridgeDir })
C# Bridge (NpuBridge.exe)
    ↓ Microsoft.Windows.AI.*  (NPU inference)
JSON result → stdout
```

### IPC Contract

- **stdin**: unused
- **stdout**: single JSON line — `{ status, outputPath?, message }`
- **stderr**: diagnostics only (stack traces, model readiness logs)
- **argv[0]**: command name (e.g. `remove-background`)
- **argv[1]**: absolute path to input image

### Background Removal

The output file is saved next to the input with a `_no_bg.png` suffix. The flow:

1. Check `ImageForegroundExtractor.GetReadyState()` — triggers model download via `EnsureReadyAsync()` on first run
2. Run NPU inference → grayscale mask (255 = foreground, 0 = background)
3. Apply mask as alpha channel via `IMemoryBufferByteAccess` pixel access
4. Encode as PNG with transparency via `BitmapEncoder.PngEncoderId`

## Requirements

- Windows 11 Build 26100+ (Copilot+ PC)
- NPU: Qualcomm Snapdragon X, Intel Lunar Lake, or AMD Ryzen AI 300
- ≥ 16 GB RAM
- Developer Mode enabled (for sparse package registration)
- .NET 8 SDK (build-time only — runtime is bundled by `--self-contained`)

## Workspace Status

- **Framework**: Bridge Pattern — defined and working
- **Active Extensions**:
  - `npu-image-editor-ext`: NPU-accelerated editor (Background Removal via `ImageForegroundExtractor`)
- **Roadmap** (see `COPILOT_CONTEXT.md`): Super Resolution (`ImageScaler`), OCR, Phi Silica text features
- **Primary Reference**: `COPILOT_CONTEXT.md` for technical vision; `NPU_INFO.md` for API notes
