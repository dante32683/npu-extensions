# NPU Notes — maintenance notes

Extension-specific notes for **`npu-notes-ext`**.

- **Implementation:** `add-note` and `browse-notes` are live.
- **Bridge:** `bridge/Program.cs` handles `phi-note`. It uses Phi-Silica to clean up sloppy text and categorize it.
- **Sparse Identity:** `NpuNotesBridge.Identity` (see `Package.appxmanifest`).
- **Storage:** Notes are saved as Markdown files with YAML frontmatter in `Documents\RaycastNotes` (configurable in preferences).
- **Categories:** The bridge suggests categories (work, school, personal, tasks, ideas, health, finance, people, projects, misc) and the extension creates subfolders automatically.
- **Frontmatter:** The `raw` field in the frontmatter preserves the original unedited text.

### Implementation Details
- **Bridge JSON:** Phi-Silica occasionally includes markdown code blocks in its JSON response. `Program.cs` includes a robust extraction helper to find the `{}` block.
- **Icon Fix:** Used `Icon.Checkmark` for the save action as `Icon.Save` is not available in the Raycast API.

- **Planning:** `FEATURE_PLAN.md` §4 (Smart Note Taker).
- **Suite workflow:** `CONTRIBUTING.md`, `EXTENSION_REGISTRY.md`, `docs/RUNBOOK.md`.
