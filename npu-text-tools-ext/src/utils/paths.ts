import path from "path"
import { environment } from "@raycast/api"

export const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")
export const BRIDGE_BIN_DIR = path.join(environment.assetsPath, "bin")
export const BRIDGE_MANIFEST_SOURCE = path.join(environment.assetsPath, "..", "bridge", "Package.appxmanifest")
export const BRIDGE_IDENTITY = "NpuTextToolsBridge.Identity"
/** Framework-dependent helper; see `selection-helper/README` / RUNBOOK for .NET Desktop Runtime. */
export const SELECTION_HELPER_PATH = path.join(
    environment.assetsPath,
    "bin",
    "selection-helper",
    "TextSelectionHelper.exe",
)
