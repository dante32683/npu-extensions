import { Toast, getPreferenceValues, showToast } from "@raycast/api"
import { runReviewSelectionFlow } from "./utils/review-selection-bootstrap"
import { parseQuickRewriteMode, quickRewriteReviewTitle } from "./utils/quick-rewrite-mode"

export default async function Command() {
    const prefs = getPreferenceValues<Preferences.ReviewSelectionQuick>()
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

    await runReviewSelectionFlow({
        mode,
        title: quickRewriteReviewTitle(mode),
        instruction,
    })
}
