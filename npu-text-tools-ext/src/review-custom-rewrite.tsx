import { Toast, getPreferenceValues, showToast } from "@raycast/api"
import { runReviewSelectionFlow } from "./utils/review-selection-bootstrap"

export default async function Command() {
    const p = getPreferenceValues<{ quickCustomInstruction?: string }>()
    const ins = (p.quickCustomInstruction ?? "").trim()
    if (!ins) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Quick custom instruction missing",
            message: "Set it in extension preferences, then try again.",
        })
        return
    }
    await runReviewSelectionFlow({
        mode: "custom",
        title: "Custom Rewrite (Review Selection)",
        instruction: ins,
    })
}
