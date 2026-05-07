# NPU Image Editor Extension

This extension provides high-performance image editing capabilities powered by the Windows Copilot Runtime and NPU.

## 📁 Structure

- `src/`: Raycast extension source code (TypeScript/React).
  - `modify-image.tsx`: Main UI and bridge integration.
  - `utils/powershell-utils.ts`: Explorer/Clipboard integration logic.
- `bridge/`: C# Bridge source code (WinRT interface).
  - `NpuBridge.csproj`: Project file targeting Windows 11 SDK.
  - `Program.cs`: NPU-powered background removal logic.
- `assets/bin/`: Location for the compiled `NpuBridge.exe`.

## 🛠️ Features

1.  **Remove Background**: Uses the NPU-accelerated `ImageForegroundExtractor` (WinRT).
2.  **Explorer Integration**: Automatically detects selected images in active Explorer windows.
3.  **Clipboard Support**: Process images directly from the clipboard.

## ⚙️ Building the Bridge

The Bridge requires **Windows App SDK 1.6+ (Experimental)** to access the `Microsoft.Windows.AI` namespaces.

1.  **Environment**: Ensure you are on a **Copilot+ PC** (or have the latest Windows AI SDKs installed).
2.  **Build Command**:
    ```powershell
    cd bridge
    dotnet publish -c Release -r win-x64 -o ../assets/bin --no-self-contained
    ```
    *Note: You may need to use Visual Studio 2022 (Preview) to resolve experimental NuGet packages.*

## 📜 Conventions

- **Naming**: Output files use the `_processed` suffix.
- **Paths**: Absolute paths are used for cross-process reliability.
- **NPU-First**: All processing is offloaded to the C# bridge to leverage the NPU.
