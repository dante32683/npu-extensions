import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { SELECTION_HELPER_PATH } from "./paths"

const execFileAsync = promisify(execFile)

export type VerifySelectionHelperResult = { ok: true; detail: string } | { ok: false; error: string }

export async function runVerifySelectionHelper(): Promise<VerifySelectionHelperResult> {
    if (!fs.existsSync(SELECTION_HELPER_PATH)) {
        return { ok: false, error: SELECTION_HELPER_PATH }
    }

    try {
        const { stdout } = await execFileAsync(SELECTION_HELPER_PATH, ["noop"], {
            cwd: path.dirname(SELECTION_HELPER_PATH),
            windowsHide: true,
            timeout: 10_000,
        })
        return { ok: true, detail: stdout.trim() || "ok" }
    } catch (err: unknown) {
        const e = err as { stderr?: Buffer | string; message?: string; code?: string | number }
        const stderr =
            typeof e.stderr === "string" ? e.stderr : e.stderr != null ? e.stderr.toString("utf8").trim() : ""
        const error = [e.message, stderr, e.code != null ? `code ${e.code}` : undefined].filter(Boolean).join(" — ")
        return { ok: false, error: error || "Unknown error" }
    }
}
