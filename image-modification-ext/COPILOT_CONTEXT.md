# Copilot+ PC Extensions: Development Context & Strategy

## 1. Overview & Vision
This repository is dedicated to building Raycast for Windows extensions that leverage the **Windows Copilot Runtime** and **NPU (Neural Processing Unit)** hardware. The goal is to move away from "portable but heavy" JavaScript-based processing (like Jimp) and toward "native, high-performance AI" that stays 100% on-device.

## 2. The Current Issue: Non-Copilot PCs vs. Copilot+
The existing "Image Modification" extension was built for maximum compatibility across all Windows devices. This led to several constraints:
- **Engine Overhead**: We had to bundle `jimp` (pure JS), which is CPU-bound and slower than native engines.
- **Model Bloat**: Features like background removal were deferred because bundling the necessary AI models (170MB+) would make the extension too heavy for a standard launcher.
- **Hardware Limitations**: Standard PCs lack a dedicated NPU, meaning AI tasks would drain battery and spin fans by pinning the CPU/GPU.

**The Copilot+ Advantage:** By targeting only Copilot+ PCs (Snapdragon X Series, etc.), we can use the **Windows Copilot Library**—a set of APIs where the models are already part of the OS and the processing happens on the NPU.

## 3. High-Priority Feature Roadmap (The "NPU List")
These are the features planned for development using the Windows Copilot Runtime:

### Image & Media (NPU-Powered)
- **Native Background Removal**: Using `Microsoft.Windows.AI.Imaging.ImageSegmenter`. Zero bundle size, instant NPU execution.
- **Generative Object Eraser**: Removing unwanted objects and using generative fill to repair the background.
- **AI Super Resolution**: Upscaling images up to 8x using the NPU to hallucinate detail.
- **Semantic Image Search**: Local indexing of images based on content (e.g., searching for "mountains") without cloud processing.

### Text & Intelligence
- **Phi-Silica Integration**: Utilizing the built-in Small Language Model (SLM) for local summarization, rephrasing, and chat.
- **NPU-OCR**: Highly accurate, orientation-aware text extraction from screenshots or files.
- **PII Masking**: Using local AI to redact sensitive info (names, SSNs, CCs) before pasting to external LLMs.

### Productivity & Audio
- **Live Meeting Summary**: Tapping into system audio for real-time transcription and action-item generation via NPU.
- **Semantic File Retrieval**: Searching through documents by "meaning" rather than just filenames.

## 4. Technical Implementation Strategy
Since Raycast extensions are Node.js/TypeScript based, and Copilot APIs are WinRT (C#/C++), we must use a **Bridge Architecture**:

1. **The Extension (TS)**: Handles the UI, file selection (PowerShell), and user interaction.
2. **The Bridge (C#)**: A lightweight, AOT-compiled executable that interfaces with `Microsoft.Windows.AI.Imaging` and other Copilot Runtime namespaces.
3. **Communication**: The extension spawns the Bridge process, sends data via `stdin` or temporary files, and receives JSON/Image data back.

## 5. Implementation Notes from Current Workspace
To carry over the work done in the `image-modification-ext` folder:
- **File Selection**: Continue using the PowerShell COM script (`New-Object -ComObject Shell.Application`) to get selected items from Explorer.
- **Clipboard**: Continue using the PowerShell `.Save()` method for initial capture, or move to native C# clipboard APIs in the Bridge.
- **Suffix Logic**: Maintain the `_rotated`, `_processed` naming convention for non-destructive editing.

---
*Context saved for the next generation of Windows AI extensions.*
