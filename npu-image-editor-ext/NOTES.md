# NPU Image Editor — maintenance notes

Extension-specific detail for **`npu-image-editor-ext`**. Suite workflow: **`CONTRIBUTING.md`**. Wiring table: **`EXTENSION_REGISTRY.md`**. Planning: **`FEATURE_PLAN.md`**.

## Structure

- `src/`: Raycast extension source code (TypeScript/React).
  - `modify-image.tsx`: Main UI and bridge integration.
  - `utils/powershell-utils.ts`: Explorer/Clipboard integration logic.
- `bridge/`: C# Bridge source code (WinRT interface).
  - `NpuBridge.csproj`: Project file targeting Windows 11 SDK.
  - `Program.cs`: NPU-powered imaging commands (background removal, super-resolution, OCR, etc.—see source).
- `assets/bin/`: Location for the compiled `NpuBridge.exe`.

## Features

1. **Remove Background**: Uses the NPU-accelerated `ImageObjectExtractor` (WinRT, `Microsoft.Windows.AI.Imaging`). Older Microsoft drafts call this `ImageForegroundExtractor`.
2. **Explorer Integration**: Automatically detects selected images in active Explorer windows.
3. **Clipboard Support**: Process images directly from the clipboard.

Additional commands (super-resolution, extract-text, etc.) are documented in **`FEATURE_PLAN.md`** and implemented in `src/` + `bridge/Program.cs`.

## Building the bridge

The bridge targets **.NET 8**, **Windows App SDK 2.x experimental**, and **`--self-contained true`** (required so Raycast can spawn `NpuBridge.exe` without a separate .NET install).

1. **Environment**: Ensure you are on a **Copilot+ PC** (or have the latest Windows AI SDKs installed).

~~2. **Build Command**:
    ```powershell
    cd bridge
    dotnet publish -c Release -r win-x64 -o ../assets/bin --no-self-contained
    ```
    *Note: You may need to use Visual Studio 2022 (Preview) to resolve experimental NuGet packages.*~~

2. **Build command (current):**
   ```powershell
   cd bridge
   dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin
   ```
3. From repo root, run `.\register-bridge.ps1` as Administrator after first publish or manifest changes.

## Conventions

- **Naming**: Output files use the `_processed` suffix (and other suffixes per command—see bridge).
- **Paths**: Absolute paths are used for cross-process reliability.
- **NPU-First**: Processing is offloaded to the C# bridge to leverage the NPU where applicable.

## Suite pointer

This file **replaces long-form duplication** under `GEMINI.md` for this folder. Root **`GEMINI.md`** is a one-line redirect to the hub docs.
