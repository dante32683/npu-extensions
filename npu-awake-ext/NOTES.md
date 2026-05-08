# NPU Awake — maintenance notes

Extension-specific notes for **`npu-awake-ext`**.

- **Planning:** `FEATURE_PLAN.md` §5 (Awake).
- **Native helper:** `keeper/` — **not** a sparse Copilot bridge; uses Win32 keep-awake patterns. Publish target and exe name per `AwakeKeeper.csproj`; see plan for CLI sketch.
- **Suite workflow:** `CONTRIBUTING.md`, `EXTENSION_REGISTRY.md` (this extension has no `systemAIModels` sparse package).
