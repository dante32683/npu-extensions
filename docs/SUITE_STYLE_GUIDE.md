# Suite style & UX guide

**Purpose:** Single canonical reference for **user-visible copy**, **Raycast toasts**, **action layout**, **bridge/UI error boundaries**, and **TypeScript / C# hygiene** across all `*-ext` packages. New work must match these rules; drift is tracked as cleanup items in [`FEATURE_PLAN.md`](../FEATURE_PLAN.md) under **Cleanup follow-ups**.

**Audience:** Human contributors and AI-assisted edits. Prefer loading this file over scanning [`FEATURE_PLAN.md`](../FEATURE_PLAN.md) (large planning archive).

**Related:** Tooling workflow in [`CONTRIBUTING.md`](../CONTRIBUTING.md); bridge mechanics in [`RUNBOOK.md`](RUNBOOK.md).

---

## Capitalization

- **Toast titles:** Title Case (e.g., `Upscaling Complete`, `Note Saved`).
- **Toast messages:** Sentence case ending in a period (e.g., `Upscaled 3 image(s).`).
- **Action labels (buttons, menu items):** Title Case (e.g., `Copy to Clipboard`, `Open in Editor`).
- **Form labels:** Title Case. Form descriptions: sentence case.
- **Section headers in `ActionPanel.Section title`:** Title Case (e.g., `NPU Actions (AI)`, `Standard Actions (CPU)`).

## Toast templates

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

## Toast audit tool

`scripts/audit-toasts.mjs` (repo root) scans every `*-ext/src/**/*.{ts,tsx}` for `showToast({...})` calls and `<var>.title|message|style = ...` assignments. Run from repo root:

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

## Action panel ordering (top-to-bottom in every command)

1. **Primary destructive-or-output action** (`Copy to Clipboard`, `Save Note`, `Upscale Images`, `Make Sticker`).
2. **Try Another / Regenerate** (where applicable).
3. **Navigation** (`Open in Editor`, `Open Folder`, `Open Repo in Explorer`).
4. **Selection management** (`Refresh Selection`, `Paste from Clipboard`, `Remove from Selection`).

## Error handling rules (apply to every extension)

- All bridge spawns, file I/O, PowerShell calls, and `git` calls go through one helper per extension (`run-bridge.ts`, `git.ts`, etc.) and that helper **always returns** `{ ok: true, value } | { ok: false, error }` — it does not throw to the UI layer.
- The TS UI layer translates `{ ok: false, error }` into a `Toast.Style.Failure` toast using the template above. **No `throw` reaches the React render path.**
- Bridge `Program.cs` always emits exactly one JSON line on stdout, regardless of error. Stack traces and developer diagnostics go to stderr and are logged with `console.error("[<BridgeName>]", stderr)` in TS — never parsed.
- Input validation lives at the boundary (form `onSubmit`, argv parsing in `Program.cs`) and produces a `Failure` toast / `{ status: "error", ... }` JSON respectively. No deeper helper revalidates.

## Code-cleanliness rules (apply when writing or touching any file)

- **Naming:** TypeScript = `camelCase` for vars/functions, `PascalCase` for components/types. C# = `PascalCase` for public, `_camelCase` for private fields, `camelCase` for locals. No abbreviations except domain ones (`npu`, `ocr`, `cwd`, `pid`, `pii`).
- **Imports:** stdlib (`fs`, `path`, `os`, `child_process`, `util`) → third-party (`@raycast/api`, `jimp`, `@jsquash/*`) → internal (`./utils/*`, `./shared/*`). Sorted alphabetically inside each group. No duplicates. No unused imports.
- **Magic values:** every literal that appears more than once, or that has domain meaning (`2048`, `100_000`, `0x80073CFB`, `"NpuBridge.Identity"`, file suffix strings) becomes a named `const` at the top of the file or in `src/constants.ts`.
- **DRY:** the bridge spawn helper, the WebP encoder init, the JSON-extract helper, the foreground-context detector, and the frontmatter parser each live in **one** place and are imported. Duplicated 2+ times = extract.
- **Dead code:** no commented-out blocks (use git history). No `// TODO` without a link to a planning doc (e.g. [`FEATURE_PLAN.md`](../FEATURE_PLAN.md) or [`FORWARD_ROADMAP.md`](FORWARD_ROADMAP.md)). No stubs that show `WIP` to users — gate them behind a Raycast preference if they must ship before completion.
