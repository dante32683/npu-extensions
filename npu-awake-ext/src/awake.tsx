import { getPreferenceValues, showToast, Toast } from "@raycast/api"
import { getKeeperStatus, setOverride } from "./utils/keeper-utils"

interface Preferences {
    defaultAwakeMode: "indefinite" | "screen-off"
    showSuccessToasts?: boolean
}

export default async function Command() {
    const prefs = getPreferenceValues<Preferences>()
    const { defaultAwakeMode } = prefs
    const status = await getKeeperStatus()

    if (status.override && status.override.mode === defaultAwakeMode && !status.override.expiryEpochSeconds) {
        await setOverride(null)
        if (prefs.showSuccessToasts !== false) {
            await showToast({
                style: Toast.Style.Success,
                title: "PC Can Now Sleep",
            })
        }
    } else {
        await setOverride({ mode: defaultAwakeMode })
        if (prefs.showSuccessToasts !== false) {
            await showToast({
                style: Toast.Style.Success,
                title:
                    defaultAwakeMode === "screen-off"
                        ? "PC Awake, Display Can Sleep"
                        : "PC Will Stay Awake Indefinitely",
            })
        }
    }
}
