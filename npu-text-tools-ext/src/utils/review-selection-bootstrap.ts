import { Toast, getPreferenceValues, launchCommand, LaunchType, showToast } from "@raycast/api"
import type { PhiRewriteMode } from "./phi-rewrite-bridge"
import { runPhiRewriteBridge } from "./phi-rewrite-bridge"
import { captureSelectedText, restoreUserClipboard, type SelectionPrefs } from "./selection-rewrite"

export async function runReviewSelectionFlow(options: {
    mode: PhiRewriteMode
    title: string
    instruction?: string
}): Promise<void> {
    const prefs = getPreferenceValues<SelectionPrefs>()
    const ensureReady = prefs.ensureModelReady !== false
    let clipboardBackup: string | null = null

    try {
        const cap = await captureSelectedText(prefs)
        clipboardBackup = cap.restoreClipboard
        if (!cap.ok) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Selection",
                message: cap.message,
            })
            return
        }

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: options.title,
            message: "Running Phi-Silica…",
        })

        const rewritten = await runPhiRewriteBridge({
            mode: options.mode,
            text: cap.text,
            instruction: options.instruction,
            ensureModelReady: ensureReady,
        })

        const sourcePreview = cap.text.length > 600 ? `${cap.text.slice(0, 600)}…` : cap.text

        await toast.hide()

        await launchCommand({
            name: "review-selection-pane",
            type: LaunchType.UserInitiated,
            context: {
                title: options.title,
                rewritten,
                sourcePreview,
                restoreClipboard: cap.restoreClipboard,
            },
        })
    } catch (e) {
        await restoreUserClipboard(clipboardBackup)
        await showToast({
            style: Toast.Style.Failure,
            title: "Phi-Silica Error",
            message: e instanceof Error ? e.message : String(e),
        })
    }
}
