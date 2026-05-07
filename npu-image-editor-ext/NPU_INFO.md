


Here is the extracted, vital information for building a Windows Copilot Runtime bridge for Raycast, stripped of the verbose architectural context:

### **Core Objective**
Connect Node.js-based Raycast extensions to local, NPU-accelerated Windows AI APIs using a lightweight, Native AOT-compiled C# bridge. 

### **1. System Requirements**
*   **Hardware:** Copilot+ PC with an NPU (Qualcomm Snapdragon X, Intel Lunar Lake, or AMD Zen 5) and at least 16 GB RAM.
*   **OS:** Windows 11 Build 26100+ (Build 26226.0+ highly recommended for the latest APIs).
*   **Dependencies:** `Microsoft.WindowsAppSDK.AI` NuGet package (v1.8.70+ or 2.0.1+).

### **2. C# Bridge Configuration (Native AOT)**
To ensure zero startup delay and remove .NET runtime dependencies, the bridge must be compiled to native machine code.
*   **Project File (`.csproj`) Must-Haves:**
    *   `TargetFramework`: Must specify the Windows build (e.g., `net10.0-windows10.0.26100.0`).
    *   `RuntimeIdentifier`: Match the host NPU architecture (e.g., `win-arm64`).
    *   `PublishAot` and `WindowsAppSDKSelfContained`: Set to `true`.
*   **Node.js Integration:** Export the entry point as a C-callable method using `[UnmanagedCallersOnly(EntryPoint = "napi_register_module_v1")]` to load the C# binary as a `.node` native addon. 

### **3. Security & Manifest Permissions (Crucial)**
Access to Windows generative AI is strictly gated.
*   **LAF Token:** You **must** acquire a Limited Access Feature (LAF) token from Microsoft using your Package Family Name (PFN). 
*   **Code Implementation:** Call `LimitedAccessFeatures.TryUnlockFeature(featureId, token, attestation)` *before* initializing any AI classes, or it will throw an "Access Denied" error.
*   **Manifest (`AppxManifest.xml`):** Must include `<systemai:Capability Name="systemAIModels"/>` and set `MaxVersionTested` to at least `10.0.26226.0`.

### **4. Accessing AI Features**
Before invoking models, always check availability via `GetReadyState()`. If `NotReady`, trigger the OS to download weights via `EnsureReadyAsync()`.
*   **Text (Phi Silica SLM):** Re-use a single `LanguageModel` instance. Features include raw prompts or predefined "Skills" (`TextSummarizer`, `TextRewrite`, `TextToTable`). 
*   **Vision (NPU-Accelerated):** Use `ImageForegroundExtractor` for background removal and `ImageScaler` for AI super-resolution on uncompressed bitmaps (`SoftwareBitmap`).

### **5. Extension Orchestration & Best Practices**
*   **Raycast (TypeScript):** Uses Node.js `child_process` or native bindings to talk to the C# bridge. Use PowerShell (`Shell.Application` COM object) to grab selected files from Windows Explorer.
*   **Memory/Context Management:** The local NPU has a strict memory limit. Manually truncate multi-turn conversation history to avoid exceeding the Phi Silica token context window. Dispose of `LanguageModelContext` objects when a thread finishes.
*   **Content Safety:** Windows AI applies content filters by default. Adjust `ContentFilterOptions` severity (High, Medium, Low) based on your use case.