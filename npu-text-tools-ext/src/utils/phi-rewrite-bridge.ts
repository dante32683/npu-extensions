import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import os from "os"
import { ensureBridgeRegisteredOnce } from "./ensure-bridge-registered"
import { BRIDGE_BIN_DIR, BRIDGE_IDENTITY, BRIDGE_MANIFEST_SOURCE, BRIDGE_PATH } from "./paths"

const execFileAsync = promisify(execFile)

export type PhiRewriteMode = "grammar" | "formal" | "concise" | "bullets" | "simplify" | "custom"

export type RunPhiRewriteOptions = {
    mode: PhiRewriteMode
    /** Plain text for non-custom modes */
    text: string
    instruction?: string
    ensureModelReady: boolean
    /** Bridge stdout / stderr capture; default 5 minutes for cold model load */
    timeoutMs?: number
}

export async function runPhiRewriteBridge(options: RunPhiRewriteOptions): Promise<string> {
    const { mode, text, instruction, ensureModelReady } = options
    const timeoutMs = options.timeoutMs ?? 300_000

    if (!text.trim()) {
        throw new Error("No text to rewrite.")
    }

    let customInstruction: string | undefined
    if (mode === "custom") {
        customInstruction = (instruction ?? "").trim()
        if (!customInstruction) throw new Error("Custom rewrite requires an instruction.")
    }

    if (!fs.existsSync(BRIDGE_PATH)) {
        throw new Error("Bridge not found. Run: dotnet publish -c Release -r win-x64 --self-contained true.")
    }

    let tempFile: string | null = null
    try {
        tempFile = path.join(os.tmpdir(), `phi-rewrite-${Date.now()}.tmp`)

        if (mode === "custom") {
            fs.writeFileSync(tempFile, JSON.stringify({ instruction: customInstruction, text }), "utf8")
        } else {
            fs.writeFileSync(tempFile, text, "utf8")
        }

        await ensureBridgeRegisteredOnce({
            identityName: BRIDGE_IDENTITY,
            binDir: BRIDGE_BIN_DIR,
            manifestSourcePath: BRIDGE_MANIFEST_SOURCE,
        })

        const args = ["phi-rewrite", mode, tempFile]
        if (ensureModelReady) {
            args.push("--ensure-ready")
        }

        const { stdout } = await execFileAsync(BRIDGE_PATH, args, {
            cwd: path.dirname(BRIDGE_PATH),
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
            timeout: timeoutMs,
        }).catch((err: unknown) => {
            const raw = (err as { stdout?: string }).stdout ?? ""
            try {
                const j = JSON.parse(raw.trim()) as { message?: string }
                if (j.message) throw new Error(j.message)
            } catch (e) {
                if (e instanceof SyntaxError) throw err
                throw e
            }
            throw err
        })

        const parsed = JSON.parse(stdout.trim()) as { status?: string; result?: string; message?: string }
        if (parsed.status !== "success") throw new Error(parsed.message ?? "Unknown bridge error")
        if (typeof parsed.result !== "string") throw new Error("Bridge returned no result text.")
        return parsed.result
    } finally {
        if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
    }
}
