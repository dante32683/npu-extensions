import { showAwakePendingToast } from "./shared/showAwakePendingToast"

export default async function Command() {
    await showAwakePendingToast("Screen-Off Mode pending")
}
