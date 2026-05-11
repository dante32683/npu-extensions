import { showToast, Toast, getPreferenceValues } from "@raycast/api"
import { getKeeperStatus, setOverride } from "./utils/keeper-utils"

interface Preferences {
    showSuccessToasts?: boolean
}

export default async function Command() {
    const prefs = getPreferenceValues<Preferences>()
    const status = await getKeeperStatus()

    if (status.override && status.override.mode === "screen-off") {
        await setOverride(null)
        if (prefs.showSuccessToasts !== false) {
            await showToast({
                style: Toast.Style.Success,
                title: "PC can now sleep",
            })
        }
    } else {
        await setOverride({ mode: "screen-off" })
        if (prefs.showSuccessToasts !== false) {
            await showToast({
                style: Toast.Style.Success,
                title: "PC awake, display can sleep",
            })
        }
    }
}
