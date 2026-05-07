# NPU Extension Suite for Raycast (Windows)

A collection of high-performance Raycast for Windows extensions leveraging the Windows Copilot Runtime and NPU (Neural Processing Unit).

## Extensions

### 1. NPU Image Editor (`npu-image-editor-ext`)
NPU-accelerated image editing tools.
- **Background Removal**: Uses `ImageForegroundExtractor` (NPU) for high-quality, local background removal.
- **Architecture**: Leverages a C# Bridge (`NpuBridge.exe`) to interface with WinRT APIs.

## Getting Started

### Prerequisites
- Windows 11 Build 26100+ (Copilot+ PC)
- NPU: Qualcomm Snapdragon X, Intel Lunar Lake, or AMD Ryzen AI 300
- .NET 8 SDK (for building the bridge)
- Node.js & npm

### Setup
1. **Build the Bridge**:
   ```powershell
   cd npu-image-editor-ext/bridge
   dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin
   ```
2. **Register Sparse Package**:
   ```powershell
   .\register-bridge.ps1
   ```
3. **Install Dependencies**:
   ```powershell
   cd npu-image-editor-ext
   npm install
   ```

## Development
Run an extension in development mode:
```powershell
cd npu-image-editor-ext
npm run dev
```

## License
MIT
