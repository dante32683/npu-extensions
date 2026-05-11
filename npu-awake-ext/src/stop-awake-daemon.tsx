import { getPreferenceValues, showToast, Toast } from "@raycast/api"
import { stopDaemon } from "./utils/keeper-utils"

interface Prefs {
    showSuccessToasts?: boolean
}

export default async function Command() {
    const prefs = getPreferenceValues<Prefs>()
    await stopDaemon()
    if (prefs.showSuccessToasts !== false) {
        await showToast({ style: Toast.Style.Success, title: "Awake Daemon Stopped" })
    }
}
