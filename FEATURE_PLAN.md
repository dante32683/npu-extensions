# Feature Plan

> **Historical planning database (large):** This file retains **full specs, long narratives, and dated / struck-through lessons**. **Suite-wide UI / toast / code-style norms** live in [`docs/SUITE_STYLE_GUIDE.md`](docs/SUITE_STYLE_GUIDE.md). **Do not permanently delete historical content**—strike through and date superseded parts, or move tiny redundant fragments into **`CHANGELOG.md`** / **`docs/RUNBOOK.md`** only when they’re fully captured elsewhere.
>
> **Active “what we’re building next” (clean summary):** [`docs/FORWARD_ROADMAP.md`](docs/FORWARD_ROADMAP.md) — consolidated forward work (notes indexer/RAG, text hotkeys, bridge alignment, `TextRewriter`, etc.). Prefer that doc for day-to-day scope; use **this** file for depth and archaeology.
>
> **Where else to look:** **Contributor workflow & logging:** [`CONTRIBUTING.md`](CONTRIBUTING.md). **UI copy, toasts, and code hygiene (canonical):** [`docs/SUITE_STYLE_GUIDE.md`](docs/SUITE_STYLE_GUIDE.md). **Factual wiring** (bridges, sparse `Identity` names): [`EXTENSION_REGISTRY.md`](EXTENSION_REGISTRY.md). **Technical depth & troubleshooting:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md). **Release summary:** [`CHANGELOG.md`](CHANGELOG.md). **Per-extension notes:** `<extension>/NOTES.md`. The repo files `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` are **stubs** that point at the same hub for different AI products.
>
> *(Earlier pointer: technical patterns were also summarized in long-form `CLAUDE.md`; that content now lives in **`docs/RUNBOOK.md`**.)*

---

## Scaffolding Status

> **Completed by Codex (2026-05-07).** All items below marked ✅ are done. Items marked 🔲 remain.

### What Codex did

- ✅ Updated all extension `package.json` command manifests (all commands in the PENDING section below are now live)
- ✅ Added missing Raycast command source files for image, text tools, notes, and awake extensions
- ✅ Added C# bridge scaffolds for `npu-text-tools-ext` and `npu-notes-ext`
- ✅ Added `AwakeKeeper.csproj` + `Program.cs` with the keep-awake loop structure (`npu-awake-ext/keeper/`)
- ✅ Added placeholder `case` blocks in `bridge/Program.cs` for `super-resolution`, `ocr`, and `make-sticker`
- ✅ Updated `register-bridge.ps1` to handle image, text, and notes bridge packages
- ✅ Added `.eslintrc`, `.prettierrc`, and `assets/extension-icon.png` (512×512) for each new extension
- ✅ Updated `.gitignore` for package lockfiles, .NET artifacts, test outputs, and `FEATURE_PLAN.md`

### Validation results

- `npm run lint` — passed in `npu-image-editor-ext`
- `npm run build` — passed in `npu-image-editor-ext`
- `dotnet build` — passed for `npu-awake-ext/keeper`, `npu-text-tools-ext/bridge`, `npu-notes-ext/bridge`
- Package JSON parsing and command-to-source-file checks — passed
- New non-image extensions: manifests and native projects validated; `node_modules` not yet installed, Raycast builds not run

### What's next

~~All scaffolding is in place. Proceed to the **Build Order** section and start at item #1 (Super Resolution). The PENDING package.json section below is now historical reference — the changes have been applied.~~

**Update (2026-05-07):** Items **#1 Super Resolution**, **#2 OCR**, and **#3 Phi-Silica Text Tools** are implemented. Next up per **Build Order** is **#4 Smart Note Taker** (then Awake, Sticker Maker, etc.). The PENDING `package.json` section below remains historical reference.

---

## ~~PENDING~~: package.json changes (applied by Codex — kept for reference)

These files needed updating before the respective extensions could run in `npm run dev`. ~~Do not implement the commands yet — just update the manifests.~~

### `npu-image-editor-ext/package.json` — add commands

```json
{
  "commands": [
    { "name": "modify-image",        "title": "Modify Image",         "description": "All image tools — file list with full action panel.",           "mode": "view" },
    { "name": "remove-background",   "title": "Remove Background",    "description": "NPU: remove background from selected Explorer images.",         "mode": "view" },
    { "name": "super-resolution",    "title": "Super Resolution",     "description": "NPU: upscale selected Explorer images (2x / 4x / 8x).",         "mode": "view" },
    { "name": "make-sticker",        "title": "Make Sticker",         "description": "NPU: crop to subject, transparent bg, 480×480 WebP.",           "mode": "view" },
    { "name": "extract-text",        "title": "Extract Text (OCR)",   "description": "Extract text from selected Explorer images.",                   "mode": "view" }
  ]
}
```

### `npu-text-tools-ext/package.json` — replace placeholder command

```json
{
  "commands": [
    { "name": "fix-grammar",     "title": "Fix Grammar",      "description": "Correct spelling and grammar without changing meaning.", "mode": "view" },
    { "name": "make-formal",     "title": "Make Formal",      "description": "Rewrite text in a professional tone.",                  "mode": "view" },
    { "name": "make-concise",    "title": "Make Concise",     "description": "Shorten text to its essential points.",                 "mode": "view" },
    { "name": "bullet-points",   "title": "Bullet Points",    "description": "Convert prose into a bullet point list.",               "mode": "view" },
    { "name": "simplify",        "title": "Simplify",         "description": "Rewrite in plain, easy-to-understand language.",       "mode": "view" },
    { "name": "custom-rewrite",  "title": "Custom Rewrite",   "description": "Describe how you want the text rewritten.",            "mode": "view" }
  ]
}
```

### `npu-notes-ext/package.json` — replace placeholder commands

```json
{
  "commands": [
    { "name": "add-note",      "title": "Add Note",      "description": "Write a sloppy note — Phi formats and files it.", "mode": "view" },
    { "name": "browse-notes",  "title": "Browse Notes",  "description": "List and filter saved notes by category.",        "mode": "view" },
    { "name": "search-notes",  "title": "Search Notes",  "description": "Search notes by keyword or meaning.",             "mode": "view" }
  ]
}
```

### `npu-awake-ext/package.json` — replace placeholder command

```json
{
  "commands": [
    { "name": "awake",            "title": "Awake",             "description": "Toggle indefinite keep-awake on/off.",                                "mode": "no-view" },
    { "name": "awake-for",        "title": "Awake For...",      "description": "Keep awake for N minutes.",                    "mode": "view", "arguments": [{ "name": "duration", "placeholder": "minutes", "type": "text", "required": false }] },
    { "name": "awake-until",      "title": "Awake Until",       "description": "Keep awake until a specific time.",            "mode": "view", "arguments": [{ "name": "time", "placeholder": "e.g. 17:30", "type": "text", "required": false }] },
    { "name": "let-sleep",        "title": "Let Sleep",         "description": "Cancel the active keep-awake session.",                               "mode": "no-view" },
    { "name": "awake-status",     "title": "Awake Status",      "description": "Show current keep-awake mode and time remaining.",                    "mode": "view" },
    { "name": "screen-off-mode",  "title": "Screen-Off Mode",   "description": "System stays awake but display is allowed to sleep.",                 "mode": "no-view" }
  ]
}
```

---

## Build Order

| # | Feature | Extension | Complexity |
|---|---------|-----------|------------|
| 1 | Super Resolution | `npu-image-editor-ext` | Low |
| 2 | OCR / Extract Text | `npu-image-editor-ext` | Low |
| 3 | Phi-Silica Text Tools | `npu-text-tools-ext` (new) | Medium |
| 4 | Smart Note Taker | `npu-notes-ext` (new) | Medium |
| 5 | Smart Awake (Natural Language) | `npu-awake-ext` | Medium-High |
| 6 | Sticker Maker (basic) | `npu-image-editor-ext` | Medium-High |
| 7 | Sticker Maker (manual focus) | `npu-image-editor-ext` | High — API TBD |
| 8 | Search Notes | `npu-notes-ext` | Later |
| 9 | NPU Dev Toolbox (Git Commit) | `npu-dev-toolbox-ext` (new) | Medium |
| 10 | Semantic Note Linking | `npu-notes-ext` | Medium |
| 11 | Workspace Search (Smart Grep + Phi Assist) | `npu-dev-toolbox-ext` | Medium |

> **Status (2026-05-07):** Items **#1 Super Resolution**, **#2 OCR**, **#3 Phi-Silica Text Tools**, and **#4 Smart Note Taker** are implemented. **#5 Awake** is currently being redesigned as **Smart Awake** to incorporate NPU-powered natural language schedule parsing. Next up after the redesign is **#6 Sticker Maker**. Items **#9** and **#10** are new additions to the roadmap. The PENDING `package.json` section below remains historical reference.

> **Status update (2026-05-08):** **#5 Smart Awake** has shipped. **#6 Sticker Maker (basic)** has shipped. **#9 NPU Dev Toolbox** (Commit Message + Open Workspace) has shipped. **Workspace detection in Dev Toolbox was significantly improved** to scan all open Explorer windows and prioritize Git repositories, solving the "detection block" issue when non-workspace folders are focused.

---

## ~~1. Super Resolution~~
> **Completed by Gemini (2026-05-07).**
> - Implemented the `super-resolution.tsx` Raycast command and updated the C# bridge.
> - **Lesson Learned:** The `ImageScaler` API does not currently support 8x upscaling on the target hardware (it throws "The parameter is incorrect"). The 8x option was removed; it now safely supports 2x and 4x upscaling.
> - **UX Polish:** Standardized the toast messages across all NPU commands for consistency ("Running NPU Super Resolution...").

~~**Extension:** `npu-image-editor-ext`~~
~~**New files:** `src/super-resolution.tsx`, new `case "super-resolution"` in `bridge/Program.cs`~~

### ~~What it does~~
Upscales selected Explorer images using `Microsoft.Windows.AI.Imaging.ImageScaler` on the NPU. No model download — lives in the OS. Zero bundle size.

### ~~User flow~~
- Select images in Explorer
- Run "Super Resolution" command (or use the action inside Modify Image)
- Form: scale factor dropdown — **2x / 4x / 8x**
- Bridge upscales each file, saves as `<name>_2x.<ext>` next to source
- Toast: "Upscaled 3 image(s)"

### ~~Bridge command~~
```
NpuBridge.exe super-resolution <inputPath> <scaleFactor>
```
`scaleFactor` is `2`, `4`, or `8` as a string.

### ~~Implementation notes~~
- Same ready-state pattern as `ImageForegroundExtractor`: check `ImageScaler.GetReadyState()`, call `EnsureReadyAsync()` if not ready
- First run may be slow (model download). Toast: "Preparing NPU model (first run only)..."
- **Verify** `ImageScaler` is available in the current `WindowsAppSDK` experimental4 NuGet package before starting. If the class name differs, check `NPU_INFO.md` and the Windows App SDK release notes.
- Output format: same as input (preserve extension)

---

## ~~2. OCR — Extract Text from Images~~
> **Completed by Gemini (2026-05-07).**
> - Implemented the `extract-text.tsx` Raycast command and updated the C# bridge.
> - **Lesson Learned:** `Windows.Media.Ocr.OcrEngine` requires the input `SoftwareBitmap` to be in the `BitmapPixelFormat.Bgra8` format. An automatic conversion was added to `Program.cs` before passing the image to `RecognizeAsync`.
> - **UX Polish:** Changed the Raycast UI from a static `Detail` view to an editable `Form.TextArea` so users can modify the extracted text before copying. Added a Raycast extension preference (`autoOpenTxt`) to toggle whether `.txt` files open automatically after being saved, instead of cluttering the form UI.

~~**Extension:** `npu-image-editor-ext`~~
~~**New files:** `src/extract-text.tsx`, new `case "ocr"` in `bridge/Program.cs`~~

### ~~What it does~~
~~Extracts text from one or many selected Explorer images. Batch-capable. Output goes to a Raycast detail view or a `.txt` file.~~

### ~~User flow~~
~~- Select images in Explorer~~
~~- Run "Extract Text (OCR)" command (or action inside Modify Image)~~
~~- Form: output mode dropdown — **View in Raycast** or **Save as .txt file**~~
~~- Bridge runs OCR on each file, returns results as JSON array `[{ file, text }, ...]`~~
~~- **View mode:** Raycast detail view, one section per image, primary action "Copy All to Clipboard"~~
~~- **File mode:** `ocr_results.txt` saved to the directory of the first selected image~~

### ~~Output format (both modes)~~
```
=== filename1.png ===
extracted text here...

=== filename2.jpg ===
extracted text here...
```

### ~~Bridge command~~
```
NpuBridge.exe ocr <inputPath1> [inputPath2 ...]
```
~~Returns: `{ "status": "success", "results": [{ "file": "...", "text": "..." }, ...] }`~~

### ~~Implementation notes~~
~~- Use `Windows.Media.Ocr.OcrEngine` — available without App SDK, no NPU capability declaration needed~~
~~- Default to `OcrEngine.TryCreateFromUserProfileLanguages()` (matches system language)~~
~~- If an NPU-accelerated OCR variant exists in `Microsoft.Windows.AI`, prefer it — but fall back gracefully~~
~~- No language picker for v1~~
~~- For multiple files: call bridge once per file from TypeScript, aggregate results in TS (simpler than variadic args)~~

---

## 3. Phi-Silica Text Tools
> **Completed by Claude (2026-05-07).**
> - Implemented `npu-text-tools-ext/bridge/Program.cs`, `Package.appxmanifest`, updated `NpuBridge.csproj`, created `make-concise.tsx` stub, and implemented the full `src/shared/TextRewriteCommand.tsx` UI.
> - **Lesson Learned — Namespace:** `LanguageModel` is **not** in `Microsoft.Windows.AI.Generative`. The correct namespace is `Microsoft.Windows.AI.Text`. Using `Microsoft.WindowsAppSDK 2.0.0-experimental4` pulls in `Microsoft.WindowsAppSDK.AI 2.0.130-experimental`, which is where the Text namespace lives.
> - **Lesson Learned — Response property:** The generation result type is `LanguageModelResponseResult`. Its text output property is **`.Text`**, not `.Response` or `.Content`.
> - ~~**Lesson Learned — Generation method:** Call `await model.GenerateResponseAsync(fullPrompt)` where `fullPrompt` is the system instructions and user text concatenated as a single string (e.g., `$"{systemPrompt}\n\n{userText}"`). A multi-turn conversation API (`LanguageModelContext`) also exists but the single-string overload is sufficient for these stateless rewrite tasks.~~
> - **Lesson Learned — Generation method (revised 2026-05-07, Cursor):** Use explicit system vs user turns for reliable instruction following (especially **Custom Rewrite**): `using var ctx = model.CreateContext(systemPrompt);` then `await model.GenerateResponseAsync(ctx, userText, new LanguageModelOptions())`. **Do not** pass user text into `CreateContext` as a second string — the SDK overload is `CreateContext(string, ContentFilterOptions)`, which caused CS1503 when misused. The single-string `GenerateResponseAsync(prompt)` overload remains valid for quick experiments but was misleading the model on custom instructions when stuffed into one blob.
> - **Lesson Learned — Custom JSON (2026-05-07, Cursor):** TypeScript writes camelCase `instruction` / `text`. `System.Text.Json` defaults to case-sensitive property names; deserialize with `PropertyNameCaseInsensitive = true` (or `[JsonPropertyName]`) so `CustomPayload` binds; otherwise custom mode can silently mis-bind or appear "broken."
> - **Lesson Learned — TextRewriter:** A higher-level `TextRewriter` class with `RewriteAsync(text, tone)` and `RewriteCustomAsync` exists in `Microsoft.Windows.AI.Text`. The `TextRewriteTone` enum has `Formal`, `General`, `Casual`, and `Concise` values. For grammar, bullets, and simplify modes these tones don't map cleanly, so `LanguageModel` with custom prompts is used for all six modes for consistency.
> - **Lesson Learned — Capability:** `systemAIModels` in `Package.appxmanifest` is sufficient for `LanguageModel` in Developer Mode (sparse package loose registration). No LAF token is required for local development.

> **Ship / validation (2026-05-07, Cursor):** `dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin` from `npu-text-tools-ext/bridge/`; `register-bridge.ps1` registers `NpuTextToolsBridge.Identity` (distinct from the image editor’s `NpuBridge.Identity`). `npm run lint` and `npm run build` pass in `npu-text-tools-ext`.

~~**Extension:** `npu-text-tools-ext` (new, scaffolded at `npu-text-tools-ext/`)~~  
~~**New files:** one `.tsx` per command in `src/`, one shared `bridge/Program.cs`~~

**Extension:** `npu-text-tools-ext` — implemented; six commands in `package.json`, thin entry files under `src/*.tsx`, shared UI `src/shared/TextRewriteCommand.tsx`, dedicated bridge `npu-text-tools-ext/bridge/` → `assets/bin/NpuBridge.exe`.

### What it does
Rewrites clipboard or typed text using Phi-Silica (`Microsoft.Windows.AI.Text.LanguageModel`) fully on-device. No internet. Six discrete Raycast commands so each can have its own hotkey.

### UX pattern (same for all six commands)
1. Command opens
2. If clipboard contains text → pre-fill the text field with it
3. User edits if needed, submits
4. Phi-Silica processes → result shown in a Raycast detail view
5. Primary action: "Copy to Clipboard" (auto-closes)
6. Secondary action: "Try Another Mode" (goes back to form with text pre-filled)

### Commands and prompts

| Command | System prompt to Phi |
|---------|---------------------|
| Fix Grammar | `"Correct the grammar and spelling of the following text. Do not change the meaning or length. Do not add any extra formatting. Return only the corrected text, no explanation."` |
| Make Formal | `"Rewrite the following text in a formal, professional tone. Return only the rewritten text, no explanation."` |
| Make Concise | `"Rewrite the following text as concisely as possible while preserving all key information. Return only the rewritten text, no explanation."` |
| Bullet Points | `"Convert the following text into a clear, well-structured bullet point list. Return only the bullet points, no explanation."` |
| Simplify | `"Rewrite the following text in simple, plain language that is easy to understand. Return only the rewritten text, no explanation."` |
| Custom Rewrite | *(user provides the instruction — see below)* |

### Custom Rewrite command
- Two fields: **Instruction** (e.g. "make this somewhat formal but still friendly") and **Text**
- System prompt: `"Rewrite the following text according to this instruction: {instruction}. Return only the rewritten text, no explanation."`
- Instruction field has some sort of placeholder: `e.g. "make this somewhat formal but still friendly"` 

### Bridge command
```
NpuBridge.exe phi-rewrite <mode> <tempInputFile>
```
- `mode`: `grammar | formal | concise | bullets | simplify | custom`
- Text passed via temp file (avoids CLI arg length limits)
- For `custom` mode: temp file contains `{ "instruction": "...", "text": "..." }` as JSON
- Returns: `{ "status": "success", "result": "rewritten text here" }`

### Implementation notes
- **Namespace:** `using Microsoft.Windows.AI.Text;` — **not** `Microsoft.Windows.AI.Generative` (that namespace does not exist in this SDK version).
- **NuGet packages needed** (same versions as image editor bridge):
  - `Microsoft.WindowsAppSDK` Version `2.0.0-experimental4`
  - `Microsoft.Windows.AI.MachineLearning` Version `2.0.300`
  - `Microsoft.Windows.SDK.BuildTools` Version `10.0.26100.4654`
  - Also add `<WindowsAppSDKSelfContained>true</WindowsAppSDKSelfContained>` to the csproj.
- **Ready-state pattern** (identical to `ImageScaler`): `LanguageModel.GetReadyState()` returns `AIFeatureReadyState`; call `await LanguageModel.EnsureReadyAsync()` if not ready; then `await LanguageModel.CreateAsync()`.
- ~~**Generation:** `var response = await model.GenerateResponseAsync($"{systemPrompt}\n\n{userText}");` — the result type is `LanguageModelResponseResult` and the output text is `response.Text`.~~
- **Generation (current):** `using var ctx = model.CreateContext(systemPrompt); var response = await model.GenerateResponseAsync(ctx, userText, new LanguageModelOptions());` — output text remains `response.Text`. See Microsoft Learn: `GenerateResponseAsync(LanguageModelContext, String, LanguageModelOptions)`.
- **Capability:** `systemAIModels` in `Package.appxmanifest` is sufficient for Developer Mode. No LAF token needed for local development.
- Bridge is a **new** C# project at `npu-text-tools-ext/bridge/` — do not reuse npu-image-editor's bridge.

### Global hotkey presets — rewrite selection in-place

**Update (2026-05):** The **shipped** design is **`docs/FORWARD_ROADMAP.md` §3** (Raycast command hotkeys; **`getSelectedText()`** for capture after **`closeMainWindow`**; short-lived **`TextSelectionHelper.exe`** for synthetic copy/paste fallback; no resident `RegisterHotKey` daemon). Treat **`FEATURE_PLAN.md` §12** below as **archive** for an optional future **standalone preset + tray helper** (`presets.json`, etc.) — **not** what users install for v1.

**API direction (still applies to bridge work):** Prefer **`TextRewriter`** / official **Rewrite** skill from **`docs/REWRITE_INFO.md`** for builtin rewrite-style modes where the SDK allows; keep **`LanguageModel` + `CreateContext`** for **custom** instructions and any mode the skill API cannot express. See §12 table “Official API alignment.”

<!--
### DEBUG / EXTENSION NOTES — Section 3 (Phi-Silica Text Tools), 2026-05-07

**What changed after Claude’s handoff**
- Bridge API: switched from “one big string” / mistaken `CreateContext(system, user)` to the documented split: system via `CreateContext(systemPrompt)`, user via `GenerateResponseAsync(context, userText, new LanguageModelOptions())`.
- Bridge JSON: added case-insensitive deserialization for custom-mode payload.

**Symptoms you might see**
- **CS1503 on `CreateContext` / `GenerateResponseAsync`:** Wrong overload assumptions — re-read `LanguageModel` API on Microsoft Learn (WAS 2.0 / experimental). There is no `CreateContext(string user)`; second parameter is `ContentFilterOptions`.
- **Custom rewrite ignores instruction or behaves like generic completion:** Often caused by stuffing everything into one prompt string, or by JSON not binding (`instruction`/`text` null). Fix: context-based generation + `PropertyNameCaseInsensitive` (or `[JsonPropertyName]`).
- **`spawn UNKNOWN`:** Same as other bridges — self-contained publish, correct `cwd`, `app.manifest` `publisher` + `packageName` matching **this** extension’s `Package.appxmanifest` Identity (text tools uses `NpuTextToolsBridge.Identity`, not the image editor’s name).
- **Wrong exe / wrong manifest:** Two extensions both output `NpuBridge.exe`; Raycast loads `environment.assetsPath/bin` per extension. Never copy one extension’s exe into another’s folder without matching manifests.

**Reference implementation files**
- `npu-text-tools-ext/bridge/Program.cs` — argv `phi-rewrite`, readiness, context + generate, JSON out.
- `npu-text-tools-ext/src/shared/TextRewriteCommand.tsx` — temp file, `execFileAsync` with `cwd: path.dirname(BRIDGE_PATH)`.
- `register-bridge.ps1` — registers each known `assets/bin` with its manifest.

**Adding a similar feature (e.g. new preset mode)**
1. Add `mode` to Raycast command + `TextRewriteCommand` union if using shared UI, or new argv branch in bridge.
2. Extend `GetSystemPrompt` (or equivalent) in `Program.cs`; keep using `CreateContext` + `GenerateResponseAsync` pattern.
3. Re-publish bridge; re-run `register-bridge.ps1` only if capability / identity / manifest version changed.
-->

---

## ~~4. Smart Note Taker~~
> **Completed by Gemini (2026-05-07).**
> - Implemented `npu-notes-ext/bridge/Program.cs` with `phi-note` command using Phi-Silica.
> - Created `src/add-note.tsx` for intelligent note filing and `src/browse-notes.tsx` for browsing saved notes.
> - Implemented `src/utils/note-utils.ts` for storage management and markdown frontmatter parsing.
> - **Lesson Learned — JSON Parsing:** Phi-Silica occasionally wraps JSON output in markdown code blocks. Added robust parsing in the C# bridge to extract the raw JSON object from the response string.
> - **Lesson Learned — Categories:** Implemented automatic subfolder creation based on the category chosen by Phi to keep the notes folder organized.

~~**Extension:** `npu-notes-ext` (new, scaffolded at `npu-notes-ext/`)~~
~~**New files:** `src/add-note.tsx`, `src/browse-notes.tsx`, `src/search-notes.tsx` (stub only), `bridge/Program.cs`~~

### ~~Configuration (Raycast extension preferences)~~
- **Notes Folder** (`notesFolder`): directory picker, default: `%USERPROFILE%\Documents\RaycastNotes`
- Resolved in TS with: `const folder = prefs.notesFolder || path.join(os.homedir(), "Documents", "RaycastNotes")`

### Folder structure
```
RaycastNotes/
  work/
  school/
  personal/
  tasks/
  ideas/
  health/
  finance/
  people/
  projects/
  misc/
```
Phi picks one category from this fixed list. The folders are created as they are needed. This prevents an adult from having a folder called "school," when that is obviously unnecessary. TS creates the subfolder if it doesn't exist before writing. 

### File format
Filename: `YYYY-MM-DD_short-title.md` (short title is 2–5 words, Phi-generated, hyphenated)

```markdown
---
date: 2026-05-07 03:14
category: school
title: Professor Office Hours
raw: "my professor has office hours friday 5-6pm"
---

Professor has office hours on **Friday, 5:00–6:00 PM**.
```

Frontmatter always preserves the original raw text so nothing is lost.

### Add Note command — user flow
1. Large text area: paste any sloppy text
2. Submit → Phi does two things in one call:
   - **Format**: clean markdown, fix grammar, add structure if appropriate
   - **Classify**: pick category + generate short title
3. Bridge returns `{ status, category, title, formattedMarkdown }`
4. TS writes the file to `<notesFolder>/<category>/<YYYY-MM-DD_title>.md`
5. Toast: "Saved to tasks/2026-05-07_professor-office-hours.md"

### Bridge command
```
NpuBridge.exe phi-note <tempInputFile>
```
Temp file contains raw note text as plain string.
Returns: `{ "status": "success", "category": "tasks", "title": "Professor Office Hours", "formattedMarkdown": "..." }`

### Phi prompt for phi-note
```
You are a note-taking assistant. Given the raw note below, do two things:
1. Rewrite it as clean, readable markdown (fix grammar, add structure if helpful, keep it concise).
2. Classify it into exactly one of these categories: work, school, personal, tasks, ideas, health, finance, people, projects, misc.
3. Generate a short title: 3-5 words, lowercase, hyphen-separated (e.g. "professor-office-hours").

Respond with only valid JSON in this exact format:
{ "category": "...", "title": "...", "content": "..." }

Raw note:
{rawNote}
```

### Browse Notes command
- List view grouped by category (use `List.Section` per category)
- Shows: title, date, first line of content as subtitle
- Filter/search bar narrows by title + content keyword (client-side, no Phi)
- Primary action: open file in default editor (`open` shell command)
- Secondary action: copy content to clipboard

### Search Notes command (stretch goal — stub only for now)

```
COMMAND: search-notes

INPUT: user types a query string

PROCESS:
  load all .md files recursively from notesFolder
  parse frontmatter from each (date, category, title, raw, body)

  // Phase 1 — fast keyword filter
  filter files where (title OR raw OR body) contains query words
  rank by match count

  // Phase 2 — Phi semantic pass (only if Phase 1 returns < 3 results)
  for each non-matching file:
    ask Phi: "Does this note relate to: <query>? Answer yes or no."
  add "yes" results to list

DISPLAY:
  List view, grouped by category
  each item: title, date, category, first line of body
  primary action: open in editor
  secondary action: copy to clipboard

STRETCH (later):
  natural language answer synthesis
  ("your professor has office hours on Friday 5-6pm" extracted from matching note)
  -- requires embeddings or a more capable model, design separately
```

---

## 5. Smart Awake (NPU-Powered)
> **Status: Redesigning (2026-05-07).**
>
> **Goal:** A reliable “natural language Awake” command **without sacrificing** the existing fast/manual keep-awake controls.
>
> **Key principle (audit-driven):** Phi-Silica is used for **intent extraction**, not math. All time math, date resolution, and schedule evaluation are deterministic in code.

### Product surface (best of both worlds)

Keep the existing explicit commands (fast, deterministic):
- `awake` (toggle indefinite)
- `awake-for` (minutes)
- `awake-until` (HH:mm today)
- `screen-off-mode` (system awake, display allowed to sleep)
- `let-sleep`
- `awake-status`

Add one natural-language command (the “macOS ai.yaml” pattern, Windows edition):
- `awake-natural` (single entrypoint; routes to the same underlying “tools” as above)

### Reliability model: tool-first routing + deterministic execution

Natural language should behave like a constrained tool-calling agent:
- **Always** check current state first (active session? any schedules running?) before acting.
- Use Phi only to classify what the user wants into a small set of supported actions.
- Execute via stable, testable “tools” (keeper modes + schedule store), not via free-form LLM output.

This mirrors the macOS `ai.yaml` approach:
- a policy (“tool selection guide”) for routing
- plus eval-style test cases that assert correct routing/arguments
- plus a stable executor (`AwakeKeeper.exe`) that actually prevents sleep

### Architecture (dual-binary + persistent schedules)

**1) Win32 Keeper (`keeper/`) — stable executor + daemon**
- `AwakeKeeper.exe` remains the long-running low-overhead process that calls `SetThreadExecutionState`.
- Add a **daemon/scheduler mode** that:
  - reads persistent schedules from a `schedules.json` file at startup
  - monitors it for changes (e.g. `FileSystemWatcher`) and reloads without restart
  - enforces “active windows” by evaluating schedules deterministically against system time

**2) NPU Bridge (`bridge/`) — Phi intent extractor**
- New sparse-package bridge (`npu-awake-ext/bridge/`) using `Microsoft.Windows.AI.Text.LanguageModel`.
- It returns **structured intent only** (no Unix timestamps, no derived durations).
- It must implement **robust JSON extraction** (Phi may wrap JSON in prose or code fences).

**3) TS Orchestrator (Raycast commands) — policy + storage**
- Implements the **routing policy** for `awake-natural`:
  - first: check current status (session + schedules)
  - then: call the intent extractor (bridge) only if needed
  - then: execute one of the stable actions (start keeper, stop keeper, write schedule file, etc.)
- Owns persistent schedule storage:
  - schedules live in a real file (e.g. `schedules.json`) under the extension’s support/data folder
  - `LocalStorage` remains for lightweight “session metadata” but is not the source of truth for recurrence

### Intent contract (no math in the model)

Phi output must be constrained to a small schema that preserves user intent but defers arithmetic:
- **Action**: `status | start | stop | schedule | unschedule | help`
- **Start modes**: `indefinite | timed | until | screen-off | while-app`
- **Raw fields (examples)**:
  - timed: `{ unit: "minutes"|"hours", value: 90 }`
  - until: `{ time: "17:30", dateHint?: "today"|"tomorrow", tz?: "local" }`
  - schedule: `{ days: ["mon","tue",...], start: "09:00", end: "17:00" }`
  - while-app: `{ application: "Zoom" }` (stretch; see below)

**Deterministic rules in code:**
- parse/validate `HH:mm` and compute target epoch deterministically
- normalize units → seconds
- resolve ambiguous “tomorrow” vs “today” explicitly (policy choice; document it)
- schedule evaluation uses local time; persist canonical form in `schedules.json`

### Persistence & correctness requirements

- **Schedule persistence**: schedules must survive Raycast restarts and machine reboots.
- **Single source of truth**: the `schedules.json` file is authoritative for recurrent schedules.
- **Atomic writes**: TS writes schedules with a safe write strategy (temp file + rename) to avoid partial reads.
- **Daemon reload**: keeper watches the schedules file and reloads quickly; no polling-only design.

### UX truth-in-advertising (lid-close reality)

`SetThreadExecutionState` prevents idle sleep; it cannot override:
- closing a laptop lid (unless the user’s power plan says “Do nothing”)
- pressing the power button

The UI for `awake-natural` and/or `awake` should include a short disclaimer when starting a session or schedule.

### Testing strategy (macOS-style evals, Windows implementation)

Create a small set of deterministic “routing tests” for `awake-natural`:
- given input + mocked status → expected extracted intent → expected executed action + arguments
- include edge cases: “90 minutes”, “until 5”, “weekdays 9-5”, “stop”, “status”

These can live as a doc + fixtures first, then become executable tests later.

### Scope notes (what’s in/out for v1)

**In v1:**
- natural language → start/stop/status + recurrent “days + window” schedules
- persistent schedules + keeper daemon reload
- robust JSON extraction and strict schema validation

**Stretch (later):**
- “while app is running” (requires process detection; Windows analogue to `caffeinate -w`)
- multiple schedules with named IDs + enable/disable
- richer language like “next 3 hours” or “until my next meeting” (needs calendar integration; separate design)

---

## 6. Sticker Maker
> **Completed by GPT-5.2 (2026-05-08).**
> - Implemented `make-sticker` end-to-end: bridge extracts foreground + bounding box crop (with center-crop fallback) and writes `_sticker_raw.png`; TS letterboxes to 480×480 and encodes `_sticker.webp`.
> - Added an input-size guard (downscale to ≤2048px long edge before segmentation) and deletes the intermediate PNG after encoding the WebP.

**Extension:** `npu-image-editor-ext`
**New files:** `src/make-sticker.tsx`, new `case "make-sticker"` in `bridge/Program.cs`

### What it does
Converts an image into a 480×480 transparent WebP sticker. NPU removes the background, smart crop centers on the subject.

### 6a. Basic Sticker (auto crop)

**User flow:**
1. Select one image in Explorer
2. Run "Make Sticker" command (or action inside Modify Image)
3. Bridge: remove background → find subject bounding box → crop → output `_sticker_raw.png` (transparent PNG)
4. TS: letterbox to 480×480 → encode WebP → output `<name>_sticker.webp` next to source
5. Toast warning if no clear subject: "No clear subject detected — center crop used. Use 'Make Sticker (Manual Focus)' for better results."

**Crop algorithm:**
1. Run `ImageObjectExtractor` → get alpha mask (reuse existing bridge logic — see §6c lesson #1)
2. Scan mask pixels to find bounding box of all non-zero alpha pixels
3. Add 10% padding on all sides (clamped to image bounds)
4. If bounding box covers >80% of image → fallback: use center crop, show warning toast
5. Crop source to padded bounding box
6. Resize to 480×480 in TS (letterbox with transparent fill if not square)
7. Encode as WebP in TS using the suite’s `@jsquash/webp`-based encoder (not Jimp)

**Bridge command:**
```
NpuBridge.exe make-sticker <inputPath>
```
Returns: `{ "status": "success", "outputPath": "<path>_sticker_raw.png", "subjectDetected": true|false }`
TS side re-encodes the PNG to WebP via Jimp and writes final `_sticker.webp`.

### 6b. Sticker with Manual Focus (v2 — design tentative)

**User flow:**
- Action: "Make Sticker (Manual Focus)..."
- Form: text field "Describe the subject" (e.g. "the cat", "the person on the right")
- Phi-Silica or `ImageDescriptionGenerator` identifies the matching region
- Same crop → resize → WebP pipeline

**Status:** API approach TBD. Build 6a first, then investigate whether region-of-interest guidance is possible with current SDK. Document findings in a new section of `NPU_INFO.md`.

**Technical Insights (Applied from v1 features):**
- **Pixel Access:** Use `IMemoryBufferByteAccess` pattern from `Program.cs` for fast bounding-box scanning in the bridge. Avoid sending large masks back to TS.
- **Format:** Ensure input is converted to `Bgra8` before calling `ImageObjectExtractor`.
- **Limits:** Check if dimensions exceed 4000px; downscale if necessary for NPU stability.

### 6c. Pre-implementation lessons (already debugged in shipped features — apply *before* writing `make-sticker`)

> **Scope of this subsection:** When the Sticker Maker plan above was written, several issues hadn’t been encountered yet. They were since debugged while shipping Remove Background, Super Resolution, OCR, Smart Note Taker, and Smart Awake. The originals are in those features’ commit history / inline comments / NOTES.md; this is a single checklist so the next implementer doesn’t re-discover them.

1. **Class name correction — `ImageObjectExtractor`, not `ImageForegroundExtractor`.**
   - The shipped `RemoveBackground()` in `npu-image-editor-ext/bridge/Program.cs` calls `Microsoft.Windows.AI.Imaging.ImageObjectExtractor`. The plan above (and `docs/RUNBOOK.md`, `npu-image-editor-ext/NOTES.md`, `NPU_INFO.md`) still use the older name. The sticker bridge case **must** use `ImageObjectExtractor` + `GetSoftwareBitmapObjectMask(ImageObjectExtractorHint)`. Fix the stale references in the docs in the same PR.
2. **Reuse `RemoveBackground()` pixel pipeline as the source — don’t reimplement.**
   - The existing implementation already produces a Bgra8 `SoftwareBitmap` whose alpha channel **is** the mask (see `ApplyMaskAsAlpha`). Refactor it into `Task<SoftwareBitmap> ExtractForegroundAsync(SoftwareBitmap source)` and call it from both `remove-background` and `make-sticker`. DRY.
3. **`IMemoryBufferByteAccess` access pattern is mandatory.**
   - Direct C# casts to `IMemoryBufferByteAccess` fail under CsWinRT (`InvalidCastException` / `IInspectable`). The shipped pattern is `((IWinRTObject)bufRef).NativeObject.As(iid)` + manual vtable invocation of slot `[3]` for `GetBuffer`. Reuse `InvokeGetBuffer` rather than rewriting.
4. **Bounding-box scan happens on the Gray8 mask, not on the composited Bgra8.**
   - Saves one buffer lock and one alpha-extract pass. Walk `maskData[y*stride + x] >= ALPHA_THRESHOLD` (constant: `STICKER_MASK_ALPHA_THRESHOLD = 16`) — don’t hardcode `0` or `128`.
5. **WebP encoding does *not* go through Jimp in this project.**
   - The plan above says “Encode as WebP via Jimp.” Jimp 1.6.x’s WebP path uses `new URL("*.wasm", import.meta.url)`, which Raycast’s bundler breaks. The shipped path in `modify-image.tsx` uses `@jsquash/webp/encode` with a manually compiled `WebAssembly.Module` and `locateFile: filename => filename`. Extract the existing `ensureWebpEncodeInit()` helper into `src/utils/webp-encoder.ts` and call it from `make-sticker.tsx`. Treat the “use Jimp” bullet in §6a as superseded.
6. **`assets/webp/*.wasm` is not in the repo (and not produced by `dotnet publish`).**
   - The current `modify-image.tsx` would throw `WebP encoder wasm missing: …\assets\webp\webp_enc.wasm` on a clean clone. Sticker Maker must not block on this. Add a tiny build step (e.g., `npm run prebuild` that copies `node_modules/@jsquash/webp/codec/enc/webp_enc{,_simd}.wasm` → `assets/webp/`) and run it from `package.json`’s `dev` and `build` scripts. File a follow-up to fix `modify-image.tsx`’s clipboard→WebP path the same way.
7. **Sparse-package registration is now self-managed per command.**
   - Every NPU bridge call must go through `ensureBridgeRegisteredOnce({ identityName, binDir, manifestSourcePath })` (see `npu-image-editor-ext/src/utils/ensure-bridge-registered.ts`, mirrored in notes/awake). The original §6 plan predates this helper. `make-sticker.tsx` must call it before `execFileAsync`, with `BRIDGE_IDENTITY = "NpuBridge.Identity"` (image editor identity, **not** a new one).
8. **Bridge spawn invariants (already canonized in `EXTENSION_REGISTRY.md` / `docs/RUNBOOK.md`).**
   - `cwd: path.dirname(BRIDGE_PATH)`, `windowsHide: true`, `--self-contained true`. Every NPU command in the suite uses the same `runNpuCommand`-style helper. Sticker Maker should call **the same** helper (currently inline in `modify-image.tsx`); extract it to `src/utils/run-npu-command.ts` and use it from `make-sticker.tsx`, `super-resolution.tsx`, `remove-background.tsx`, and `extract-text.tsx`. DRY.
9. **First-run model download is 30–60s — message must match the suite template.**
   - Use the standardized animated toast: `title: "Running NPU Make Sticker..."`, `message: "First run may take a moment to prepare the NPU model."` (matches `super-resolution.tsx` and the Phi-Silica bridges). See **`docs/SUITE_STYLE_GUIDE.md`** for the canonical strings.
10. **Output suffix must avoid the existing namespace.**
    - Already taken: `_no_bg.png` (Remove Background), `_2x.<ext>` / `_4x.<ext>` (Super Resolution), `_converted.<ext>` (Modify Image convert), `_optimized.<ext>`, `_flipped.<ext>`, `_rotated.<ext>`, `_padded.<ext>`, `_resized.<ext>`, `_scaled.<ext>`, `_no_exif.<ext>`. The plan’s `_sticker_raw.png` (intermediate) and `_sticker.webp` (final) are clear. Delete the intermediate in a `finally` block so failed runs don’t leave `_sticker_raw.png` on disk.
11. **Big images blow up NPU memory before the documented 4000 px ceiling.**
    - In practice ≥4000 × 4000 throws on Snapdragon X (matches the OCR `SoftwareBitmap` ceiling cited inline in `Program.cs`). Sticker Maker should pre-downscale to ≤2048 px on the long edge before calling `ImageObjectExtractor`. The user-visible output is 480×480 anyway; resampling once on input is cheaper and more reliable than rescuing failed inferences.
12. **Centroid hint: keep the same `(width/2, height/2)` foreground point as Remove Background.**
    - Don’t pass `null` for points — empirically the model produces tighter masks with a single centered foreground hint. This is what `RemoveBackground()` already does.
13. **JSON contract template (matches the rest of the suite).**
    - Bridge always returns one stdout line: `{ status: "success", outputPath, subjectDetected, subjectBoxRatio, message }` on success, `{ status: "error", message }` on failure. Stderr is human-readable diagnostics only (the TS layer logs it, never parses it). Match `npu-image-editor-ext/bridge/Program.cs` style exactly.

> **Net effect on the §6 plan:** §6a is still correct in shape; the *steps* change to (a) refactor shared extractor + WebP encoder helpers first, (b) fix the `assets/webp/*.wasm` build step, (c) then add the `make-sticker` bridge case + `make-sticker.tsx`. §6b (Manual Focus) is unchanged.

---

## 9. NPU Dev Toolbox — Git Commit + Workspace Actions (auto-detect repo)

**Extension:** `npu-dev-toolbox-ext` (new — to be scaffolded)
**New files (v1, expanded 2026-05-08; revised 2026-05-08):** `package.json`, `tsconfig.json`, `raycast-env.d.ts`, `.eslintrc`, `.prettierrc`, `assets/extension-icon.png`, `bridge/NpuBridge.csproj`, `bridge/Program.cs`, `bridge/Package.appxmanifest`, `bridge/app.manifest`, `src/commit-message.tsx`, `src/open-workspace.tsx`, `src/workspace-history.tsx`, `src/utils/foreground-context.ts`, `src/utils/git.ts`, `src/utils/run-bridge.ts`, `src/utils/launchers.ts`, `src/utils/explorer.ts`, `src/utils/last-explorer-folder.ts`, `src/utils/recent-workspaces.ts`, `src/utils/ensure-bridge-registered.ts` (copy of the canonical helper).

### v1 surface (expanded 2026-05-08; revised 2026-05-08)

The toolbox ships **three** Raycast commands and one shared sparse-package bridge:

1. **Open Workspace** (`open-workspace`, `mode: "view"`) — work from the **current Explorer folder**, then open a folder in one or more tools. Sections:
   - **Current Explorer Folder** — “last interacted” Explorer folder:
     - Uses a best-effort COM enumeration of open Explorer windows (`Shell.Application`) and takes the last enumerated window’s `LocationURL` as the current folder.
     - Persists to `LocalStorage` under `last-explorer-folder` so the command still works even when no Explorer window is currently open.
   - **Workspaces in Current Folder** — one-level list of subfolders of the current Explorer folder (treat each subfolder as a workspace).
   - **Browse** — a directory picker (`Form.FilePicker canChooseDirectories`) to set the current folder manually (also updates `last-explorer-folder`).
   - **Actions (every item)**:
     - **Open (Default)** (preference-driven; see below)
     - **Open in IDE**, **Open in Terminal**, **Open in Explorer**, **Open All**
     - **Browse Subfolders…** (drill-down)
     - **Copy Path**
     - Any successful open action pushes the target folder into workspace history (move-to-front, max 20).
2. **Workspace History** (`workspace-history`, `mode: "view"`) — memory of previously opened folders.
   - Backed by `LocalStorage` key `recent-workspaces` (up to 20, move-to-front).
   - Each item exposes the same open actions as Open Workspace, plus:
     - **Remove from History**
     - **Clear History** (confirm)
3. **Commit Message** (`commit-message`, `mode: "view"`) — original Plan 9 flow (see "User flow" below). Action panel order: **Copy to Clipboard** → **Copy & Run `git commit`** → **Regenerate** → **Open Repo in Explorer** → **Open Repo in Terminal** → **Open Repo in IDE**. The last three reuse `launchers.ts`.

### Preferences (Raycast UI, defined in `package.json` `preferences`)

- `defaultOpenTarget` (dropdown, default `ide`): `Open in IDE`, `Open in Terminal`, `Open in Explorer`, `Open All`. Used by **Open (Default)** action in both `open-workspace` and `workspace-history`.
- `terminalChoice` (dropdown, default `wt`): `Windows Terminal (wt)`, `PowerShell 7 (pwsh)`, `Windows PowerShell (powershell)`, `Command Prompt (cmd)`, `Custom Path (custom)`.
- `terminalNewTab` (checkbox, default off) — only honored when `terminalChoice = wt`. On = `wt -w 0 -d <path>` (new tab in existing window); off = new window.
- `terminalCustomPath` (textfield) — full path to a `.exe` or `.lnk`. Used only when `terminalChoice = custom`.
- `ideChoice` (dropdown, default `cursor`): `Cursor (cursor)`, `VS Code (code)`, `Windsurf (windsurf)`, `IntelliJ IDEA (idea)`, `PyCharm (pycharm)`, `WebStorm (webstorm)`, `Rider (rider)`, `Sublime Text (subl)`, `Notepad++ (notepad++)`, `Custom Path (custom)`.
- `ideCustomPath` (textfield) — full path to a `.exe` or `.lnk`. Used only when `ideChoice = custom`.
- `commitStyle` (dropdown, default `conventional`): `Conventional Commits` / `Plain`.

### Launchers contract (`src/utils/launchers.ts`)

Three pure functions, each returns `{ ok: true } | { ok: false, error }`. They never throw; the UI layer translates errors into `Toast.Style.Failure` per **`docs/SUITE_STYLE_GUIDE.md`**.

- `openInExplorer(folderPath)` — `spawn("explorer.exe", [folderPath])`, detached + unref'd.
- `openInTerminal(folderPath, prefs)`:
  - `wt` → `wt.exe ["-d", folderPath]` (or `["-w", "0", "-d", folderPath]` if `terminalNewTab`).
  - `pwsh` / `powershell` → spawn the exe with `["-NoExit", "-Command", "Set-Location -LiteralPath '<path>'"]`, detached, visible window.
  - `cmd` → `cmd.exe ["/K", "cd", "/d", folderPath]`, detached, visible window.
  - `custom` → `.lnk`: `powershell.exe -NoProfile -Command "Invoke-Item -Path '<path>'"` (best-effort; shortcuts can't always accept args). `.exe`: `spawn(customExe, [folderPath])` with `cwd: folderPath`.
- `openInIde(folderPath, prefs)` — for known keys, prefer the documented launcher CLI (`code`, `cursor`, `windsurf`, `idea`, `pycharm`, `webstorm`, `rider`, `subl`, `notepad++`) and call `<launcher> <folderPath>`. Resolution order: PATH first, then well-known install locations (`%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd`, `%LOCALAPPDATA%\Programs\cursor\Cursor.exe`, `%LOCALAPPDATA%\Programs\Windsurf\Windsurf.exe`, JetBrains Toolbox `%LOCALAPPDATA%\Programs\<IDE>\bin\<launcher>.bat`, `%PROGRAMFILES%\<IDE>\bin\<launcher>.bat`). Custom: same `.lnk` vs `.exe` handling as terminal.

All three guard against missing/non-directory paths and return a structured error.

### What it does

Generates a high-quality commit message for the repo the user is *currently working in*, fully on-device. The user runs one Raycast command; the extension figures out which folder they mean (Windows Terminal’s active shell, VS Code’s window, or the foreground Explorer location), runs `git diff`, and feeds it to Phi-Silica.

### User flow (v1: `commit-message`)

1. User runs **NPU Dev Toolbox: Commit Message** (no args required).
2. Animated toast: `Detecting active workspace...`
3. Resolution order (first hit wins; **always** wrapped in try/catch so a failure in one method falls through):
   1. **Optional `path` argument** (Raycast LaunchProps argument). If provided and is a git repo, use it.
   2. **Foreground process detection (TS + PowerShell P/Invoke).** Get `GetForegroundWindow()` → `GetWindowThreadProcessId()` → process name.
      - If `WindowsTerminal.exe` / `wt.exe` → walk children via `Get-CimInstance Win32_Process -Filter "ParentProcessId=<pid>"` to a shell (`pwsh.exe`, `powershell.exe`, `cmd.exe`, `wsl.exe`, `bash.exe`). Read the shell’s **CWD** via the bridge (`cwd-of-pid <pid>` — see below).
      - If `Code.exe` / `Cursor.exe` / `WindsurfNext.exe` (any Electron VS Code fork) → parse `MainWindowTitle` (format: `<file> - <folder> - <appname>`) and verify the folder against `%APPDATA%\Code\storage.json` (or `%APPDATA%\Cursor\storage.json`) `windowsState.lastActiveWindow.folder` / `openedPathsList.workspaces3`.
      - If `explorer.exe` → reuse the existing `Shell.Application` `Windows()` enumerator (already in `npu-image-editor-ext/src/utils/powershell-utils.ts`) but read `LocationURL` instead of `SelectedItems()`.
   3. **Last-resort fallback:** Raycast directory picker (`Form.FilePicker` with `canChooseDirectories: true`).
4. Validate the resolved path is a git working tree (`git rev-parse --show-toplevel`). If not, surface the standard error toast (see **`docs/SUITE_STYLE_GUIDE.md`**).
5. Run `git status --porcelain=v1`, `git diff --staged`, `git diff`, `git log -n 5 --pretty=%s`, `git rev-parse --abbrev-ref HEAD` in the repo root.
   - If `--staged` has content, prefer it. Else use unstaged. Else: success toast saying *“No changes to commit.”* (treated as success, not error.)
6. Truncate diff if `>` `MAX_DIFF_BYTES` (constant: `100_000`). Truncation strategy: keep every file’s `diff --git` header + its first `MAX_HUNKS_PER_FILE` (constant: `4`) hunks; append `... (truncated N hunks)`.
7. Call bridge `phi-commit` with a JSON payload (see contract below).
8. Render result in a `Detail` view with the message in markdown, plus an action panel:
   - **Copy to Clipboard** (primary, `cmd+enter`)
   - **Copy & Run `git commit`** (secondary; runs `git commit -m "<subject>" -m "<body>"` in the resolved CWD)
   - **Regenerate** (re-calls Phi with a slightly different temperature / instruction)
   - **Open Repo in Explorer**

### Bridge IPC contract

Sparse identity: `NpuDevToolboxBridge.Identity`. Binary: `npu-dev-toolbox-ext/assets/bin/NpuBridge.exe`.

```
NpuBridge.exe cwd-of-pid <pid>
  → { "status": "success", "cwd": "C:\\repo\\..." }
  → { "status": "error", "message": "..." }

NpuBridge.exe phi-commit <tempInputFile>
  → { "status": "success", "subject": "...", "body": "..." }
  → { "status": "error", "message": "..." }
```

`<tempInputFile>` contains JSON:

```json
{
  "branch": "feat/sticker-maker",
  "recentCommits": ["fix: ocr bgra8 conversion", "feat: super-resolution scale dropdown"],
  "diffStaged": true,
  "diff": "<truncated unified diff>",
  "style": "conventional"
}
```

`style` ∈ `"conventional" | "plain"`. `"conventional"` instructs Phi to use Conventional Commits (`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:`).

### Phi system prompt (commit message)

```
You are a senior engineer writing a Git commit message for the change below. 
Output ONLY valid JSON in this EXACT shape: { "subject": "...", "body": "..." }.
Rules:
- subject: <= 72 chars, imperative mood, no trailing period.
- If style is "conventional", subject MUST start with one of:
    feat | fix | docs | refactor | test | chore | perf | build | ci | style
  optionally followed by "(scope)", then ": ".
- body: 1-3 short paragraphs OR a bullet list explaining WHY (not what — the diff already shows what).
  Use plain Markdown. Wrap at ~100 chars. Empty string is allowed.
- DO NOT invent files, APIs, or behavior not visible in the diff.
- DO NOT include code fences, prose around the JSON, or "Here is the commit message:".

Branch: {branch}
Recent commits (for tone reference): {recentCommits}
Diff (staged={diffStaged}):
{diff}
```

> **Reuse the existing JSON-extraction pattern.** Both `npu-notes-ext` and `npu-awake-ext` already have a “first `{` to last `}`” fallback because Phi sometimes wraps JSON in fences. Copy that helper (`ExtractJsonObject`) into the new bridge — do not rewrite it.

### `cwd-of-pid` implementation note (NtQueryInformationProcess + PEB read)

- C# `Process.StartInfo.WorkingDirectory` is empty for already-running processes. The reliable Windows-native approach is `NtQueryInformationProcess(handle, ProcessBasicInformation, ...)` → read PEB → `RTL_USER_PROCESS_PARAMETERS` → `CurrentDirectory.DosPath` via `ReadProcessMemory`.
- This requires `OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, ...)`, which works for same-user shells without elevation. If `OpenProcess` fails, return `{ status: "error", message: "Cannot read working directory of PID <n>" }` and let TS fall back to the next detection method.
- Wrap the entire P/Invoke in try/catch; never let it throw to the JSON layer. WoW64 PEBs need `NtWow64QueryInformationProcess64` on x64 Windows targeting a 32-bit process — for v1, return error rather than supporting that edge case.

### Foreground-context detection (TypeScript shape)

```
src/utils/foreground-context.ts
  export type DetectedContext = {
    cwd: string
    source: "argument" | "windows-terminal" | "vscode" | "cursor" | "explorer" | "picker"
    pid?: number
  }
  export async function detectActiveWorkspace(arg?: string): Promise<DetectedContext>
```

- **Single source of truth** for which detection methods exist and in what order.
- `detectActiveWorkspace` returns *the first hit* and short-circuits — never silently merges multiple sources.
- Each detection method is its own private function, each wrapped in try/catch returning `null` on failure. No `throw` in this module — only `return null` so the orchestrator can keep falling through.

### Stretch (after v1)

- `code-comment` — paste a function, get JSDoc / XML doc back.
- `regex-from-english` — “match a UK phone number” → pattern + a few example matches.
- `pii-redact` — clipboard scan + redaction (mentioned in the brainstorm, but lives more naturally here than in text-tools).

These each become a new bridge mode (`phi-comment`, `phi-regex`, `phi-redact`) and a new `.tsx` command, all reusing the same `run-bridge.ts` and `ensure-bridge-registered.ts` helpers.

### What this extension intentionally does NOT do

- **Does not run `git commit` automatically without user confirmation.** Even the “Copy & Run” action shows the proposed message and the resolved CWD before executing.
- **Does not push.** Ever.
- **Does not call out to the network.** All inference is on-device; if Phi-Silica is unavailable, surface the standard error toast and stop.

---

## 10. Semantic Note Linking

**Extension:** `npu-notes-ext` (existing — extends the implemented `add-note` flow and re-introduces a real `search-notes` command)
**New files:** `src/find-related.tsx`, `src/search-notes.tsx` (re-added — see § Cleanup follow-ups for why it’s currently absent), `src/utils/note-linker.ts`. Modifies: `bridge/Program.cs` (new `phi-related` argv + `phi-search-relevance`), `src/add-note.tsx` (post-save linking step), `src/utils/note-utils.ts` (frontmatter `related` field), `package.json` (re-add the `search-notes` command entry).

### What it does

When a note is saved, the extension uses Phi-Silica to find which existing notes are *semantically related* (not just keyword matches) and writes those links into both notes’ frontmatter. A new “Find Related Notes” command lets users surface related notes for any existing note.

> **Why generation, not embeddings, for v1.** `Microsoft.Windows.AI.Text.LanguageModel` is the only on-device text API guaranteed available across the Copilot+ PC SKUs we target today. There is no public, stable text-embedding API in `Microsoft.Windows.AI` at the time of writing. v1 uses Phi-Silica as a relatedness classifier; v2 can swap in embeddings without changing the storage schema (see “Future: embeddings” below).

### Storage schema change

Add an optional `related:` field to existing note frontmatter:

```markdown
---
date: 2026-05-07 03:14
category: school
title: Professor Office Hours
raw: "my professor has office hours friday 5-6pm"
related:
  - school/2026-05-06_syllabus-overview
  - tasks/2026-05-04_email-professor
---

Professor has office hours on **Friday, 5:00–6:00 PM**.
```

- `related` values are repo-relative paths (without `.md`), so renames inside a category don’t break links until the category itself moves.
- Field is **optional**. Old notes without it are valid; the linker writes the field on first link.
- `note-utils.ts`’s `parseNote` is extended to read `related: []` (multi-line YAML list parser; keep it simple — no full YAML dep).

### Add Note: post-save linking step

After the existing Phi-Silica format/classify call returns and the file is written:

1. Animated toast updates: `Saved. Finding related notes...`
2. Build the candidate set:
   - Take the **20 most recent notes** across all categories (recency wins; same-category notes are ranked first within recency).
   - For each: take title, category, and the first 200 chars of body. Skip the just-saved note.
3. Call bridge `phi-related <tempInputFile>` with the new note + candidate list.
4. Bridge returns `{ status: "success", related: ["<repo-relative-path>", ...] }` (zero or more).
5. TS writes the `related:` field into the new note’s frontmatter, **and** into each linked note’s frontmatter (bidirectional). All writes are atomic (temp file + rename, same pattern as `keeper-utils.ts atomicWriteJson`).
6. Final toast: `Saved to <category>/<file> (linked to N note(s))` — or `Saved to <category>/<file>` if N=0. **No** extra toast on link failure; just log to stderr and keep the save successful (linking is best-effort, the note save is not).

### Bridge IPC contract (new `phi-related` argv)

```
NpuBridge.exe phi-related <tempInputFile>
  → { "status": "success", "related": ["<path>", ...] }
  → { "status": "error", "message": "..." }
```

`<tempInputFile>` contains JSON:

```json
{
  "newNote": {
    "path": "school/2026-05-07_professor-office-hours",
    "title": "professor-office-hours",
    "category": "school",
    "preview": "Professor has office hours on Friday..."
  },
  "candidates": [
    { "path": "school/2026-05-06_syllabus-overview", "title": "syllabus-overview", "category": "school", "preview": "..." },
    ...
  ],
  "maxLinks": 5
}
```

### Phi system prompt (relatedness)

```
You are a note-linking assistant. Given a new note and a list of candidate notes, 
identify which candidates are semantically related to the new note (same topic, 
project, person, course, or task — not just shared keywords).

Output ONLY valid JSON in this EXACT shape: { "related": ["<path>", ...] }.
Rules:
- Each entry MUST be exactly one of the "path" strings from the candidates list. 
  Do NOT invent paths.
- Return at most {maxLinks} paths.
- If nothing is meaningfully related, return { "related": [] }.
- DO NOT include explanations, prose, or code fences. JSON only.
```

> Reuse `ExtractJsonObject` from the awake/notes bridges (first `{` … last `}`) before deserializing — Phi sometimes still emits prose around JSON despite the instruction. **Validate** every returned path against the candidate set; drop unknown paths silently.

### New command: `find-related.tsx`

- Lists all saved notes (reusing `getAllNotes`) in a `List`.
- Selecting a note runs `phi-related` against the **other 20 most recent notes** and renders results in a **second `List`** with `Action.Open` on each related note *(spec originally mentioned a `Detail` view; shipped UI uses `List` — see § “Implementation audit & AppContentIndexer integration”)*.
- Same UX template as `browse-notes.tsx` — same `List.Item` shape, same accessory format, same actions ordering.

### Re-introduce `search-notes` (separate but adjacent)

`src/search-notes.tsx` was deleted on 2026-05-08 and the `search-notes` command was removed from `package.json` because it was shipping a `WIP` empty-view to users (see § Cleanup follow-ups). Re-add both as part of this work using the **two-phase** plan already in §4 (Search Notes stretch goal): keyword filter → if `<3` results, Phi-Silica yes/no pass per non-matching note. Bridge gets a new argv `phi-search-relevance <tempInputFile>` taking `{ query, candidate }` and returning `{ relevant: true|false }`. The Semantic Linking and Search Notes work share enough plumbing (same bridge, same temp-file pattern, same JSON-extract helper) that they should land in the same PR.

### Future: embeddings (out of scope for v1; design hook only)

> **Update (2026-05-08):** Windows App SDK **AppContentIndexer** (`Microsoft.Windows.AI.Search.Experimental.AppContentIndex`) provides **platform-managed semantic (and lexical) retrieval** over strings the app registers. That is **not** the same as exposing raw embedding vectors, but it **does** supersede “Phi yes/no per candidate” for *retrieval* at scale when the API works in our sparse bridge. Prefer indexer-based retrieval first; keep Phi for **generation** (formatting, RAG answers, optional final relatedness validation). See **§ Implementation audit & AppContentIndexer integration** below. The `phi-embed` / kNN path remains a fallback if indexer is unavailable or unsuitable.

If/when a stable **first-party embedding** API ships in `Microsoft.Windows.AI` (or via `Microsoft.Windows.AI.MachineLearning` ONNX-runtime path):

- Add a new bridge mode `phi-embed <text>` returning `{ "vector": [...] }`.
- Cache embeddings alongside the note as a sibling `<filename>.emb.json` (or in a single `embeddings.bin` blob).
- Replace the candidate-set + classifier step with a kNN over cached vectors.
- Frontmatter `related:` schema **does not change** — only the producer changes.

### Implementation audit & AppContentIndexer integration (2026-05-08)

This subsection records **what is actually implemented today**, whether it follows **suite conventions**, and a **thorough plan** to align with Microsoft’s official **App Content Search** / **RAG** pattern documented in-repo at `docs/RAG_INFO.md` and `docs/INDEX_INFO.md` (Windows App SDK / Windows AI).

#### A. Shipped behavior vs the §10 specification above

| Item | §10 spec | Current code (as of 2026-05-08) |
|------|-----------|----------------------------------|
| Bridge `phi-note` | Yes | **Implemented** — `bridge/Program.cs` |
| Bridge `phi-related` | Yes | **Implemented** — JSON in/out, `ExtractJsonObject`, validates paths only implicitly in TS (`find-related.tsx` filters to candidate set) |
| Bridge `phi-search-relevance` | Yes | **Implemented** |
| `find-related.tsx` | List notes; run Phi on **20 most recent** other notes; **Detail** view for results | **Partial** — List for picker and List for results (not Detail); candidates = `allNotes` sorted by `getAllNotes` (newest first), exclude selected, **`slice(0, 20)`** — matches “20 most recent” intent |
| `search-notes.tsx` | Keyword → if &lt;3 hits, Phi yes/no per non-match | **Implemented with differences** — keyword filter; auto semantic when `keywordHits.length < 3` after debounce; scans up to **`MAX_PHI_CHECKS` (30)** **first** non-keyword notes in vault order (newest-first), not “all non-matching” |
| Post-save bidirectional `related:` in frontmatter | Required | **Not implemented** — `add-note.tsx` stops after `saveNote`; `note-utils.ts` has **no** `related` field in `parseNote` / `saveNote` |
| `note-linker.ts` + atomic writes | Spec’d | **Missing** — no linker utility |
| `package.json` `search-notes` | Re-add | **Present** |

**Conclusion:** Semantic **search** and **Find Related** use **Phi-Silica as a binary relevance classifier** over small candidate sets. The **storage and automation** half of §10 (post-save linking + `related:` YAML) is **still outstanding**.

#### B. Suite convention compliance (`CONTRIBUTING.md`, `EXTENSION_REGISTRY.md`, bridge patterns)

**What already matches established suite practice**

- **Sparse package:** `NpuNotesBridge.Identity`, `Package.appxmanifest` beside published `NpuBridge.exe`, **`systemAIModels`** + `runFullTrust` — satisfies Microsoft’s stated prerequisite for **semantic** App Content Search (see `docs/RAG_INFO.md`).
- **Self-contained publish:** `NpuBridge.csproj` uses `WindowsAppSDKSelfContained`, `SelfContained`, Win10 target 26100 — same family as other bridges.
- **Raycast → bridge:** `ensureBridgeRegisteredOnce` before `execFile` in `add-note.tsx`, `find-related.tsx`, `search-notes.tsx` — correct.
- **IPC contract:** argv dispatcher, **one JSON object on stdout**, errors as `{ status: "error", message }`, diagnostics on stderr — matches other extensions.
- **Phi robustness:** `ExtractJsonObject` for fenced/prose JSON — matches `FEATURE_PLAN` guidance for Phi bridges.
- **Extension isolation:** No cross-extension npm deps — correct per `CONTRIBUTING.md`.

**Gaps (conventions we should tighten even without AppContentIndexer)**

1. **Duplicated bridge glue** — Each command repeats `BRIDGE_PATH`, `BRIDGE_BIN_DIR`, `manifestSourcePath`, `execFile` + stderr handling. **`npu-dev-toolbox-ext`** (per §9 plan) uses a single `run-bridge.ts`; notes should adopt the same **within-extension** helper (copy pattern; do not import across extensions) so argv + error parsing stay consistent.
2. **Result style (optional)** — Some newer suite text mentions `{ ok: true, value } | { ok: false, error }` at the UI boundary; notes currently **throw/toast from ad-hoc `Error`**. Low priority but improves consistency if we touch these files anyway.
3. **§10 doc drift** — `find-related` results are a **List**, not a **Detail** view; update the bullet above when editing §10 for accuracy, or change the UI to match the spec.
4. **`NOTES.md` accuracy** — Keep `npu-notes-ext/NOTES.md` aligned: post-save linking is **planned in this plan**, not shipped, until implemented.

#### C. How the current “semantic” features work (for future maintainers)

**`search-notes.tsx`**

1. Loads all notes once via `getAllNotes` (Markdown + frontmatter parsed in `note-utils.ts`).
2. **Keyword tier:** case-fold substring match over `title`, `category`, `raw`, `content`.
3. **Phi tier (labeled “Semantic” in UI):** Runs only when the query is non-empty, length ≥ 3, and **keyword hit count &lt; 3**. After `SEMANTIC_DEBOUNCE_MS`, for each of up to 30 notes **not** in the keyword set (in vault order), calls `phi-search-relevance` with `{ query, candidate: { path, title, category, preview } }` where `path` is **`noteIdFromPath`** (relative path without `.md`). Stops after 10 positives. Caches per `(query, noteId)`.

**`find-related.tsx`**

1. User selects a note; **Find Related** builds `newNote` + **`candidates`: other notes, max 20**, same preview shape.
2. `phi-related` returns `related: string[]`; TS **filters** to paths present in `candidates` (matches §10 “drop unknown paths”).
3. No persistence — does **not** write `related:` to disk.

**`add-note.tsx`**

1. Only `phi-note` → `saveNote`. No indexer, no linker, no second bridge call.

**Important limitation:** Both Phi tiers are **O(candidates × model calls)** and bounded by arbitrary caps (20 / 30). They are **not** full-vault semantic search and will miss relevant notes outside the scanned prefix.

#### D. Official Microsoft pattern (AppContentIndexer) vs our pattern

| Concern | Microsoft (`docs/RAG_INFO.md`, `docs/INDEX_INFO.md`) | NPU Notes today |
|--------|--------------------------------------------------------|-----------------|
| Retrieval | **`AppContentIndexer`**: `GetOrCreateIndex`, `AddOrUpdate` text, `CreateTextQuery`, `GetNextMatches` | Scan files in TS + **Phi yes/no** per candidate |
| Match payload | `ContentId` + `TextOffset` / `TextLength` — app **must** load original text | N/A (whole-note preview string to Phi) |
| Index freshness | **App** must update index when content changes; **no** file watcher | Only **would** change if we add indexer sync on save/delete |
| Capability gating | `GetIndexCapabilitiesOfCurrentSystem`, `WaitForIndexCapabilitiesAsync`, per-capability state | `LanguageModel.EnsureReadyAsync` only |
| Threading | Avoid blocking UI; indexer ops can be slow | Work runs in **child process** (good); Raycast UI still waits on serial Phi calls for search |
| RAG | Retrieve snippets → build prompt → **LLM** | We could: retrieve via indexer → **single** Phi `GenerateResponse` (official RAG shape) |
| Package | Packaged app + **`systemAIModels`** | Already satisfied for bridge identity |

**`ContentId` mapping (recommended):** Use the same string as today’s **`noteIdFromPath`** (relative to `notesFolder`, forward slashes, no `.md`). The bridge resolves disk path = `path.join(notesFolder, contentId + '.md')` for reads. This matches Microsoft’s “key is the contentId of the item” pattern.

#### E. Integration plan — phases (can land as separate PRs)

**Phase 0 — Feasibility spike (blocking)**

- In `npu-notes-ext/bridge`, prove **`AppContentIndexer.GetOrCreateIndex`** (fixed name, e.g. `npu-notes-v1`), `AddOrUpdate` one string, `CreateTextQuery`, read matches, slice text using offsets.
- Confirm behavior under **sparse registration** (same process as current `NpuBridge.exe`). If WinRT throws or index creation fails, document the exact error in `docs/RUNBOOK.md` and keep Phi fallback as primary.
- Add **`#pragma warning disable CS8305`** (or equivalent) for experimental namespace; align `Microsoft.WindowsAppSDK` package line with whatever version exposes `Microsoft.Windows.AI.Search.Experimental.AppContentIndex` (may require bump from current `2.0.0-experimental4` — verify against SDK release notes when implementing).

**Phase 1 — Bridge IPC: index lifecycle**

Add argv modes (names indicative; finalize when coding):

- `index-upsert` — JSON: `{ notesFolder, contentId, text }` or batch array; `AddOrUpdate` from string; return `{ status, indexed }`.
- `index-remove` — `{ contentId }` or list (if API supports remove; if not, document “rebuild only”).
- `index-query` — `{ query, maxResults }` → `{ status, matches: [{ contentId, textOffset, textLength, snippet? }] }` where `snippet` is resolved in C# by reading the file under `notesFolder` (official pattern).
- `index-status` or `index-capabilities` — surface `GetIndexCapabilitiesOfCurrentSystem` / instance capabilities after `WaitForIndexCapabilitiesAsync` for TS to show “semantic search unavailable” toasts.

**Convention:** Same stdout JSON line, temp file for large payloads, update **`EXTENSION_REGISTRY.md`** bridge column when argv list changes.

**Phase 2 — TypeScript: keep index coherent with disk**

On every **successful** write from the extension:

- **`add-note.tsx`** after save: call `index-upsert` with **body text** (decide whether to strip YAML frontmatter from indexed text — recommended: index **markdown body only** plus optional first heading as context, so frontmatter noise does not dominate).

On **delete** (if `browse-notes` or future commands delete):

- **`index-remove`** for that `contentId`, or schedule **full rebuild**.

On **external edits** (user edited file outside Raycast):

- **Out of scope v1** unless we add a **“Rebuild search index”** preference action that rescans `getAllNotes` and batch-upserts.

**Phase 3 — Replace Phi retrieval in `search-notes.tsx`**

Desired ladder:

1. **Keyword** (unchanged).
2. If semantic desired and **index capabilities OK**: **`index-query`** with user query; merge results with keyword hits; show **snippet** from indexer in subtitle/accessory where possible.
3. **Fallback:** If indexer fails or returns empty / capability not initialized: keep current **`phi-search-relevance`** path (possibly widen candidate list or show toast “Limited semantic search (Phi)”).

Update user-facing copy: distinguish **“Indexed”** vs **“Phi”** semantic hits if both can appear.

**Phase 4 — `find-related.tsx` and post-save linking**

- **Candidate generation:** Instead of blind “20 most recent”, use **`index-query`** with **selected note’s title + preview** (or full body if small) to get top-K `contentId`s, then optionally **still call `phi-related`** on that smaller, *relevant* candidate set for final JSON paths — reduces Phi cost and aligns with official “retrieve then reason” RAG pattern.
- **§10 completion:** Implement **`related:`** frontmatter, **`note-linker.ts`**, post-save step in **`add-note.tsx`**, atomic writes per original §10; after each new note, **`index-upsert`** + linker (order: save file → upsert index → run linker so Phi sees consistent disk).

**Phase 5 — Optional RAG command**

- New command: user question → `index-query` → assemble snippets → **one** `phi-note`-style or new `phi-rag` bridge mode that only runs `LanguageModel` with augmented system prompt (per `docs/RAG_INFO.md`). No network.

#### F. File-by-file change checklist (when implementing)

| File | Changes |
|------|---------|
| `bridge/NpuBridge.csproj` | Package refs / TFMs if required for Search experimental API |
| `bridge/Program.cs` | Dispatch `index-*`; capability checks; indexer lifetime (prefer **one long-lived open** per process invocation batch, not per note — MS warns open/close is expensive) |
| `bridge/Package.appxmanifest` | Only if new capabilities required beyond `systemAIModels` (unlikely) |
| `src/utils/run-bridge.ts` (new, copied pattern) | Centralize `execFile`, paths, parse stdout JSON |
| `src/search-notes.tsx` | Index-first semantic tier; fallback to Phi; show capability errors |
| `src/find-related.tsx` | Index-based candidate prefetch; optional Phi refine |
| `src/add-note.tsx` | Post-save `index-upsert`; post-save linker (`phi-related` + frontmatter updates) per §10 |
| `src/browse-notes.tsx` | On delete: `index-remove` or mark dirty |
| `src/utils/note-utils.ts` | Parse/write `related:` list; helper to strip frontmatter for indexing |
| `src/utils/note-linker.ts` (new) | Bidirectional `related:` updates, atomic rename pattern |
| `EXTENSION_REGISTRY.md` | Note new argv modes |
| `docs/RUNBOOK.md` | AppContentIndexer troubleshooting (policy, partial index, rebuild) |
| `npu-notes-ext/NOTES.md` | User-facing behavior + index rebuild instruction |
| `CHANGELOG.md` | On ship |

#### G. Risk register

- **Experimental API churn** — Namespace is `Experimental`; pin SDK, expect compile/runtime breaks across WAS updates.
- **Sparse bridge + indexer** — May be unsupported or flaky; **Phase 0** de-risks.
- **Async indexing** — Queries may hit **partial** index; show “indexing…” or debounce first query after bulk import.
- **Duplicate storage** — Indexed text duplicates note content in Windows-managed store; privacy note in `NOTES.md`.
- **Phi still required** for formatting in Add Note and optional RAG answer generation unless replaced.

---

## 11. Workspace Search (Smart Grep + Phi Assist)

**Extension:** `npu-dev-toolbox-ext` (preferred) *(could be its own extension later; start in dev toolbox to keep surface area small)*  
**New files (draft):** `src/workspace-search.tsx`, `src/utils/search/schema.ts`, `src/utils/search/rg.ts`, `src/utils/search/ranker.ts`, `bridge/Program.cs` (optional `phi-rerank` in v2)

### What we want

A **reliable** “search my current directory” command that works in two tiers:

1. **Smart Grep (no NPU):** deterministic, fast, transparent. Always works.
2. **Phi Assist (optional):** only used for **ranking / summarizing** already-retrieved matches (never for “deciding what to run”).

This avoids the failure mode where Phi “hallucinates” flags/paths and breaks the search.

---

### 11a. Smart Grep Search (no NPU) — schema + algorithm

#### Inputs (request schema)

**TS type (authoritative)**

```ts
export type WorkspaceSearchRequest = {
  root: string
  query: string
  mode: "literal" | "regex" | "auto"
  case: "smart" | "sensitive" | "insensitive"
  scope: {
    includeGlobs?: string[]        // e.g. ["**/*.ts", "**/*.md"]
    excludeGlobs?: string[]        // e.g. ["**/node_modules/**", "**/dist/**"]
    maxFileSizeBytes?: number      // default 2_000_000
  }
  output: {
    maxMatches: number             // default 200
    maxFiles: number               // default 50
    contextLines: number           // default 2
  }
}
```

#### Outputs (response schema)

```ts
export type WorkspaceSearchHit = {
  file: string                     // absolute path
  line: number                     // 1-based
  column?: number                  // 1-based when available
  preview: string                  // single line, trimmed
}

export type WorkspaceSearchResponse = {
  status: "success" | "error"
  message?: string
  used: {
    engine: "ripgrep"
    args: string[]
    mode: WorkspaceSearchRequest["mode"]
  }
  hits: WorkspaceSearchHit[]
  truncated: boolean               // true if we hit maxMatches/maxFiles
}
```

#### Deterministic algorithm (ripgrep)

**Command shape (always the same structure; only a few switches vary):**

- `rg` with JSON output for stable parsing:
  - `rg --json --no-heading --with-filename --line-number --column`
- Safe defaults:
  - `--hidden` only if we decide to include dotfiles (default: off)
  - `--max-filesize <bytes>` (default \(2MB\))
  - `--glob` include/exclude (from request)
  - `--smart-case` by default
- Query mode:
  - `literal`: pass `--fixed-string`
  - `regex`: pass `--regexp`
  - `auto`: if query contains obvious regex metacharacters (`[](){}|.+*?^$\\`) treat as regex, else fixed-string

**Parsing:** consume `rg --json` stream, collect only `type:"match"` events, then cap:

- stop after `maxMatches`
- stop after `maxFiles` distinct files (optional)

**Ranking (no NPU):**

- prefer exact matches in title-ish areas (filenames, first lines)
- prefer more occurrences in fewer files
- prefer closer together matches (dense clusters)

**UI behavior (Raycast):**

- List grouped by file
- show line + preview
- actions: open file at line (if supported), copy preview, copy file path, open folder

---

### 11b. NPU-assisted Workspace Search — reliable, simple, non-hallucinatory

#### Two candidate designs

**Option A — Phi generates `rg` commands from English**
- Pros: feels “magical”
- Cons: unreliable; hallucinated flags/paths/globs can break searches or leak outside root. Hard to sandbox.

**Option B — Deterministic retrieval, Phi reranks/summarizes**
- Pros: reliable, debuggable, safe. Phi never chooses what files to touch.
- Cons: less “agentic,” but still powerful.

**Decision:** **Choose Option B** for v1. It is the simplest approach that stays robust.

#### v1 flow (Option B)

1. **Detect active workspace** (reuse dev toolbox `detectActiveWorkspace` logic).
2. Run **Smart Grep** (11a) with conservative defaults.
3. If results are already good (e.g. \(\ge 10\) hits), stop.
4. If results are sparse or broad, run a second deterministic pass:
   - widen include globs (e.g. include `*.md`, `*.json`, `*.ts`, `*.tsx`)
   - add context lines
   - raise maxMatches modestly
5. **Optional Phi step** (only if user asks for “best answer” or results are large):
   - Build a compact payload: query + top N hits (file, line, preview).
   - Ask Phi to output a small JSON shape:

```json
{ "top": [{ "file": "...", "line": 123, "reason": "..." }], "suggestedNextQuery": "..." }
```

**Rules:** Phi may only refer to candidates provided. It cannot invent file paths or lines; TS validates and drops unknowns.

#### v2 (optional): bridge-side batching

If TS-side rerank is too slow, add bridge `phi-rerank` to batch 20–40 hits in one call (still small context). The contract remains “ranking only.”

---

### Reliability constraints (must-haves)

- **Root sandbox:** never search outside the resolved root folder.
- **No command generation in v1:** Phi does not produce shell commands or `rg` flags.
- **Strict schemas:** every Phi response is JSON-only with validation.
- **Context budgeting:** candidate previews are single-line + truncated; cap N.
- **Failure mode:** if Phi fails, the command still succeeds with Smart Grep results.

---

## 12. Global hotkey text rewrite (selection in-place, no Raycast HUD)

**Extension:** `npu-text-tools-ext`  
**Authoritative Microsoft doc in-repo:** `docs/REWRITE_INFO.md` (Phi Silica, `LanguageModel` readiness, **Text Intelligence Skills** — `TextSummarizer`, **Rewrite** / `TextRewriter`)  
**Status:** **Superseded for v1** — shipped baseline is **`docs/FORWARD_ROADMAP.md` §3** (Raycast hotkeys + **`getSelectedText()`** + optional **`TextSelectionHelper.exe`**). **This §12** documents an **optional future** (standalone `RegisterHotKey` companion + `%LocalAppData%\NpuTextTools\presets.json`) if we ever want hotkeys **without** Raycast running or richer preset files than “one Raycast hotkey per command.”

### Update (2026-05) — what actually shipped

- **Hotkeys:** Raycast **Settings → Shortcuts** on built-in **`… (Paste Selection)`** / **`… (Review Selection)`** commands (same mechanism as other extensions).
- **Selection capture:** **`getSelectedText()`** immediately after **`closeMainWindow`** (fixes Windows focus races vs naive Ctrl+C-only capture). Fallback: sentinel clipboard + **`TextSelectionHelper.exe send-copy`** (foreground poll, **AttachThreadInput** / **SetForegroundWindow**, exit **2** if Raycast never releases focus).
- **Paste:** Helper **`send-paste`** after dismiss; see `npu-text-tools-ext/selection-helper/README.md`, `NOTES.md`, `RUNBOOK.md`.

### Problem statement (original §12 intent — archive)

Users want **one shortcut** (e.g. a chord like **Alt+Win+G**) that, while text is **selected in any app**, **rewrites that selection in place** — without opening Raycast, pasting into a form, or copying the result manually. They also want **multiple shortcuts** bound to **different rewrite presets** (grammar vs simplify vs custom instructions), managed like **user-defined profiles**, not six fixed OS-wide shortcuts hardcoded in C#.

**Original §12 premise:** Raycast does **not** provide a supported way to run extension code on **global OS hotkeys while Raycast is backgrounded or quit**; so a **small Windows companion** that owns **`RegisterHotKey`** was proposed. **Shipped v1** instead keeps **hotkeys inside Raycast** and uses **`getSelectedText()`** so capture does not depend on a keeper process.

### Goals

1. **Global hotkey → rewrite selected text → replace selection** in the active application, on-device only (no network).
2. **User-authored preset list:** each preset picks a **rewrite kind** (built-in mode and/or custom instruction) and binds to **one global hotkey** (user configurable; sensible defaults documented).
3. **Easy management:** install/start helper, edit presets, detect conflicts, test a preset, open logs — preferably from **Raycast commands** so the extension remains the “control panel.”
4. **Behavior matches official Windows AI patterns** in `docs/REWRITE_INFO.md` (readiness, skill APIs) — see **API alignment** below.

### Non-goals (v1)

- Rewriting **without** using the clipboard as part of the capture/paste shim (see risks — alternatives are much heavier).
- **macOS** (suite target is Windows Copilot+ / sparse bridges).
- **Per-app profiles** or **context-aware** target detection beyond “whatever window has focus.”

### Official API alignment (`docs/REWRITE_INFO.md`) vs current bridge

| Topic | Microsoft guidance (`docs/REWRITE_INFO.md`) | `npu-text-tools-ext` today (§3) | Planned direction |
|-------|---------------------------------------------|----------------------------------|-------------------|
| Model readiness | `LanguageModel.GetReadyState()`; if `NotReady`, `await LanguageModel.EnsureReadyAsync()` | Same pattern in `bridge/Program.cs` | **Unchanged** — helper calls the same bridge; no duplicate WinRT session in the helper for v1. |
| **Rewrite** skill | **Text Intelligence Skills:** instantiate skill object with `LanguageModel`, call async skill method. Doc sample: `TextRewriter` + `RewriteAsync` (imports include `Microsoft.Windows.AI.Text.Experimental` in the captured snippet). | Uses **`LanguageModel.CreateContext(systemPrompt)`** + **`GenerateResponseAsync(context, userText, ...)`** for all modes (including grammar/bullets where `TextRewriteTone` does not map). | **Refactor bridge in the same PR or a prerequisite PR:** For modes that are pure “rewrite clarity/readability/tone,” prefer **`TextRewriter`** per Microsoft’s **Rewrite** skill when the installed Windows App SDK / projection exposes a stable overload that matches our intent (verify against the WinMD for the same package line as the bridge — `2.0.0-experimental4` today). For **grammar**, **bullets**, and **custom instruction**, either (a) keep **`LanguageModel` + context** if `TextRewriter` cannot express the constraint, or (b) add **documented** `TextRewriterOptions`/tone only when the API supports it. **Custom presets** (user instruction string) likely remain **`LanguageModel`**-based for reliable instruction-following (same as current `custom` mode). |
| **Summarize** skill | `TextSummarizer` + `SummarizeAsync` | Not exposed as a Raycast command today | **Optional preset kind** in v1.1+ (“Summarize selection”) once bridge adds a mode or `phi-rewrite` sibling argv — aligns with the same doc. |
| Content moderation | Example sets `ContentFilterOptions` on `LanguageModelOptions` | Not set today | **Optional:** mirror doc defaults for hotkey path if we expose moderation knobs later; v1 can stay parity with current bridge. |

**Rule:** After any bridge change, **`docs/REWRITE_INFO.md`** remains the **normative** API reference; update `bridge/Program.cs` comments to cite the skill used (`TextRewriter` vs `LanguageModel`) per mode.

### Architecture (suite conventions–compliant)

**Components**

1. **Existing sparse bridge** — `npu-text-tools-ext/assets/bin/NpuBridge.exe` + `NpuTextToolsBridge.Identity`. **No second identity** for v1 if the helper only **spawns** this exe with the same argv contract as TypeScript (`phi-rewrite <mode> <tempFile>`). **`cwd` must be** `path.dirname(NpuBridge.exe)` (same as `TextRewriteCommand.tsx`).
2. **New companion:** `npu-text-tools-ext/hotkey-helper/` (name finalizable) — e.g. **`TextHotkeyHelper.exe`** published to **`npu-text-tools-ext/assets/bin/`** alongside `NpuBridge.exe`. Pattern: **`npu-awake-ext/keeper/`** — plain **.NET 8** **WinExe**, **full-trust**, **no** Raycast runtime. It:
   - Loads **`presets.json`** from a fixed user location (recommended: `%LocalAppData%\NpuTextTools\presets.json` — **not** inside Raycast’s extension bundle, so edits survive extension updates).
   - Registers **Windows `RegisterHotKey`** (or low-level hook only if unavoidable — prefer `RegisterHotKey` for simplicity) for each preset.
   - On hotkey: run the **selection replace pipeline** (below).
   - Optional **notify icon** for “running”, “failed”, “open config”, exit.
3. **Raycast extension** — new commands + preferences to **edit presets**, **install/start/stop helper**, **open config folder**, **validate hotkey conflicts**, and **copy default presets** on first run.

**CONTRIBUTING.md constraints**

- **No shared npm package** with other extensions; helper is **only** under `npu-text-tools-ext/`.
- **One extension folder = one installable unit**; ship helper exe inside **`assets/bin/`** with the extension so Store/manual installs stay coherent.
- **`register-bridge.ps1`:** only if a **new** sparse package is added — **not required** for v1 if helper is vanilla Win32/.NET and does not call WinRT directly.

### Selection capture and paste-back (UX-critical)

**Recommended v1 algorithm (clipboard shim)**

1. **Snapshot clipboard** (at least **Unicode text**; ideally use Win32 API to duplicate text format and common formats if feasible — minimum viable: save previous text string).
2. **Synthesize Ctrl+C** to the foreground window (`SendInput`) so the selection is copied.
3. **Wait** a bounded time (debounce **50–200 ms**, app-dependent) and **read clipboard text**.
4. If clipboard is **empty or unchanged** from a “no selection” heuristic → **abort**: restore clipboard, show **tray balloon** or **toast-like notification** (“No text captured — select text and try again.”).
5. Write captured text to a **temp file**; **`Process.Start`** `NpuBridge.exe phi-rewrite <mode> <temp>` (or write JSON temp for `custom` / preset-defined instruction — bridge contract may need **`preset`** argv that maps to instruction in file — see below).
6. **Parse one-line JSON stdout** `{ "status", "result"? , "message"? }` — identical contract to Raycast path.
7. On success: put **`result`** on clipboard; **synthesize Ctrl+V**; after short delay, **restore** original clipboard snapshot (user expectation: clipboard looks as before, except selection was replaced — document that perfect restoration of rich clipboard is v1 **text-only**).
8. On failure: restore clipboard; notify user with stderr tail / message.

**UX safeguards**

- **Busy flag:** ignore overlapping hotkey triggers while a rewrite is in flight (prevent double paste).
- **Timeout** on bridge process (e.g. 2–5 minutes max; Phi first run can be slow).
- **Size cap:** if selection exceeds **N** characters (configurable, default aligned with model context limits), refuse with clear message.

**Known limitations (must be documented in `NOTES.md`)**

- Apps that **block clipboard** or use **nonstandard selection** may fail.
- **Remote desktop / elevated** apps may need UAC-aware notes (helper runs as user).
- **Win+Alt+** chords can overlap **Windows 11** system shortcuts — preset wizard should **warn** and suggest alternatives.

### Preset configuration (data model)

**File:** `%LocalAppData%\NpuTextTools\presets.json` (versioned schema).

**Suggested shape (illustrative — finalize in implementation):**

- **`schemaVersion`**
- **`presets[]`:**
  - **`id`** (stable string)
  - **`label`** (for Raycast UI)
  - **`hotkey`:** modifiers array + **virtual key** (store as string token + VK enum int — avoid locale issues)
  - **`rewrite`:**
    - **`kind`:** `"builtin"` → **`mode`** one of `grammar | formal | concise | bullets | simplify` (must match `phi-rewrite` argv)
    - **or** `"custom"` → **`instruction`** string (maps to current `custom` JSON temp payload)
    - **or** (later) **`"summarize"`** when bridge supports `TextSummarizer`
- **`helperOptions`:** `runAtLogin`, `showTrayIcon`, `clipboardRestoreDelayMs`, `maxChars`, …

**Raycast responsibilities**

- **Validate** JSON on save (schema in TS or Zod-style manual checks — **no new shared package**; inline or single file in extension).
- **Detect duplicate hotkeys** across presets before writing.
- **Export / import** preset files (optional v1.1).

### Bridge contract extensions (if needed)

**Option A (minimal):** Presets only use existing **`phi-rewrite`** modes; custom presets use **`custom`** with temp JSON — no argv change.

**Option B (cleaner for config):** Add **`phi-rewrite-preset <tempFile>`** where temp JSON is `{ "builtinMode"?: "...", "instruction"?: "...", "text": "..." }` so the helper does not branch on file shape — **one** code path in `Program.cs`. Prefer **Option B** if it reduces helper duplication.

Either way: **stdout remains one JSON line**; **`cwd`** rule unchanged; update **`EXTENSION_REGISTRY.md`** IPC column when argv changes.

### Raycast UX structure (easiest path for users)

**Onboarding (first run)**

1. User installs **NPU Text Tools** in Raycast.
2. Command **“Text Hotkeys — Setup”** (or similar): explains helper, **“Install & Start Helper”** (copies nothing if exe already in `assets/bin` — just starts it), **“Open Presets”** opens JSON or a **Form** editor.
3. Offer **“Generate default presets”** — maps 1:1 to current six §3 modes with **suggested** hotkeys that **avoid** common OS chords; user must confirm each binding (OS may reserve keys).

**Day-to-day**

- **Tray icon (optional):** “Reload presets”, “Open Raycast extension”, “Quit helper.”
- **No Raycast required** for rewrite once helper runs.

**Power users**

- Direct edit of `presets.json` + **Reload** from tray or Raycast command.

**Failure UX**

- Match **`docs/SUITE_STYLE_GUIDE.md`** where Raycast is involved; tray notifications use **plain ASCII**, short Title Case titles, **no emoji** (parity with toast rules).

### Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **0** | **Spike:** `hotkey-helper` exe: one hardcoded hotkey → Ctrl+C → read clipboard → call `NpuBridge.exe` → Ctrl+V → restore clipboard. Prove reliability in Notepad, Word, Edge. |
| **1** | **Preset load** from `%LocalAppData%`; `RegisterHotKey` for N presets; reload on file change or tray command. |
| **2** | **Raycast commands:** setup wizard, preset editor (Form or JSON), start/stop helper (spawn/kill process with safe UX), open folder. |
| **3** | **Bridge alignment:** introduce **`TextRewriter`** for applicable builtin modes per `docs/REWRITE_INFO.md`; keep `LanguageModel` for custom; add tests/manual checklist. |
| **4** | **Polish:** login task / Startup shortcut installer optional; summarize preset; telemetry-free logging file for support. |

### Files and registry (when implementing)

| Location | Change |
|----------|--------|
| `npu-text-tools-ext/hotkey-helper/*.csproj` | New WinExe, `net8.0-windows`, optional `UseWindowsForms` for tray icon |
| `npu-text-tools-ext/assets/bin/` | Ship `TextHotkeyHelper.exe` next to `NpuBridge.exe` |
| `npu-text-tools-ext/src/*.tsx` | New commands: setup, preset editor |
| `npu-text-tools-ext/package.json` | New command entries + preferences (`helperAutoStart`, paths optional) |
| `npu-text-tools-ext/bridge/Program.cs` | Optional argv unify; `TextRewriter` integration |
| `EXTENSION_REGISTRY.md` | Note helper binary + any new bridge argv |
| `npu-text-tools-ext/NOTES.md` | Clipboard shim limits, conflicts, admin edge cases |
| `docs/RUNBOOK.md` | Helper startup, debugging “no selection captured” |
| `CHANGELOG.md` | User-facing summary |

### Relationship to § Cleanup follow-ups (“Keyboard shortcuts audit”)

- **Action-level shortcuts inside Raycast** (List actions, etc.) remain separate.
- **§12** is the **global OS hotkey** story for text tools; update the cleanup bullet to reference this section when marking progress.

---

## Suite UX conventions

> **Normative content moved (2026-05-11):** Toast copy, typography, `ActionPanel` ordering, bridge/UI error boundaries, TypeScript and C# hygiene, and the **`scripts/audit-toasts.mjs`** workflow live in **[`docs/SUITE_STYLE_GUIDE.md`](docs/SUITE_STYLE_GUIDE.md)**. Read that file before changing user-visible strings or spawn helpers. This heading remains as the anchor for cross-links from older notes.

### Cleanup follow-ups

> **Status legend:** ✅ done · 🔲 open. When you mark something done, add the date and a one-line "what changed" note; do **not** delete completed entries (history matters).

- 🔲 **Suite preferences audit (all extensions)** *(added 2026-05-08)*.
  - **Goal:** expose Raycast preferences wherever a reasonable user might want control, without cluttering the UI.
  - **Decision rule:** add a preference when it changes behavior that:
    - is subjective (e.g., “prefill from clipboard”, “auto-open output files”)
    - is environment-specific (paths, IDE/terminal choice, default folders)
    - trades speed vs quality (semantic search debounce, max matches, “auto-run semantic” toggle)
    - is potentially destructive or noisy (auto-open windows, auto-delete intermediates, confirmations)
  - **Process:**
    - For each extension, list current prefs and identify missing knobs.
    - Add prefs in `package.json` with clear **title/description/label** and sensible defaults.
    - Update the command UI copy to reflect prefs (no “mystery behavior”).
    - Run `ray lint` + `ray build` per touched extension.
  - **Suggested initial targets:**
    - `npu-notes-ext`: semantic search debounce, max semantic checks, max semantic hits, show/hide success toasts.
    - `npu-image-editor-ext`: default behaviors that open files/windows; any “auto-*” flows.
    - `npu-awake-ext`: default durations, schedule defaults, disclaimer toggles.
    - `npu-dev-toolbox-ext`: already has many prefs; audit for missing ones around detection fallbacks/timeouts.

- 🔲 **Keyboard shortcuts audit (action-level inside lists + command-level hotkeys)** *(added 2026-05-08)*.
  - **Goal:** make common flows fast without making users memorize obscure bindings.
  - **Global OS hotkeys (outside Raycast):** **`FEATURE_PLAN.md` §12** — `npu-text-tools-ext` **global rewrite** companion + `presets.json`; not the same as Raycast command hotkeys.
  - **What we can set in code (reliable):** `Action` shortcuts inside commands (e.g., Delete Note in Browse Notes).
  - **What we should not hardcode (Raycast-level):** command hotkeys are user-configurable in Raycast; document recommended hotkeys, but don’t attempt to enforce them in `package.json`.
  - **Process:**
    - For each list-based command, ensure:
      - primary action is Enter (Raycast default)
      - destructive actions get an explicit shortcut (e.g., Delete = `ctrl+d` or `cmd+backspace`, whichever feels consistent on Windows)
      - confirmations exist for destructive actions
    - Add a short “Recommended Hotkeys” note in each extension’s `NOTES.md` if it helps onboarding.
  - **Concrete example (desired UX):**
    - `npu-notes-ext/browse-notes`: Delete Note should be doable from keyboard with a one-step shortcut + confirm.

- ✅ **WebP encoder / wasm asset wiring** *(done 2026-05-08)*. Inline `ensureWebpEncodeInit` moved to `npu-image-editor-ext/src/utils/webp-encoder.ts` (now exposes `encodeRgbaToWebp`). Missing wasms now copied at build time by `scripts/copy-wasm.mjs`, wired as `prebuild` and `predev` in `package.json`. `assets/webp/` and `*.wasm` added to root `.gitignore`.
- ✅ **`runNpuCommand` extracted** *(done 2026-05-08)*. Moved to `npu-image-editor-ext/src/utils/run-npu-command.ts` (returns `{ ok, result } | { ok, error }`, never throws — matches the **Error handling rules** in **`docs/SUITE_STYLE_GUIDE.md`**). `modify-image.tsx`, `super-resolution.tsx`, and `extract-text.tsx` all use it. `make-sticker.tsx` (when written) should use the same helper.
- ✅ **`ImageForegroundExtractor` references corrected** *(done 2026-05-08)*. `docs/RUNBOOK.md`, `npu-image-editor-ext/NOTES.md`, `NPU_INFO.md`, and the active forward-looking parts of `FEATURE_PLAN.md §6` now say `ImageObjectExtractor` with a parenthetical noting the older draft name. Historical struck-through sections were left untouched per the planning-database rule at the top of this file.
- ✅ **`search-notes` command hidden** *(done 2026-05-08)*. Removed from `npu-notes-ext/package.json` and the stub `src/search-notes.tsx` deleted to satisfy the "no `WIP` to users" rule. Re-added as part of §10 (see "Re-introduce `search-notes`" subsection).
- ✅ **`NpuBridge.exe` name collision header comments added** *(done 2026-05-08)*. Each `bridge/Program.cs` now opens with a sparse-identity banner naming the matching `Package.appxmanifest` Identity Name and warning not to copy the exe across extensions.
- ✅ **`ensure-bridge-registered.ts` duplication — accepted as permanent policy** *(decided 2026-05-08)*. Per `CONTRIBUTING.md` § "Project structure" and `docs/RUNBOOK.md`, **no shared runtime code between extensions** in any form (no shared npm packages, no `file:` siblings, no codegen sync, no symlinks). Each extension is independently installable and must work standalone. New extensions copy `ensure-bridge-registered.ts` (and any other recurring helper) verbatim. Drift between copies is acceptable; coupling is not. **No further action.**
- ✅ **Toast string drift across existing extensions** *(initial sweep done 2026-05-08)*. Built `scripts/audit-toasts.mjs` (slot-scoped: only edits inside `showToast({...})` bodies and `<var>.title|message|style = ...` assignments — never touches unrelated `title:`/`message:` keys in YAML parsers, action labels, etc.). First run found 13 violations across 4 extensions; mechanical fixes auto-applied (typography normalization, message terminal punctuation, trailing-whitespace trim with proper outer-delimiter escape so curly→ASCII inside `"..."` strings produces `\"` instead of breaking syntax). Remaining 5 judgment-required fixes applied by hand (added recovery-hint messages to bare-title Failure toasts, switched the `ImageCommandScaffold` placeholder from `Animated` to `Failure` style with `Not Implemented Yet`). The audit script is now a permanent part of the workflow: run `node scripts/audit-toasts.mjs` from repo root before merging anything that touches toasts. Each new extension is automatically covered (any folder ending in `-ext`).

---

## Notes on New Extensions

All new extensions (`npu-text-tools-ext`, `npu-notes-ext`, `npu-awake-ext`) are scaffolded with:
- `package.json`, `tsconfig.json`, `raycast-env.d.ts`
- `src/` with stub commands
- `bridge/` or `keeper/` folder (`.gitkeep` placeholder)

Before running `npm run dev` in any of them, run `npm install` first.

Extensions that use Phi-Silica (`npu-text-tools-ext`, `npu-notes-ext`) will need:
1. A new C# bridge project in their `bridge/` folder (modeled on `npu-image-editor-ext/bridge/`)
2. Their own `Package.appxmanifest` with appropriate capability declarations
3. Their own `register-bridge.ps1` run (or update the root `register-bridge.ps1` to handle multiple packages)

While creating these extensions, if a new issue is solved, or a new feature is successfully implemented involving the NPU, and it is not something incredibly obvious, log it to `NPU_INFO.md`.

Awake (`npu-awake-ext`) does **not** need sparse package registration — `SetThreadExecutionState` is a plain Win32 API.
