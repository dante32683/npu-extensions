import { Toast, showToast } from "@raycast/api"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { SELECTION_HELPER_PATH } from "./utils/paths"

const execFileAsync = promisify(execFile)

export default async function Command() {
    if (!fs.existsSync(SELECTION_HELPER_PATH)) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Helper missing",
            message: SELECTION_HELPER_PATH,
        })
        return
    }

    try {
        const { stdout } = await execFileAsync(SELECTION_HELPER_PATH, ["noop"], {
            cwd: path.dirname(SELECTION_HELPER_PATH),
            windowsHide: true,
            timeout: 10_000,
        })
        await showToast({
            style: Toast.Style.Success,
            title: "TextSelectionHelper ran",
            message: stdout.trim() || "ok",
        })
    } catch (err: unknown) {
        const e = err as { stderr?: Buffer | string; message?: string; code?: string | number }
        const stderr =
            typeof e.stderr === "string" ? e.stderr : e.stderr != null ? e.stderr.toString("utf8").trim() : ""
        await showToast({
            style: Toast.Style.Failure,
            title: "Helper failed to start",
            message: [e.message, stderr, e.code != null ? `code ${e.code}` : undefined].filter(Boolean).join(" — "),
        })
    }
}
