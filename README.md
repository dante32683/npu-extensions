# NPU Extension Suite for Raycast (Windows)

Raycast for Windows extensions that use the Windows Copilot Runtime, local SLMs (e.g. Phi-Silica), and/or NPUs where applicable. Processing stays on-device.

> **What ships where:** See **`EXTENSION_REGISTRY.md`** for an authoritative table (per-folder bridges, sparse package names, and how to update the list when you add features). This README stays **pattern-based** so it does not need edits for every new command.

## Extensions (overview)

The repo holds **independent** extensions under separate directories (each with its own `package.json`). Capabilities range from NPU image tools and Phi text rewrites to keep-awake helpers—check the registry for current binaries and registration needs.

- **Image tooling** — `npu-image-editor-ext` (WinRT / NPU imaging APIs; Explorer-focused workflows).
- **Text tooling** — `npu-text-tools-ext` (Phi-Silica rewrites; shared UI + bridge).
- **Notes / awake** — scaffolded or partial; same “one folder per extension” rule.

Do **not** assume every extension uses a C# bridge: some use only TypeScript; others use a sparse-registered `NpuBridge.exe` or a separate helper (see registry).

## Documentation (contributors & AI tools)

| Document | Purpose |
|----------|---------|
| [**`CONTRIBUTING.md`**](CONTRIBUTING.md) | Workflow, quick start, where to log changes |
| [**`FEATURE_PLAN.md`**](FEATURE_PLAN.md) | **Primary planning database** — roadmap & per-feature history |
| [**`EXTENSION_REGISTRY.md`**](EXTENSION_REGISTRY.md) | Bridges, sparse identities, conventions |
| [**`docs/RUNBOOK.md`**](docs/RUNBOOK.md) | Technical patterns & troubleshooting |
| [**`CHANGELOG.md`**](CHANGELOG.md) | Release-oriented summaries |
| **`AGENTS.md`**, **`CLAUDE.md`**, **`GEMINI.md`** | Short stubs that point at the same hub |

Per extension: **`<extension>/NOTES.md`**.

## Getting Started

### Prerequisites

- **Windows 11 Build 26100+** where Copilot Runtime features are required (see `NPU_INFO.md` if present).
- **Hardware:** NPU / Copilot+ expectations for AI imaging and Phi—see registry and hardware notes.
- **.NET 8 SDK** — build-time, for bridges.
- **Node.js & npm** — per extension.

### Setup (any bridge extension)

1. **Publish the native bridge** for the extension you are working on (repeat for each that has a `bridge/` folder you use):

   ```powershell
   cd <extension-folder>/bridge
   dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin
   ```

   Substitute `win-arm64` on ARM64. **`--self-contained true` is mandatory** so Raycast can start the exe without a separate .NET install.

2. **Register sparse packages** (only extensions that declare `systemAIModels` / loose registration—listed in **`EXTENSION_REGISTRY.md`**):

   ```powershell
   # Repo root, Administrator
   .\register-bridge.ps1
   ```

   The script mirrors `Package.appxmanifest` into each `assets/bin/AppxManifest.xml`. If registration fails with `0x80073CFB`, remove the stale **Identity** for that bridge (name is in the extension manifest / registry), then re-run.

3. **Install npm dependencies** in each extension you run:

   ```powershell
   cd <extension-folder>
   npm install
   npm run dev
   ```

## Architecture

**Bridge pattern (where used):** `Raycast (TypeScript)` spawns a **per-extension** native binary under that extension’s `assets/bin/`, with `cwd` set to that directory, and reads **one JSON line** from stdout (stderr for diagnostics). Exact argv and payload shapes are **per bridge**—see `EXTENSION_REGISTRY.md` and the relevant `bridge/Program.cs`.

## License

MIT
