import { Toast, getPreferenceValues, showToast } from "@raycast/api"
import { parseQuickRewriteMode, quickRewritePasteLabel } from "./utils/quick-rewrite-mode"
import { runPastebackRewrite } from "./utils/selection-rewrite"

export default async function Command() {
    const prefs = getPreferenceValues<Preferences.PasteSelectionQuick>()
    const mode = parseQuickRewriteMode(prefs.quickRewriteMode)
    const instruction = mode === "custom" ? (prefs.quickCustomInstruction ?? "").trim() : undefined
    if (mode === "custom" && !instruction) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Quick instruction missing",
            message: "Set Quick custom instruction in extension preferences when Quick rewrite mode is Custom.",
        })
        return
    }

    await runPastebackRewrite({
        mode,
        label: quickRewritePasteLabel(mode),
        instruction,
    })
}
