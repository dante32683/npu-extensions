# NPU Extension Suite for Raycast (Windows)

A collection of high-performance Raycast for Windows extensions leveraging the Windows Copilot Runtime and NPU (Neural Processing Unit). These tools provide local, private, and fast AI capabilities directly on your PC.

## Extensions

### NPU Image Editor (`npu-image-editor-ext`)
Advanced image editing powered by the `Microsoft.Windows.AI.Imaging` APIs.
- **Background Removal**: Intelligent foreground extraction using the NPU.
- **Super Resolution**: Upscale images with high fidelity using AI.
- **Text Extraction (OCR)**: Extract text from images locally.
- **Sticker Maker**: Create custom stickers by automatically removing backgrounds.

### NPU Awake (`npu-awake-ext`)
Keep your PC awake using a dedicated C# background worker.
- **Timed Awake**: Keep the system active for a specific duration or until a set time.
- **Screen Off Mode**: Keep the PC awake while allowing the display to turn off.
- **Status Monitoring**: Integrated status check within Raycast.

### NPU Notes (`npu-notes-ext`)
A local-first, NPU-integrated note-taking experience.
- **Fast Search**: Search through your notes instantly.
- **Local Storage**: Your data never leaves your machine.

### NPU Text Tools (`npu-text-tools-ext`)
Local text refinement and rewriting powered by Phi Silica (NPU).
- **Rewrite Styles**: Simplify, Make Formal, or Make Concise.
- **Grammar Fix**: Instant local grammar and spelling correction.
- **Bullet Points**: Automatically summarize text into actionable points.

## Getting Started

### Prerequisites
- **Windows 11 Build 26100+** (Copilot+ PC recommended)
- **NPU**: Qualcomm Snapdragon X, Intel Lunar Lake, or AMD Ryzen AI 300
- **.NET 8 SDK** (required for building the bridges)
- **Node.js & npm**

### Setup

1. **Build the Bridges**:
   Each extension requires its C# bridge to be built. For example:
   ```powershell
   cd npu-image-editor-ext/bridge
   dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin
   ```

2. **Register Sparse Package Identity**:
   Run the registration script as **Administrator** to grant the bridges access to Windows Copilot Runtime APIs:
   ```powershell
   .\register-bridge.ps1
   ```

3. **Install Extension Dependencies**:
   ```powershell
   cd npu-image-editor-ext
   npm install
   ```

## Development
To start a specific extension in Raycast development mode:
```powershell
cd npu-image-editor-ext
npm run dev
```

## Architecture
The suite uses the **Bridge Pattern** to connect Raycast's TypeScript environment with high-performance WinRT APIs:
`Raycast (TS) <-> PowerShell/Node.js <-> C# Bridge (WinRT/NPU)`

## License
MIT
