import { environment, getPreferenceValues } from "@raycast/api"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { ensureBridgeRegisteredOnce } from "./ensure-bridge-registered"

const execFileAsync = promisify(execFile)

const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")
const BRIDGE_BIN_DIR = path.join(environment.assetsPath, "bin")
const BRIDGE_MANIFEST_SOURCE = path.join(environment.assetsPath, "..", "bridge", "Package.appxmanifest")
const BRIDGE_IDENTITY = "NpuDevToolboxBridge.Identity"

const BRIDGE_MISSING_HINT =
    "NpuBridge.exe missing. Run: dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin"
const BRIDGE_SPAWN_HINT =
    "Bridge failed to start. Rebuild: cd bridge && dotnet publish -c Release -r win-x64 --self-contained true -o ../assets/bin"

export type DevToolboxBridgeResult = {
    status: "success" | "error"
    message?: string
    cwd?: string
    subject?: string
    body?: string
    [key: string]: unknown
}

export type DevToolboxOutcome = { ok: true; result: DevToolboxBridgeResult } | { ok: false; error: string }

interface Preferences {
    ensureModelReady?: boolean
}

// Spawns the dev-toolbox bridge. Returns ok/error rather than throwing so the
// React UI layer can render a Toast.Style.Failure without ever surfacing a raw
// exception to the user.
export async function runDevBridge(command: string, args: string[]): Promise<DevToolboxOutcome> {
    if (!fs.existsSync(BRIDGE_PATH)) {
        return { ok: false, error: BRIDGE_MISSING_HINT }
    }

    try {
        await ensureBridgeRegisteredOnce({
            identityName: BRIDGE_IDENTITY,
            binDir: BRIDGE_BIN_DIR,
            manifestSourcePath: BRIDGE_MANIFEST_SOURCE,
        })

        const prefs = getPreferenceValues<Preferences>()
        const finalArgs = [command, ...args]
        if (prefs.ensureModelReady !== false && command === "phi-commit") {
            finalArgs.push("--ensure-ready")
        }

        const { stdout, stderr } = await execFileAsync(BRIDGE_PATH, finalArgs, {
            cwd: path.dirname(BRIDGE_PATH),
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
        })

        if (stderr) console.error("[NpuBridge]", stderr)

        const parsed = JSON.parse(stdout) as DevToolboxBridgeResult
        if (parsed.status === "success") return { ok: true, result: parsed }
        return { ok: false, error: parsed.message ?? "Bridge returned an error without a message." }
    } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code
        if (code === "UNKNOWN") return { ok: false, error: BRIDGE_SPAWN_HINT }
        const rawStdout = (err as { stdout?: string }).stdout ?? ""
        try {
            const j = JSON.parse(rawStdout.trim()) as { message?: string }
            if (j.message) return { ok: false, error: j.message }
        } catch {
            // stdout wasn't JSON; fall through to raw error
        }
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
}
