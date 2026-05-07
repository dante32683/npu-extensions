import { Toast, showToast } from "@raycast/api"

export async function showAwakePendingToast(title: string) {
    await showToast({
        style: Toast.Style.Failure,
        title,
        message: "AwakeKeeper integration is scaffolded; implementation is tracked in FEATURE_PLAN.md.",
    })
}
