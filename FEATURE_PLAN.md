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
| 5 | Awake | `npu-awake-ext` (new) | Medium |
| 6 | Sticker Maker (basic) | `npu-image-editor-ext` | Medium-High |
| 7 | Sticker Maker (manual focus) | `npu-image-editor-ext` | High — API TBD |
| 8 | Search Notes | `npu-notes-ext` | Later |

> **Status (2026-05-07):** Item **#3 (Phi-Silica Text Tools)** is complete — see **§3** below (including HTML debug comment). Items #1–2 were already complete; #4+ remain as planned.

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

## 4. Smart Note Taker
**Extension:** `npu-notes-ext` (new, scaffolded at `npu-notes-ext/`)
**New files:** `src/add-note.tsx`, `src/browse-notes.tsx`, `src/search-notes.tsx` (stub only), `bridge/Program.cs`

### Configuration (Raycast extension preferences)
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

## 5. Awake
**Extension:** `npu-awake-ext` (new, scaffolded at `npu-awake-ext/`)
**New files:** one `.tsx` per command in `src/`, `keeper/AwakeKeeper.csproj` + `keeper/Program.cs`

### What it does
Prevents Windows from sleeping. Keyboard-first, no mouse needed. Uses `SetThreadExecutionState` Win32 API via a persistent helper process.

### Commands

| Command | Mode | Behavior |
|---------|------|----------|
| Awake | no-view | Toggle indefinite keep-awake on/off |
| Awake For... | view | Arg: minutes. Stays awake for N minutes, then auto-releases |
| Awake Until | view | Arg: time string (e.g. `17:30`). Stays awake until clock reaches that time |
| Let Sleep | no-view | Immediately cancel any active session |
| Awake Status | view | List view showing current mode + time remaining / target time |
| Screen-Off Mode | no-view | System awake, display allowed to sleep (good for downloads/renders) |

### AwakeKeeper.exe (C# helper)
Lives at `npu-awake-ext/keeper/`. No NPU dependency, no App SDK. Minimal exe.

```
AwakeKeeper.exe <mode> [durationSeconds|targetEpochSeconds]
```

Modes: `indefinite`, `timed`, `until`, `screen-off`

The keeper loops every 30 seconds calling `SetThreadExecutionState`:
- `ES_CONTINUOUS | ES_SYSTEM_REQUIRED` — system awake
- `ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED` — system + display awake
- `ES_CONTINUOUS` alone (no other flags) — release the lock

On expiry (timed/until modes), keeper calls the release form and exits.

### State management in TypeScript
- Keeper PID stored in Raycast `LocalStorage` as `"keeperPid"`
- On "Let Sleep" or toggle-off: read PID, call `process.kill(pid)` in TS
- On "Awake Status": check if PID process is still running, read stored mode/expiry

### Awake For... UX
- If launched with argument (e.g. `awake-for 40`): skip form, run immediately
- If launched without argument: show a form with a text field pre-focused
- Same for Awake Until

### Screen-Off Mode
`ES_CONTINUOUS | ES_SYSTEM_REQUIRED` without `ES_DISPLAY_REQUIRED` — prevents sleep but does not prevent display timeout.

### Build
```powershell
cd npu-awake-ext\keeper
dotnet publish -c Release -r win-x64 --self-contained true -o ..\assets\bin
```
No sparse package registration needed (no WinRT capability declarations required).

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
1. Run `ImageForegroundExtractor` → get alpha mask (reuse existing bridge logic)
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
