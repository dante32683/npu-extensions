# Feature Plan

> **Suite planning database:** This file is the **primary place** for roadmap, feature specs, and dated / struck-through lessons as the suite evolves. **Do not permanently delete historical content**—strike through and date superseded parts, or move tiny redundant fragments into **`CHANGELOG.md`** / **`docs/RUNBOOK.md`** only when they’re fully captured elsewhere.
>
> **Where else to look:** **Contributor workflow & logging:** [`CONTRIBUTING.md`](CONTRIBUTING.md). **Factual wiring** (bridges, sparse `Identity` names): [`EXTENSION_REGISTRY.md`](EXTENSION_REGISTRY.md). **Technical depth & troubleshooting:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md). **Release summary:** [`CHANGELOG.md`](CHANGELOG.md). **Per-extension notes:** `<extension>/NOTES.md`. The repo files `CLAUDE.md`, `AGENTS.md`, and `GEMINI.md` are **stubs** that point at the same hub for different AI products.
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

> **Status (2026-05-07):** Items **#1 Super Resolution**, **#2 OCR**, **#3 Phi-Silica Text Tools**, and **#4 Smart Note Taker** are implemented. **#5 Awake** is currently being redesigned as **Smart Awake** to incorporate NPU-powered natural language schedule parsing. Next up after the redesign is **#6 Sticker Maker**. Items **#9** and **#10** are new additions to the roadmap. The PENDING `package.json` section below remains historical reference.

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
**Extension:** `npu-image-editor-ext`
**New files:** `src/make-sticker.tsx`, new `case "make-sticker"` in `bridge/Program.cs`

### What it does
Converts an image into a 480×480 transparent WebP sticker. NPU removes the background, smart crop centers on the subject.

### 6a. Basic Sticker (auto crop)

**User flow:**
1. Select one image in Explorer
2. Run "Make Sticker" command (or action inside Modify Image)
3. Bridge: remove background → find subject bounding box → crop → resize → output WebP
4. Output: `<name>_sticker.webp` next to source
5. Toast warning if no clear subject: "No clear subject detected — center crop used. Use 'Make Sticker (Manual Focus)' for better results."

**Crop algorithm:**
1. Run `ImageObjectExtractor` → get alpha mask (reuse existing bridge logic — see §6c lesson #1)
2. Scan mask pixels to find bounding box of all non-zero alpha pixels
3. Add 10% padding on all sides (clamped to image bounds)
4. If bounding box covers >80% of image → fallback: use center crop, show warning toast
5. Crop source to padded bounding box
6. Resize to 480×480 using `Jimp.resize()` — letterbox with transparent fill if not square
7. Encode as WebP via Jimp (TypeScript side handles this — bridge outputs PNG, TS re-encodes to WebP)

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
   - Use the standardized animated toast: `title: "Running NPU Make Sticker..."`, `message: "First run may take a moment to prepare the NPU model."` (matches `super-resolution.tsx` and the Phi-Silica bridges). See **§ Suite UX conventions** below for the canonical strings.
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

## 9. NPU Dev Toolbox — Git Commit (auto-detect repo)

**Extension:** `npu-dev-toolbox-ext` (new — to be scaffolded)
**New files:** `package.json`, `bridge/Program.cs`, `bridge/Package.appxmanifest`, `src/commit-message.tsx`, `src/utils/foreground-context.ts`, `src/utils/git.ts`, `src/utils/run-bridge.ts`, `src/utils/ensure-bridge-registered.ts` (copy of the canonical helper).

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
4. Validate the resolved path is a git working tree (`git rev-parse --show-toplevel`). If not, surface the standard error toast (see § Suite UX conventions).
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
- Selecting a note runs `phi-related` against the **other 20 most recent notes** and renders results in a `Detail` view with `Action.Open` on each related note.
- Same UX template as `browse-notes.tsx` — same `List.Item` shape, same accessory format, same actions ordering.

### Re-introduce `search-notes` (separate but adjacent)

`src/search-notes.tsx` was deleted on 2026-05-08 and the `search-notes` command was removed from `package.json` because it was shipping a `WIP` empty-view to users (see § Cleanup follow-ups). Re-add both as part of this work using the **two-phase** plan already in §4 (Search Notes stretch goal): keyword filter → if `<3` results, Phi-Silica yes/no pass per non-matching note. Bridge gets a new argv `phi-search-relevance <tempInputFile>` taking `{ query, candidate }` and returning `{ relevant: true|false }`. The Semantic Linking and Search Notes work share enough plumbing (same bridge, same temp-file pattern, same JSON-extract helper) that they should land in the same PR.

### Future: embeddings (out of scope for v1; design hook only)

If/when a stable embedding API ships in `Microsoft.Windows.AI` (or via `Microsoft.Windows.AI.MachineLearning` ONNX-runtime path):

- Add a new bridge mode `phi-embed <text>` returning `{ "vector": [...] }`.
- Cache embeddings alongside the note as a sibling `<filename>.emb.json` (or in a single `embeddings.bin` blob).
- Replace the candidate-set + classifier step with a kNN over cached vectors.
- Frontmatter `related:` schema **does not change** — only the producer changes.

---

## Suite UX conventions (canonical reference for all extensions)

> **Why this section exists:** Toast strings, error templates, and action labels were drifting between extensions during the v1 build-out. New features (Sticker Maker, Dev Toolbox, Semantic Linking) **must** match these conventions. Existing extensions that don’t match are tracked as cleanup follow-ups (see § Cleanup follow-ups).

### Capitalization

- **Toast titles:** Title Case (e.g., `Upscaling Complete`, `Note Saved`).
- **Toast messages:** Sentence case ending in a period (e.g., `Upscaled 3 image(s).`).
- **Action labels (buttons, menu items):** Title Case (e.g., `Copy to Clipboard`, `Open in Editor`).
- **Form labels:** Title Case. Form descriptions: sentence case.
- **Section headers in `ActionPanel.Section title`:** Title Case (e.g., `NPU Actions (AI)`, `Standard Actions (CPU)`).

### Toast templates

| State | `Toast.Style` | Title | Message |
|-------|---------------|-------|---------|
| Animated (working) | `Animated` | `Running NPU <Friendly Name>...` *(NPU)* / `Formatting with Phi-Silica...` *(Phi)* / `Detecting Active Workspace...` *(toolbox)* | `First run may take a moment to prepare the NPU model.` (NPU only; Phi/toolbox: short context-specific message ending in `...`) |
| Success | `Success` | `<Friendly Name> Complete` *or* a direct outcome statement (e.g., `PC Will Stay Awake Indefinitely`, `Note Saved`) | `<Plain past-tense summary>.` (e.g., `Upscaled 3 image(s).`, `Saved to school/2026-05-07_office-hours.md.`) — optional when the title is already self-explanatory. |
| Failure (action) | `Failure` | `<Friendly Name> Failed` (e.g., `Super Resolution Failed`, `OCR Failed`) | `<One-sentence reason>. <One short recovery hint>.` (e.g., `Bridge not found. Run dotnet publish in npu-image-editor-ext/bridge.`) |
| Failure (validation) | `Failure` | `<Issue>` — direct noun phrase, Title Case (e.g., `No Images Selected`, `Invalid Time Format`, `No Note Provided`) | `<What to do instead>.` Required for every Failure toast — never leave a bare title with no message. |

- **Ellipsis form is exactly three dots** (`...`), never `…` (U+2026). Animated toasts always end in `...`. Success/failure messages never do.
- **Quotes inside toast strings are ASCII** (`"` `'`), not curly typography (`“` `”` `‘` `’`). Same applies to `Form` labels, `List.EmptyView` strings, `confirmAlert` text — anywhere a string is rendered to the user.
- **Never** mix `Processing...` and `Please wait` in the same flow. Always prefer the `Running NPU <Friendly Name>...` form for NPU calls.
- **Never** emit emoji in toasts. (Plain templates only — they render badly in the Raycast toast UI on Windows.)
- **Failure toasts must have a message.** Even a validation failure like "No Images Selected" benefits from a one-line follow-up so the user knows what to do.

### Toast audit tool

`scripts/audit-toasts.mjs` (root level) scans every `*-ext/src/**/*.{ts,tsx}` for `showToast({...})` calls and `<var>.title|message|style = ...` assignments. Run from repo root:

```powershell
node scripts/audit-toasts.mjs           # report-only; exit 1 if any violations
node scripts/audit-toasts.mjs --fix     # apply mechanical fixes, then re-audit
node scripts/audit-toasts.mjs --verbose # also print clean toasts in the table
```

Mechanical fixes (auto-applied with `--fix`):

- Replace `…` (U+2026) with `...` inside string and template literals.
- Replace curly quotes (`“ ” ‘ ’`) with their ASCII equivalents inside string and template literals.
- Append a trailing `.` to `message: "..."` and `<var>.message = "..."` string literals that lack terminal punctuation.
- Trim trailing whitespace inside `title` / `message` literals.

Human-review violations (reported, never auto-fixed):

- `animated-title-missing-ellipsis` — Animated toast title doesn't end in `...`.
- `success-title-mentions-failure` — Success-style toast title contains "Failed" / "Error".
- `success-title-trailing-punctuation` — Success-style title ends in `.` / `!` / `?`.
- `failure-without-message` — Failure-style toast has no `message` field at all.
- `emoji-in-title` / `emoji-in-message` — emoji codepoints in user-visible strings.

The script writes a JSON report to `scripts/audit-toasts.report.json` (gitignored — it's regenerated on every run). New extensions inherit the audit by virtue of being under a `*-ext` folder; no per-extension wiring needed.

### Action panel ordering (top-to-bottom in every command)

1. **Primary destructive-or-output action** (`Copy to Clipboard`, `Save Note`, `Upscale Images`, `Make Sticker`).
2. **Try Another / Regenerate** (where applicable).
3. **Navigation** (`Open in Editor`, `Open Folder`, `Open Repo in Explorer`).
4. **Selection management** (`Refresh Selection`, `Paste from Clipboard`, `Remove from Selection`).

### Error handling rules (apply to every extension)

- All bridge spawns, file I/O, PowerShell calls, and `git` calls go through one helper per extension (`run-bridge.ts`, `git.ts`, etc.) and that helper **always returns** `{ ok: true, value } | { ok: false, error }` — it does not throw to the UI layer.
- The TS UI layer translates `{ ok: false, error }` into a `Toast.Style.Failure` toast using the template above. **No `throw` reaches the React render path.**
- Bridge `Program.cs` always emits exactly one JSON line on stdout, regardless of error. Stack traces and developer diagnostics go to stderr and are logged with `console.error("[<BridgeName>]", stderr)` in TS — never parsed.
- Input validation lives at the boundary (form `onSubmit`, argv parsing in `Program.cs`) and produces a `Failure` toast / `{ status: "error", ... }` JSON respectively. No deeper helper revalidates.

### Code-cleanliness rules (apply when writing or touching any file)

- **Naming:** TypeScript = `camelCase` for vars/functions, `PascalCase` for components/types. C# = `PascalCase` for public, `_camelCase` for private fields, `camelCase` for locals. No abbreviations except domain ones (`npu`, `ocr`, `cwd`, `pid`, `pii`).
- **Imports:** stdlib (`fs`, `path`, `os`, `child_process`, `util`) → third-party (`@raycast/api`, `jimp`, `@jsquash/*`) → internal (`./utils/*`, `./shared/*`). Sorted alphabetically inside each group. No duplicates. No unused imports.
- **Magic values:** every literal that appears more than once, or that has domain meaning (`2048`, `100_000`, `0x80073CFB`, `"NpuBridge.Identity"`, file suffix strings) becomes a named `const` at the top of the file or in `src/constants.ts`.
- **DRY:** the bridge spawn helper, the WebP encoder init, the JSON-extract helper, the foreground-context detector, and the frontmatter parser each live in **one** place and are imported. Duplicated 2+ times = extract.
- **Dead code:** no commented-out blocks (use git history). No `// TODO` without a `FEATURE_PLAN.md` link. No stubs that show `WIP` to users — gate them behind a Raycast preference if they must ship before completion.

### Cleanup follow-ups

> **Status legend:** ✅ done · 🔲 open. When you mark something done, add the date and a one-line "what changed" note; do **not** delete completed entries (history matters).

- ✅ **WebP encoder / wasm asset wiring** *(done 2026-05-08)*. Inline `ensureWebpEncodeInit` moved to `npu-image-editor-ext/src/utils/webp-encoder.ts` (now exposes `encodeRgbaToWebp`). Missing wasms now copied at build time by `scripts/copy-wasm.mjs`, wired as `prebuild` and `predev` in `package.json`. `assets/webp/` and `*.wasm` added to root `.gitignore`.
- ✅ **`runNpuCommand` extracted** *(done 2026-05-08)*. Moved to `npu-image-editor-ext/src/utils/run-npu-command.ts` (returns `{ ok, result } | { ok, error }`, never throws — matches the "Error handling rules" in § Suite UX conventions). `modify-image.tsx`, `super-resolution.tsx`, and `extract-text.tsx` all use it. `make-sticker.tsx` (when written) should use the same helper.
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
