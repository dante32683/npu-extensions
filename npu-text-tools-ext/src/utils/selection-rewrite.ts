import {
    Clipboard,
    Toast,
    closeMainWindow,
    getPreferenceValues,
    getSelectedText,
    showHUD,
    showToast,
} from "@raycast/api"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { randomBytes } from "crypto"
import { PhiRewriteMode, runPhiRewriteBridge } from "./phi-rewrite-bridge"
import { parseCopyDelayMs, parseFocusPollMaxMs, type SelectionPrefs } from "./selection-prefs"
import { SELECTION_HELPER_PATH } from "./paths"

function formatHelperSpawnError(err: unknown): string {
    const e = err as { code?: string | number; stderr?: Buffer | string; message?: string }
    const stderr = typeof e.stderr === "string" ? e.stderr : e.stderr != null ? e.stderr.toString("utf8").trim() : ""
    const exit2 = e.code === 2 || e.code === "2"
    const parts = [
        exit2
            ? "TextSelectionHelper: Raycast kept the foreground window — Copy/Paste never reached your editor."
            : undefined,
        `Could not complete helper (${SELECTION_HELPER_PATH}).`,
        e.message,
        stderr ? stderr : undefined,
        e.code != null && !exit2 ? `exit ${e.code}` : undefined,
        exit2
            ? undefined
            : "If the exe fails to start, install **.NET 8 Desktop Runtime (x64)** or publish self-contained — see selection-helper/README.md.",
    ].filter(Boolean)
    return parts.join("\n")
}

const execFileAsync = promisify(execFile)

const MAX_SELECTION_CHARS = 250_000

export type { SelectionPrefs } from "./selection-prefs"

let pastebackInFlight = false

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function runSelectionHelper(arg: "send-copy" | "send-paste", maxForegroundWaitMs: number): Promise<void> {
    if (!fs.existsSync(SELECTION_HELPER_PATH)) {
        throw new Error(
            `TextSelectionHelper.exe is missing at:\n${SELECTION_HELPER_PATH}\n\nPublish from the repo:\ndotnet publish npu-text-tools-ext/selection-helper/TextSelectionHelper.csproj -c Release -r win-x64 --self-contained false -o npu-text-tools-ext/assets/bin/selection-helper\n\nThen reload this extension in Raycast (dev: the folder Raycast imports must contain that path under assets/bin/).`,
        )
    }
    try {
        await execFileAsync(SELECTION_HELPER_PATH, [arg, String(maxForegroundWaitMs)], {
            cwd: path.dirname(SELECTION_HELPER_PATH),
            windowsHide: true,
            timeout: 20_000,
        })
    } catch (err) {
        throw new Error(formatHelperSpawnError(err))
    }
}

export type CaptureSelectedTextOptions = {
    /** Set when Raycast was already dismissed (e.g. tests); normally we close first so Ctrl+C hits the prior app. */
    skipDismissRaycast?: boolean
}

const captureFailHint =
    "No text captured. Select text, run again, and ensure the editor regains focus after Raycast closes — or raise “Focus wait (max)” / “Selection copy delay”. If this persists, your app may not expose selection to the OS (fallback uses Ctrl+C)."

/** Raycast can read the prior app’s selection after the root window closes — no SendKeys copy. */
async function tryGetSelectedTextFromOs(): Promise<string | null> {
    try {
        const t = await getSelectedText()
        const trimmed = t.trim()
        return trimmed.length > 0 ? t : null
    } catch {
        return null
    }
}

async function captureSelectedTextOnce(
    prefs: SelectionPrefs,
    skipDismissRaycast: boolean,
    focusPollMax: number,
): Promise<
    | {
          ok: true
          text: string
          restoreClipboard: string | null
      }
    | { ok: false; message: string; restoreClipboard: string | null }
> {
    let restoreClipboard: string | null = null
    try {
        const prior = await Clipboard.readText().catch(() => undefined)
        restoreClipboard = prior ?? null
    } catch {
        restoreClipboard = null
    }

    if (!skipDismissRaycast) {
        await closeMainWindow({ clearRootSearch: true })
        await sleep(220)
    }

    const fromRaycast = await tryGetSelectedTextFromOs()
    if (fromRaycast !== null) {
        if (fromRaycast.length > MAX_SELECTION_CHARS) {
            return {
                ok: false,
                message: `Selection is too long (max ${MAX_SELECTION_CHARS} characters).`,
                restoreClipboard,
            }
        }
        return { ok: true, text: fromRaycast, restoreClipboard }
    }

    const sentinel = `__NPU_SEL_${randomBytes(16).toString("hex")}__`
    await Clipboard.copy(sentinel)

    try {
        await runSelectionHelper("send-copy", focusPollMax)
    } catch (e) {
        if (restoreClipboard !== null) await Clipboard.copy(restoreClipboard)
        else await Clipboard.clear().catch(() => undefined)
        return {
            ok: false,
            message: e instanceof Error ? e.message : String(e),
            restoreClipboard,
        }
    }
    await sleep(parseCopyDelayMs(prefs))

    let captured: string | null = null
    try {
        const clip = await Clipboard.readText()
        captured = clip ?? null
    } catch {
        captured = null
    }

    if (captured === null || captured === sentinel) {
        if (restoreClipboard !== null) await Clipboard.copy(restoreClipboard)
        else await Clipboard.clear().catch(() => undefined)
        return {
            ok: false,
            message: captureFailHint,
            restoreClipboard,
        }
    }

    if (captured.length > MAX_SELECTION_CHARS) {
        if (restoreClipboard !== null) await Clipboard.copy(restoreClipboard)
        else await Clipboard.clear().catch(() => undefined)
        return {
            ok: false,
            message: `Selection is too long (max ${MAX_SELECTION_CHARS} characters).`,
            restoreClipboard,
        }
    }

    return { ok: true, text: captured, restoreClipboard }
}

/**
 * Dismisses Raycast (unless skipped), then tries **getSelectedText()** (OS selection, no Ctrl+C).
 * If that fails, falls back to sentinel clipboard + TextSelectionHelper **send-copy**.
 * Retries once without re-closing if the first attempt fails (timing / focus race).
 */
export async function captureSelectedText(
    prefs: SelectionPrefs,
    options?: CaptureSelectedTextOptions,
): Promise<
    | {
          ok: true
          text: string
          restoreClipboard: string | null
      }
    | { ok: false; message: string; restoreClipboard: string | null }
> {
    const focusPollMax = parseFocusPollMaxMs(prefs)

    if (options?.skipDismissRaycast) {
        return captureSelectedTextOnce(prefs, true, focusPollMax)
    }

    const first = await captureSelectedTextOnce(prefs, false, focusPollMax)
    if (first.ok) return first

    await sleep(450)
    return captureSelectedTextOnce(prefs, true, focusPollMax)
}

export async function restoreUserClipboard(restoreClipboard: string | null): Promise<void> {
    try {
        if (restoreClipboard !== null) await Clipboard.copy(restoreClipboard)
        else await Clipboard.clear()
    } catch {
        /* ignore */
    }
}

export type PastebackOptions = {
    mode: PhiRewriteMode
    /** Toast / HUD titles */
    label: string
    instruction?: string
}

/**
 * Headless flow: capture → rewrite → close Raycast → paste into prior foreground → restore clipboard.
 */
export async function runPastebackRewrite(options: PastebackOptions): Promise<void> {
    if (pastebackInFlight) {
        await showHUD("Another selection rewrite is already running.")
        return
    }
    pastebackInFlight = true

    const prefs = getPreferenceValues<SelectionPrefs>()
    const ensureReady = prefs.ensureModelReady !== false

    let restoreClipboard: string | null = null
    let phiToast: Awaited<ReturnType<typeof showToast>> | undefined

    try {
        const cap = await captureSelectedText(prefs)
        restoreClipboard = cap.restoreClipboard
        if (!cap.ok) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Selection",
                message: cap.message,
            })
            return
        }

        phiToast = await showToast({
            style: Toast.Style.Animated,
            title: options.label,
            message: "Running Phi-Silica…",
        })

        const result = await runPhiRewriteBridge({
            mode: options.mode,
            text: cap.text,
            instruction: options.instruction,
            ensureModelReady: ensureReady,
        })

        await phiToast.hide()
        await Clipboard.copy(result)
        await closeMainWindow({ clearRootSearch: true })
        await sleep(80)
        await runSelectionHelper("send-paste", parseFocusPollMaxMs(prefs))
        await sleep(parseCopyDelayMs(prefs))
        await restoreUserClipboard(restoreClipboard)

        if (prefs.showSuccessToasts !== false) {
            await showToast({
                style: Toast.Style.Success,
                title: "Done",
                message: options.label,
            })
        }
    } catch (err: unknown) {
        await restoreUserClipboard(restoreClipboard)
        await phiToast?.hide()
        await showToast({
            style: Toast.Style.Failure,
            title: "Phi-Silica Error",
            message: err instanceof Error ? err.message : String(err),
        })
    } finally {
        pastebackInFlight = false
    }
}

export async function pasteRewrittenAtSelection(rewritten: string, restoreClipboard: string | null): Promise<void> {
    const prefs = getPreferenceValues<SelectionPrefs>()
    const focusPollMax = parseFocusPollMaxMs(prefs)
    await Clipboard.copy(rewritten)
    await closeMainWindow({ clearRootSearch: true })
    await sleep(80)
    await runSelectionHelper("send-paste", focusPollMax)
    await sleep(parseCopyDelayMs(prefs))
    await restoreUserClipboard(restoreClipboard)
}
