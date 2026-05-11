import { Toast, getPreferenceValues, showToast } from "@raycast/api"
import { runPastebackRewrite } from "./utils/selection-rewrite"

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
    await runPastebackRewrite({ mode: "custom", label: "Custom Rewrite", instruction: ins })
}
