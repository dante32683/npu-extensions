import { showToast, Toast, closeMainWindow, getPreferenceValues } from "@raycast/api"
import { stopKeeper } from "./utils/keeper-control"

interface Preferences {
    showSuccessToasts?: boolean
}

export default async function Command() {
    await closeMainWindow()
    const toast = await showToast({ style: Toast.Style.Animated, title: "Stopping screenshot watcher..." })

    const { stopped, pid } = await stopKeeper()

    const prefs = getPreferenceValues<Preferences>()
    if (!stopped) {
        toast.style = Toast.Style.Success
        toast.title = "No watcher was running"
        if (prefs.showSuccessToasts === false) await toast.hide()
        return
    }

    toast.style = Toast.Style.Success
    toast.title = "Screenshot watcher stopped"
    toast.message = pid ? `PID ${pid}` : undefined
    if (prefs.showSuccessToasts === false) await toast.hide()
}
