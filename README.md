# NPU Extension Suite for Raycast (Windows)

A collection of high-performance Raycast for Windows extensions leveraging the Windows Copilot Runtime and NPU (Neural Processing Unit). These tools provide local, private, and fast AI capabilities directly on your PC.

## Extensions

### NPU Image Editor (npu-image-editor-ext)
Advanced image editing powered by the Microsoft.Windows.AI.Imaging APIs.
- **Background Removal**: Intelligent foreground extraction using the NPU.
- **Super Resolution**: Upscale images (2x, 4x, 8x) with high fidelity using AI.
- **Text Extraction (OCR)**: Extract text from selected images locally via Windows OCR.
- **Sticker Maker**: Create transparent 480x480 WebP stickers by automatically removing backgrounds and cropping to the subject.
- **Modify Image**: An all-in-one command with a full action panel for all image tools.

### NPU Awake (npu-awake-ext)
Prevents your PC from sleeping using a dedicated C# background worker and the SetThreadExecutionState API.
- **Indefinite Awake**: Toggle the system to stay awake indefinitely.
- **Timed Awake (Awake For...)**: Keep the system active for a specific number of minutes.
- **Awake Until**: Keep the system active until a specific clock time (e.g., 17:30).
- **Screen-Off Mode**: Keep the system awake and processing (good for downloads/renders) while allowing the display to turn off.
- **Status Monitoring**: View the current keep-awake mode and remaining time directly in Raycast.

### NPU Notes (npu-notes-ext)
A local-first, NPU-integrated note-taking experience with automated organization.
- **Smart Add Note**: Paste sloppy text and let Phi-Silica clean the grammar, format it as markdown, and automatically classify it into categories (Work, Personal, Tasks, etc.).
- **Browse Notes**: View your notes library instantly, automatically grouped by category.
- **Search Notes**: Find notes via keyword or semantic meaning.
- **Local Storage**: Your notes are saved as local Markdown files in your Documents folder.

### NPU Text Tools (npu-text-tools-ext)
Local text refinement and rewriting powered by Phi-Silica (NPU).
- **Fix Grammar**: Correct spelling and grammar without changing the original meaning.
- **Make Formal**: Rewrite text in a professional, professional tone.
- **Make Concise**: Shorten text to its essential points.
- **Simplify**: Rewrite in plain, easy-to-understand language.
- **Bullet Points**: Convert prose into a clear, well-structured bulleted list.
- **Custom Rewrite**: Provide your own instructions for how the AI should transform the text.

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
   Run the registration script as **Administrator** to grant the bridges access to Windows Copilot Runtime APIs:
   ```powershell
   .\register-bridge.ps1
   ```

3. **Install Extension Dependencies**:
   Navigate to each extension folder and install the required npm packages:
   ```powershell
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
