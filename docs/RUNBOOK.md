# Runbook — bridges, WinRT, Phi, troubleshooting

Operational and technical reference for **all** extensions. Planning specs and per-feature narratives stay in **`FEATURE_PLAN.md`**. Factual wiring (identities, folders) in **`EXTENSION_REGISTRY.md`**. Contributor workflow in **`CONTRIBUTING.md`**.

## Suite layout (volatile data)

**Authoritative inventory:** `EXTENSION_REGISTRY.md` — extension folders, bridge exes, sparse `Identity Name` values, and rules for updating when new features land.

Do not duplicate the registry table here; update that file when wiring changes.

## Project overview

This is a **suite of standalone** Raycast for Windows extensions. Each folder under the repo root that contains a `package.json` is an installable Raycast extension. Several use a **C# bridge** to call Windows Copilot Runtime / WinRT APIs; others may use only TypeScript or a non–sparse-package native helper.

**Non-exhaustive examples** (see registry for truth):

- **NPU / WinRT imaging** — e.g. foreground extraction, scaling, OCR-related paths.
- **Phi-Silica / text** — e.g. `Microsoft.Windows.AI.Text.LanguageModel` (used in `npu-text-tools-ext`, `npu-notes-ext`, and `npu-awake-ext`).
- **Awake / Win32** — background persistence for system state.

### Background process pattern

Used by **`npu-awake-ext`** for persistent state:
1. **Spawn detached**: `spawn(exe, args, { detached: true, stdio: 'ignore' })`.
2. **PID Management**: Store `child.pid` in `LocalStorage` to track the process across command invocations.
3. **Kill on demand**: Use `process.kill(pid)` to stop the session.
4. **Lifecycle**: Use `child.unref()` so the Node.js event loop doesn't wait for the helper to exit.

## npm commands (any extension)

```powershell
cd <extension-directory>
npm run dev
npm run build
npm run lint
npm run fix-lint
npm run publish
```

## Building C# bridges (generic)

Applies to any extension with `bridge/NpuBridge.csproj` (or equivalent) that Raycast spawns from `assets/bin/`:

```powershell
cd <extension-directory>\bridge
dotnet publish -c Release -r win-x64 --self-contained true -o ..\assets\bin
```

- **ARM64:** `-r win-arm64`
- **`--self-contained true` is mandatory** — otherwise `spawn UNKNOWN` from Node when the .NET runtime is not installed for the user.

`register-bridge.ps1` (repo root, Administrator) copies `bridge/Package.appxmanifest` → `assets/bin/AppxManifest.xml` for each configured bridge and runs `Add-AppxPackage -Register`. **When you add a new sparse-package bridge, edit the script’s `$bridges` array and `EXTENSION_REGISTRY.md`.**

### Re-registering after `0x80073CFB`

Remove the package whose **Identity Name** matches the extension you changed (see that extension’s `Package.appxmanifest` or the registry), then re-run `register-bridge.ps1`:

```powershell
Remove-AppxPackage -Package (Get-AppxPackage -Name "<Identity-Name-from-manifest>").PackageFullName
```

To list related registrations: `Get-AppxPackage | Where-Object { $_.Name -match 'Bridge' }` (adjust filter as needed).

## Architecture

### Bridge pattern (NPU / sparse-package exes)

1. **TypeScript/React** — Raycast commands under `src/*.tsx`; may share components in `src/shared/`.
2. **Optional shell/PowerShell** — Explorer selection, clipboard, etc., where the feature needs it.
3. **C# bridge** — `bridge/Program.cs` built to **`assets/bin/NpuBridge.exe`** (name may vary; registry + csproj). Communicates via **one JSON line on stdout**; diagnostics on stderr.

**Invariant:** `execFile` / `execFileAsync` must use **`cwd: path.dirname(pathToExe)`** so bundled Windows App SDK DLLs resolve. Use `windowsHide: true` where supported.

### IPC contracts (extension-specific)

- **Argv and JSON shapes differ per bridge** — the image editor uses command names + paths; text tools uses `phi-rewrite` + mode + temp file; future bridges add new verbs in their own `Program.cs`.
- **`npu-text-tools-ext` selection helper:** `assets/bin/selection-helper/TextSelectionHelper.exe` — `send-copy <ms>` / `send-paste <ms>`: wait until foreground is not Raycast (poll + optional **AttachThreadInput** / **SetForegroundWindow** on window below in z-order), then **SendKeys** (STA). Exit **2** if Raycast never released focus (do not send bogus Copy). Published separately from `NpuBridge.exe`. **Tests:** `npm run test` + `npm run test:dotnet` in `npu-text-tools-ext`. See `selection-helper/README.md`.
- **Do not** assume all bridges share the same success JSON—read the spawn site in TS and the matching C# branch.
- **Reference:** `EXTENSION_REGISTRY.md` + top-of-file or per-`case` comments in `bridge/Program.cs`.

### Phi-Silica / `LanguageModel` (reusable pattern)

Use for on-device text generation when the feature is backed by `Microsoft.Windows.AI.Text.LanguageModel`:

1. `LanguageModel.GetReadyState()` — treat **`DisabledByUser`** and **`NotSupportedOnCurrentSystem`** as hard failures with a clear message; call **`EnsureReadyAsync()`** when **`NotReady`** (AI Dev Gallery pattern). Suite bridges centralize this in **`EnsurePhiLanguageModelReadyAsync`**.
2. `await using` / `using var model = await LanguageModel.CreateAsync()`.
3. `using var ctx = model.CreateContext(systemPrompt);`
4. `var response = await model.GenerateResponseAsync(ctx, userText, new LanguageModelOptions());` (do not `using`/dispose **`LanguageModelResponseResult`** unless your SDK version implements `IDisposable`).
5. Read **`response.Text`**.

**Suite convention (roadmap §1):** Raycast prefs **`ensureModelReady`** (default on) append argv **`--ensure-ready`** to the bridge; the C# entrypoint calls **`EnsureReadyAsync`** only when that flag is set and **`GetReadyState()`** is not **`Ready`**. Normative background: **`docs/REWRITE_INFO.md`**.

**API gotcha:** `CreateContext(string, …)` — second parameter is **`ContentFilterOptions`**, not user text. Wrong usage → CS1503.

**Namespace:** `Microsoft.Windows.AI.Text` — not `Microsoft.Windows.AI.Generative`.

**JSON from TypeScript:** camelCase keys — use `JsonSerializerOptions.PropertyNameCaseInsensitive = true` or `[JsonPropertyName]` for C# DTOs.

### Image editor flows (reference — details stay in source)

When working in **`npu-image-editor-ext/bridge/Program.cs`**:

- **Background removal** — `ImageObjectExtractor` readiness → mask → alpha via pixel buffer access; watch CsWinRT/COM casting issues. (Older Microsoft docs / drafts call this `ImageForegroundExtractor`; the WAS 2.0-experimental class shipped under the `ImageObjectExtractor` name.) Optional argv **`--ensure-ready`** matches the suite LanguageModel pattern.
- **Super resolution** — `ImageScaler` readiness; respect scale limits per OS/hardware. Same **`--ensure-ready`** flag.
- **OCR** — `SoftwareBitmap` → **Bgra8** for `OcrEngine`; dimension limits per docs.

### Organize / screenshot rename (reference — details in `npu-organize-ext/NOTES.md`)

- **Bridge verb:** `NpuBridge.exe screenshot-title <imagePath> [--ensure-ready] [--no-ocr]` — calls **`Microsoft.Windows.AI.Imaging.ImageDescriptionGenerator.DescribeAsync`** with **`ImageDescriptionKind.BriefDescription`** (caption scenario, same API the AI Dev Gallery "Describe Image WCR" sample uses) and optionally augments with `Windows.Media.Ocr.OcrEngine`. Identity **`NpuOrganizeBridge.Identity`**.
- **JSON contract:** `{ status, description, confidence: "high" | "low", ocrExcerpt: string|null, elapsedMs }` — TS side runs the deterministic `slugify()` step; bridge never writes filenames itself. Fallback slug `screenshot-{FNV-1a-hash}` is applied in TS when `confidence === "low"` or the sanitized slug is empty.
- **Filename convention:** `{YYYY-MM-DD}_{slug}.{ext}` (matches `npu-notes-ext` `saveNote`); `slug-only` pref drops the date prefix. Anti-loop guard skips files whose basename already matches `^\d{4}-\d{2}-\d{2}_`.
- **Don't fight Game Bar filenames:** the default Windows Game Bar saves to `%UserProfile%\Videos\Captures`, not `Pictures\Screenshots` — adjust the **Screenshots Folder** preference per source app. Microsoft Snipping Tool drops `.png` directly in `Pictures\Screenshots`, so the default works.

## Key file patterns (not a full inventory)

| Pattern | Role |
|---------|------|
| `<ext>/bridge/Program.cs` | Bridge entry and command dispatch |
| `<ext>/bridge/Package.appxmanifest` | Sparse identity + capabilities |
| `<ext>/bridge/app.manifest` | `msix` `publisher` / `packageName` must match manifest Identity |
| `<ext>/assets/bin/` | Published exe + deps — **never swap between extensions** |
| `register-bridge.ps1` | Registers all configured loose packages |
| `EXTENSION_REGISTRY.md` | **Update when adding bridges or identities** |
| `FEATURE_PLAN.md` | Product scope and lessons learned per feature |

## Development notes

- Manual testing via `npm run dev`; no shared automated test suite.
- **No shared runtime code** between extensions — no shared npm packages, no `file:` siblings, no codegen sync, no symlinks. When utilities recur (e.g. `ensure-bridge-registered.ts`), each extension copies the file verbatim. There is no guarantee any two extensions are installed together; each must work standalone. See `CONTRIBUTING.md` § "Project structure" for the full policy.
- On-device AI only — no cloud inference for NPU/Phi features.
- `systemAIModels` / sparse registration: Developer Mode for dev; LAF / Store rules for production distribution.
- `dotnet publish -o` — prefer forward slashes in mixed shell environments (`-o "../assets/bin"`).
- After messy bridge rebuilds, if `deps.json` / DLLs disagree, delete `assets/bin` and republish clean.

## Troubleshooting

### `spawn UNKNOWN`

Activation or runtime failed before the process ran: check **`app.manifest`** `publisher` matches `Package.appxmanifest` `Identity Publisher`; **`packageName`** matches **that extension’s** `Identity Name`; build is **self-contained**; **`cwd`** is the exe directory.

### `InvalidCastException` / `IInspectable`

For custom COM access from CsWinRT (e.g. `IMemoryBufferByteAccess`), use WinRT interop patterns (`IWinRTObject`, `Guid`, unmanaged delegates)—see existing `Program.cs` in the image bridge.

### Model not ready / slow first run

`EnsureReadyAsync()` may download weights; 30–60s first time is normal.

### Phi-Silica "Limited Access Feature" / access denied (only one extension breaks)

Symptom (examples):

- `Access is denied. Limited Access Feature is not available: com.microsoft.windows.ai.languagemodel. Status: 3`
- One Phi-powered extension works (e.g. `npu-text-tools-ext`), but another fails (e.g. `npu-notes-ext`).

Likely cause:

- The failing extension has a **stale or mismatched** `Microsoft.Windows.AI.Text.*` runtime DLLs in its `assets/bin/`.
  This can happen when publishing with a different Windows App SDK / AI package version, leaving behind older/newer DLLs.

Fix:

1. Confirm the failing extension’s `assets/bin` contains a consistent set of AI/Text DLLs (compare against a known-good Phi bridge).
2. **Delete** the AI/Text artifacts in `assets/bin/` (e.g. `Microsoft.Windows.AI.Text.dll`, `Microsoft.Windows.AI.Text.Projection.dll`, `Microsoft.Windows.AI.Text.winmd`, `Microsoft.Windows.AI.winmd`) to avoid stale leftovers.
3. Re-publish the bridge:

```powershell
cd <ext>\bridge
dotnet publish -c Release -r win-x64 --self-contained true -o ..\assets\bin
```

4. Re-run `register-bridge.ps1` if needed (manifest/identity changed or registration got stale).

Policy note:

- **`npu-notes-ext`** uses **`Microsoft.WindowsAppSDK` 2.0.0-experimental4** (historical Phi-Silica line for this bridge). Other Phi bridges use **`2.0.1`** without **`Microsoft.WindowsAppSDK.AI`**. **`npu-image-editor-ext`** uses **`2.0.1` + `Microsoft.WindowsAppSDK.AI`**. Mixing outputs under `assets/bin` between extensions causes confusing runtime failures — always publish from the matching `csproj` and wipe stale DLLs before republish.

### Phi-Silica Limited Access Feature (`TryUnlockFeature`) — **VERIFIED**

Microsoft documents **`LanguageModel`** as a **Limited Access Feature** with ID **`com.microsoft.windows.ai.languagemodel`**. Accessing this API requires a successful call to **`LimitedAccessFeatures.TryUnlockFeature`** before any model initialization.

**Critical Discovery (2026-05-10):**
Previous attempts at manual token calculation failed because standard Windows security documentation implies **UTF-16LE** (Unicode) encoding. However, the AI/LanguageModel feature **requires UTF-8** encoding for the hash input string. Using the wrong encoding results in `Status: 0` (Unavailable/Access Denied).

**Standard Suite Implementation (verified 2026-05-10):**
All Phi-powered bridges (`npu-text-tools-ext`, `npu-notes-ext`, `npu-dev-toolbox-ext`, `npu-awake-ext`) include a `TryUnlockNpuFeature()` method that performs dynamic unlock at runtime. This removes the need for manual `LAF_TOKEN` environment variables. Canonical reference: `npu-text-tools-ext/bridge/Program.cs`. In `npu-dev-toolbox-ext` the call is scoped inside `PhiCommit()` — `cwd-of-pid` does not use LanguageModel. When adding a new Phi bridge, copy this method verbatim and call it before the first `LanguageModel.GetReadyState()`.

1.  **Registry Lookup**: Reads the LAF Key from `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModel\LimitedAccessFeatures\com.microsoft.windows.ai.languagemodel`.
2.  **Identity Resolution**: Detects the current process **Package Family Name (PFN)**.
3.  **Token Calculation**: 
    - `input = "featureId!lafKey!pfn"`
    - `hash = SHA256(UTF8_Bytes(input))`
    - `token = Base64(hash.Take(16))`
4.  **Attestation**: `"[PublisherID] has registered their use of [featureId] with Microsoft and agrees to the terms of use."`

**Interpreting LAF Results:**
- **`Available` (1)** or **`AvailableWithoutToken` (2)**: Success.
- **`Unavailable` (0)**: Access Denied. Usually caused by incorrect token calculation (check encoding!), mismatched PFN, or missing `systemAIModels` capability.
- **`Unknown` (3)**: Feature ID not found in registry (check if your Windows build supports the NPU APIs).


### Windows Terminal (`wt.exe`) launches the “wrong” shell/profile (Dev Toolbox)

Symptoms:

- `npu-dev-toolbox-ext` “Open in Terminal” opens Windows Terminal, but the tab title shows `C:\Windows\system32\cmd.exe` (or otherwise looks like the wrong profile).
- Attempts to set a profile appear to be ignored.
- “Windows Terminal (wt) not found” errors even though `wt.exe` launches from a normal shell.

Causes and fixes:

- **Default profile mismatch**: Set Windows Terminal’s **Startup → Default profile** to your desired profile (e.g. PowerShell 7).
- **Multiple `wt.exe` resolution paths**: `wt.exe` is commonly a **0-byte App Execution Alias shim** at `%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe`. This is normal; don’t assume file size indicates “real exe”.
- **Do not validate PATH commands via filesystem checks**: `fs.existsSync("wt.exe")` will fail; use `where.exe wt.exe` (or equivalent) to check availability.
- **Argument placement**:
  - Working directory should be passed as a `new-tab` option: `wt.exe ... new-tab -d "<folder>"`.
  - Profile selection `-p` is also a `new-tab` option; place it after the subcommand: `wt.exe ... new-tab -p "<nameOrGuid>" -d "<folder>"`.
  - Passing unsupported flags can trigger modal Windows Terminal “Help” popups—avoid probing flags in normal flows.

Where this is implemented:

- `npu-dev-toolbox-ext/src/utils/launchers.ts` (Windows Terminal invocation and validation logic)

### NPU Notes — App Content Index (`AppContentIndexer`, planned)

Semantic note search / related-notes may move from **Phi per-candidate classification** to **Windows App SDK App Content Search** (`AppContentIndexer`: local semantic + lexical index, official RAG retrieval pattern). That work is **specified** in **`FEATURE_PLAN.md` §10 “Implementation audit & AppContentIndexer integration”** (including sparse-bridge feasibility spike, capability gating, and fallback ladder).

Operational expectations once implemented:

- **`systemAIModels`** is already declared on `NpuNotesBridge.Identity`; semantic indexing still requires **successful index capability initialization** (components may download — similar patience as first Phi run).
- The index is **not** tied to files on disk; if notes change outside the extension, run the documented **rebuild index** path (see `npu-notes-ext/NOTES.md` when shipped) or re-save from the app.
- Troubleshooting partial results: see Microsoft guidance on **async indexing** and **`WaitForIndexCapabilitiesAsync`** in `docs/INDEX_INFO.md`.
