# NPU Dev Toolbox Notes

## Workspace Detection (`foreground-context.ts`)

The detection strategy for "Commit Message" and other workspace-aware commands is **multi-layered**:

1.  **Foreground Window**: Checks the active window (IDE, Terminal, or Explorer).
2.  **All Open Explorers**: If the foreground isn't a Git repo, it scans every open File Explorer window.
3.  **Git Prioritization**: Candidate paths are checked with `git rev-parse --is-inside-work-tree`. The first valid Git repository found is selected.
4.  **Fallback**: If no Git repo is found, it falls back to the foreground window or the most recently interacted folder.

This prevents "detection block" when unrelated folders (like screenshots) are focused while a project is open in another window.

## Terminal & IDE Launching (`launchers.ts`)

- **Windows Terminal (`wt.exe`)**:
    - Uses `where.exe wt` to find the absolute path if possible.
    - Profiles are supported via `-p "Profile Name"`.
    - Workdir is passed via `-d "path"`.
    - New tabs use the `new-tab` subcommand.
- **IDE Detection**: Uses `describeSource` to label where the path came from (e.g., "VS Code", "Cursor").
