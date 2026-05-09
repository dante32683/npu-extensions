# NPU Notes — maintenance notes

Extension-specific notes for **`npu-notes-ext`**.

- **Commands:** `add-note`, `browse-notes`, `find-related`, `search-notes`.
- **Bridge:** `bridge/Program.cs` handles `phi-note`, `phi-related`, and `phi-search-relevance`. It uses Phi-Silica for formatting/classification and for small, schema-validated relatedness checks.
- **Sparse Identity:** `NpuNotesBridge.Identity` (see `Package.appxmanifest`).
- **Storage:** Notes are saved as Markdown files with YAML frontmatter in `Documents\RaycastNotes` (configurable in preferences).
- **Categories:** The bridge suggests categories (work, school, personal, tasks, ideas, health, finance, people, projects, misc) and the extension creates subfolders automatically.
- **Frontmatter:** The `raw` field in the frontmatter preserves the original unedited text.
  - `Add Note` can optionally prefill from clipboard via the `prefillFromClipboard` preference (disabled by default).
  - `Browse Notes` supports deleting a note via **`Ctrl+D`** (with confirmation). Deletion moves the file to the Windows **Recycle Bin** (not permanent).

### Implementation Details
- **Bridge JSON:** Phi-Silica occasionally includes markdown code blocks in its JSON response. `Program.cs` includes a robust extraction helper to find the `{}` block.
- **Icon Fix:** Used `Icon.Checkmark` for the save action as `Icon.Save` is not available in the Raycast API.
- **Phi dependency pitfall (important):** If Phi features suddenly start failing in only this extension with a "Limited Access Feature" / `com.microsoft.windows.ai.languagemodel` error, confirm the `assets/bin` `Microsoft.Windows.AI.Text.dll` version matches the known-good Phi bridge baseline (see `docs/RUNBOOK.md` troubleshooting). A stale or mismatched Windows App SDK AI/Text runtime in `assets/bin` can cause spurious access-denied failures.

- **Forward work (clean summary):** `docs/FORWARD_ROADMAP.md` §1 (SDK alignment) and §4 (AppContentIndexer / RAG).
- **Planning archive:** `FEATURE_PLAN.md` §4 (Smart Note Taker) and §10 (full AppContentIndexer audit + integration narrative). **API refs:** `docs/RAG_INFO.md`, `docs/INDEX_INFO.md`.
- **Suite workflow:** `CONTRIBUTING.md`, `EXTENSION_REGISTRY.md`, `docs/RUNBOOK.md`.

### Implementation status (brief)

- **`search-notes`:** Keyword search + **Phi-Silica** `phi-search-relevance` for semantic-style hits when keyword results are scarce (see §10 audit for exact caps and ordering).
- **`find-related`:** **Phi-Silica** `phi-related` over up to 20 recent candidates; results are **not** written to note frontmatter.
- **`add-note`:** **No** post-save linking and **no** `related:` field yet — still per §10 spec + §10 integration checklist.
- **Convention:** Bridge spawn paths and `ensureBridgeRegisteredOnce` match other suite bridges; bridge argv glue is **duplicated** across TS files until a local `run-bridge`-style helper is added (planned in §10).
