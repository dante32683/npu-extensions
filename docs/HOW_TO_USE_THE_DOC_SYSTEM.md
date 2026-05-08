# How to use the documentation system

This file is **for people** using the repo with Cursor, Claude Code, Gemini, Codex, etc. It is excluded from **automatic** AI context via tool-specific ignore files where they exist:

- **Cursor** — **`.cursorignore`** ([docs](https://cursor.com/docs/context/ignore-files)). Cursor does **not** use `.agentignore` for this.
- **Claude Code** — **`.claudeignore`** (when supported by your install).
- **Gemini** — **`.geminiignore`** (when your Gemini integration respects it).
- **`.agentignore`** — not a universal standard; some tools may ignore it, **Codex does not document a built-in `.agentignore`** as of early 2026 (see [OpenAI Codex discussions on excluding files](https://github.com/openai/codex/issues)). Treat it as a reserved/convention file for future tooling.

The goal: avoid loading this *meta* guide into context every session; point models at **`CONTRIBUTING.md`**, stubs, **`RUNBOOK`**, etc., instead.

Open this in your editor when onboarding or when you forget the workflow.

---

## What each file is for

| File | Who uses it | Purpose |
|------|-------------|--------|
| **`FEATURE_PLAN.md`** | Everyone | **Primary planning database** — roadmap, specs, struck-through history. Don’t permanently delete old text; strike through and date. |
| **`EXTENSION_REGISTRY.md`** | Everyone | **Facts** — which folder has a bridge, sparse package `Identity` names, publish rules. |
| **`CONTRIBUTING.md`** | Humans + agents | **Workflow** — quick start, build commands, style, **what to update after a change** (CHANGELOG, registry, NOTES, plan, runbook). |
| **`docs/RUNBOOK.md`** | Humans + agents | **Technical depth** — bridge pattern, Phi / `LanguageModel`, WinRT pitfalls, troubleshooting. |
| **`CHANGELOG.md`** | Humans + agents | Short **release-style** notes; not a replacement for FEATURE_PLAN history. |
| **`<extension>/NOTES.md`** | Humans + agents | **Extension-local** quirks, IPC reminders, pointers to plan sections. |
| **`AGENTS.md`**, **`CLAUDE.md`**, **`GEMINI.md`** (repo root) | Auto-loaded by some tools | **Tiny stubs** — links into CONTRIBUTING + RUNBOOK + registry. Don’t turn them back into long manuals. |

---

## Typical workflows

### Starting work on a feature

1. Read the relevant part of **`FEATURE_PLAN.md`** (one section is enough).
2. Read **`EXTENSION_REGISTRY.md`** if you touch bridges or registration.
3. Open **`<extension>/NOTES.md`** for that extension.

### Debugging bridges / Phi / WinRT

1. **`docs/RUNBOOK.md`** (troubleshooting + patterns).
2. The extension’s **`bridge/Program.cs`** and the TypeScript spawn site.

### After you finish a change set

Follow **`CONTRIBUTING.md`** → *After you finish a change set*. At minimum: **`CHANGELOG.md`**, and update **registry** / **NOTES** / **FEATURE_PLAN** when applicable.

---

## Working with multiple AIs

- **Don’t rely on “memory” in each product** for facts—put facts in **`EXTENSION_REGISTRY.md`**, **`docs/RUNBOOK.md`**, **`FEATURE_PLAN.md`**, or **NOTES**.
- **Stubs** exist so each vendor’s default filename still loads **something**, but it’s intentionally short.
- You can always paste: *“Follow `CONTRIBUTING.md` doc map; then read FEATURE_PLAN §X and `<ext>/NOTES.md`.”*

---

## Token efficiency (practical)

- **Narrow first:** NOTES + registry + the files you’re editing; only open **`RUNBOOK`** when you hit bridge/WinRT issues; only skim **`FEATURE_PLAN`** sections you need.
- **Avoid** “read the entire FEATURE_PLAN” in one prompt unless you’re doing portfolio-wide planning.
- This **how-to** file is listed in **`.cursorignore`**, **`.geminiignore`**, **`.claudeignore`**, and **`.agentignore`** so it is less likely to inflate automatic context—read it locally, then point models at the real docs.

---

## Adding a new extension or bridge

1. **`EXTENSION_REGISTRY.md`** — new row.
2. **`register-bridge.ps1`** — if sparse registration is needed.
3. **`<new-ext>/NOTES.md`** — create with pointers.
4. **`FEATURE_PLAN.md`** — document intent / lessons.
5. **`CHANGELOG.md`** — bullet under `[Unreleased]`.

Details: **`CONTRIBUTING.md`**.
