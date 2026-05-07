# NPU Extension Suite for Raycast (Windows)

A collection of high-performance Raycast for Windows extensions leveraging the Windows Copilot Runtime and NPU (Neural Processing Unit). These tools aim to provide local, private, and fast AI capabilities directly on your PC.

> **Status**: This project is currently in active development. While the extension UI and bridge infrastructure are scaffolded, many NPU-powered features are currently on the roadmap.

## Extensions

### NPU Image Editor (npu-image-editor-ext)
Advanced image editing powered by the Microsoft.Windows.AI.Imaging APIs.
- ✅ **Background Removal**: Functional. High-quality foreground extraction using the NPU.
- 🛠️ **Super Resolution**: Planned. High-fidelity image upscaling (2x, 4x, 8x).
- 🛠️ **Text Extraction (OCR)**: Planned. Local text extraction from images.
- 🛠️ **Sticker Maker**: Planned. Automatic background removal and cropping to subjects for WebP stickers.
- 🛠️ **Modify Image**: Scaffolded. All-in-one command UI for image tools.

### NPU Awake (npu-awake-ext)
Prevents your PC from sleeping using a dedicated background worker and the `SetThreadExecutionState` API.
- ✅ **Indefinite/Timed Awake**: Functional. Core keep-awake logic implemented in C# keeper.
- 🛠️ **Raycast UI**: Scaffolded. Commands for Awake, Awake For..., and Awake Until.

### NPU Notes (npu-notes-ext)
Local-first, NPU-integrated note-taking with automated organization.
- 🛠️ **Smart Add Note**: Planned. Phi-Silica powered grammar cleanup and classification.
- 🛠️ **Browse/Search Notes**: Planned. Organization and semantic search of local Markdown notes.

### NPU Text Tools (npu-text-tools-ext)
Local text refinement and rewriting powered by Phi-Silica (NPU).
- 🛠️ **Phi-Silica Rewriting**: Planned. Local implementations for Grammar Fix, Tone Shifting, Summarization (Bullet Points), and Simplify.
- 🛠️ **Custom Rewrite**: Planned. User-guided text transformation.

## Getting Started

### Prerequisites
- **Windows 11 Build 26100+** (Copilot+ PC recommended)
- **NPU**: Qualcomm Snapdragon X, Intel Lunar Lake, or AMD Ryzen AI 300
- **.NET 8 SDK** (required for building the bridge components)
- **Node.js & npm**

### Setup

1. **Build the Bridges**:
   Each extension requires its C# bridge to be built for your architecture (x64 or ARM64).
   ```powershell
   # Example for Image Editor (x64)
   cd npu-image-editor-ext/bridge
   dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin
   ```

2. **Register Sparse Package Identity**:
   Run the registration script as **Administrator** to grant the bridges access to Windows Copilot Runtime APIs (required for NPU features):
   ```powershell
   .\register-bridge.ps1
   ```

3. **Install Extension Dependencies**:
   Navigate to each extension folder and install the required npm packages:
   ```powershell
   npm install
   ```

## Architecture
The suite uses the **Bridge Pattern** to connect Raycast's TypeScript environment with high-performance WinRT APIs:
`Raycast (TS) <-> PowerShell/Node.js <-> C# Bridge (WinRT/NPU)`

## License
MIT
