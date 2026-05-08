import { environment } from "@raycast/api"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { ensureBridgeRegisteredOnce } from "./ensure-bridge-registered"

const execFileAsync = promisify(execFile)

const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")
const BRIDGE_BIN_DIR = path.join(environment.assetsPath, "bin")
const BRIDGE_MANIFEST_SOURCE = path.join(environment.assetsPath, "..", "bridge", "Package.appxmanifest")
const BRIDGE_IDENTITY = "NpuBridge.Identity"

const BRIDGE_MISSING_HINT =
    "NpuBridge.exe missing. Run: dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin"
const BRIDGE_SPAWN_HINT =
    "Bridge failed to start. Rebuild: cd bridge && dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin"

export type NpuBridgeResult = {
    status: "success" | "error"
    message?: string
    outputPath?: string
    text?: string
    [key: string]: unknown
}

export type NpuCommandOutcome = { ok: true; result: NpuBridgeResult } | { ok: false; error: string }

// Single source of truth for spawning the image-editor NPU bridge. Every command
// (modify-image, super-resolution, extract-text, make-sticker, ...) goes through
// this helper so spawn invariants (cwd, windowsHide), error templates, and
// sparse-package registration stay in one place.
//
// Returns ok/error rather than throwing so the React UI layer can render a
// Toast.Style.Failure without ever surfacing a raw exception to the user.
export async function runNpuCommand(command: string, args: string[]): Promise<NpuCommandOutcome> {
    if (!fs.existsSync(BRIDGE_PATH)) {
        return { ok: false, error: BRIDGE_MISSING_HINT }
    }

    try {
        await ensureBridgeRegisteredOnce({
            identityName: BRIDGE_IDENTITY,
            binDir: BRIDGE_BIN_DIR,
            manifestSourcePath: BRIDGE_MANIFEST_SOURCE,
        })

        const { stdout, stderr } = await execFileAsync(BRIDGE_PATH, [command, ...args], {
            cwd: path.dirname(BRIDGE_PATH),
            windowsHide: true,
        })

        if (stderr) console.error("[NpuBridge]", stderr)

        const parsed = JSON.parse(stdout) as NpuBridgeResult
        if (parsed.status === "success") return { ok: true, result: parsed }
        return { ok: false, error: parsed.message ?? "Bridge returned an error without a message." }
    } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code
        if (code === "UNKNOWN") return { ok: false, error: BRIDGE_SPAWN_HINT }
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
}

export function toFriendlyCommandName(command: string): string {
    return command
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}
