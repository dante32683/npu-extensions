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
const BRIDGE_IDENTITY = "NpuOrganizeBridge.Identity"

const BRIDGE_MISSING_HINT =
    "NpuBridge.exe missing. From npu-organize-ext\\bridge run: dotnet publish -c Release -r win-x64 --self-contained true -o ..\\assets\\bin"
const BRIDGE_SPAWN_HINT =
    "Bridge failed to start. Rebuild: cd npu-organize-ext\\bridge && dotnet publish -c Release -r win-x64 --self-contained true -o ..\\assets\\bin"

export type BridgeResult = {
    status: "success" | "error"
    message?: string
    [key: string]: unknown
}

export type ScreenshotTitleResult = {
    status: "success"
    description: string
    confidence: "high" | "low"
    ocrExcerpt: string | null
    elapsedMs: number
}

export type BridgeOutcome<T extends BridgeResult> =
    | { ok: true; result: T }
    | { ok: false; error: string; missing?: boolean }

interface SharedPreferences {
    ensureModelReady?: boolean
}

/**
 * Spawn the NpuOrganize bridge. Returns `ok: false` for any failure (missing
 * exe, non-zero exit, error JSON) so command UIs can render a single toast
 * without ever surfacing a raw exception.
 */
export async function runBridgeCommand(command: string, args: string[]): Promise<BridgeOutcome<BridgeResult>> {
    if (!fs.existsSync(BRIDGE_PATH)) {
        return { ok: false, error: BRIDGE_MISSING_HINT, missing: true }
    }

    try {
        await ensureBridgeRegisteredOnce({
            identityName: BRIDGE_IDENTITY,
            binDir: BRIDGE_BIN_DIR,
            manifestSourcePath: BRIDGE_MANIFEST_SOURCE,
        })

        const prefs = getPreferenceValues<SharedPreferences>()
        const finalArgs = [command, ...args]
        if (prefs.ensureModelReady !== false) {
            finalArgs.push("--ensure-ready")
        }

        const { stdout, stderr } = await execFileAsync(BRIDGE_PATH, finalArgs, {
            cwd: path.dirname(BRIDGE_PATH),
            windowsHide: true,
            maxBuffer: 8 * 1024 * 1024,
        })

        if (stderr) console.error("[NpuOrganizeBridge]", stderr)

        const parsed = JSON.parse(stdout) as BridgeResult
        if (parsed.status === "success") return { ok: true, result: parsed }
        return { ok: false, error: parsed.message ?? "Bridge returned an error without a message." }
    } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code
        if (code === "UNKNOWN") return { ok: false, error: BRIDGE_SPAWN_HINT }
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
}

/** Convenience wrapper for the `screenshot-title` verb. */
export async function describeScreenshot(imagePath: string): Promise<BridgeOutcome<ScreenshotTitleResult>> {
    const outcome = await runBridgeCommand("screenshot-title", [imagePath])
    if (!outcome.ok) return outcome

    const r = outcome.result as Partial<ScreenshotTitleResult>
    if (typeof r.description !== "string" || (r.confidence !== "high" && r.confidence !== "low")) {
        return { ok: false, error: "Bridge returned a malformed screenshot-title payload." }
    }

    return {
        ok: true,
        result: {
            status: "success",
            description: r.description,
            confidence: r.confidence,
            ocrExcerpt: typeof r.ocrExcerpt === "string" ? r.ocrExcerpt : null,
            elapsedMs: typeof r.elapsedMs === "number" ? r.elapsedMs : 0,
        },
    }
}
