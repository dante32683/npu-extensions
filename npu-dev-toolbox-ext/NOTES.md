# NPU Dev Toolbox — Notes

This extension helps you open the “active workspace” (Explorer folder / IDE / terminal) and can generate commit messages using Phi-Silica.

**Roadmap §1 (suite prefs):** `package.json` includes success toasts (workspace opens + commit flow), `ensureModelReady` / `--ensure-ready` for `phi-commit`, and **Workspace Detection Timeout (ms)** for PowerShell foreground probes in `foreground-context.ts`.

## Terminal launching (Windows Terminal `wt`) — troubleshooting notes

We hit a few Windows-specific quirks while making **`Open Workspace → Open in Terminal`** behave consistently on Win10/Win11.

- **`wt.exe` resolution**
  - On most systems, `wt.exe` resolves to a **0-byte App Execution Alias shim** at `%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe`.
  - This is normal and still launches Windows Terminal, but it means you should **not** treat `wt.exe` as a “real exe with a file size” when debugging.

- **Do not validate PATH commands with `fs.existsSync`**
  - `fs.existsSync("wt.exe")` will always return false unless you pass an absolute path.
  - If you want to verify “is `wt` available”, use `where.exe wt.exe` (or equivalent) instead.

- **Argument placement matters**
  - Use the explicit subcommand form so working directory is applied reliably:
    - `wt.exe ... new-tab -d "<folder>"`
  - `new-tab` options like `-p` (profile) must appear **after** `new-tab`:
    - Good: `wt.exe ... new-tab -p "<profileNameOrGuid>" -d "<folder>"`
    - Bad: `wt.exe -p "<profile>" new-tab ...` (can be ignored, depending on the version)

- **Unexpected GUI “Help” popups**
  - Passing unsupported flags can cause Windows Terminal to show modal “Help” dialogs (instead of printing to stdout). Avoid probing flags in production code paths.

If “wrong profile” issues persist even when Windows Terminal’s default profile is set correctly, use the extension preference **Windows Terminal Profile Name** to force a profile name/GUID.

## Workspace Detection (`foreground-context.ts`)

The detection strategy for "Commit Message" and other workspace-aware commands is **multi-layered**:

1.  **Foreground Window**: Checks the active window (IDE, Terminal, or Explorer).
2.  **All Open Explorers**: If the foreground isn't a Git repo, it scans every open File Explorer window.
3.  **Git Prioritization**: Candidate paths are checked with `git rev-parse --is-inside-work-tree`. The first valid Git repository found is selected.
4.  **Fallback**: If no Git repo is found, it falls back to the foreground window or the most recently interacted folder.

This prevents "detection block" when unrelated folders (like screenshots) are focused while a project is open in another window.

## Phi-Silica / LAF unlock

- **`TryUnlockNpuFeature()` (added 2026-05-10):** `phi-commit` now calls `TryUnlockNpuFeature()` before `LanguageModel.GetReadyState()`. Previously missing, causing "Access is denied / Status: 0". The call is scoped inside `PhiCommit()` (not at Main top) so `cwd-of-pid` is unaffected. See `docs/RUNBOOK.md` § "Phi-Silica Limited Access Feature" for the full token formula — UTF-8 encoding is required.

## Terminal & IDE Launching (`launchers.ts`)

- **Windows Terminal (`wt.exe`)**:
    - Uses `where.exe wt` to find the absolute path if possible.
    - Profiles are supported via `-p "Profile Name"`.
    - Workdir is passed via `-d "path"`.
    - New tabs use the `new-tab` subcommand.
- **IDE Detection**: Uses `describeSource` to label where the path came from (e.g., "VS Code", "Cursor").
