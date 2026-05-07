import { showAwakePendingToast } from "./shared/showAwakePendingToast"

export default async function Command() {
    await showAwakePendingToast("Let Sleep pending")
}
