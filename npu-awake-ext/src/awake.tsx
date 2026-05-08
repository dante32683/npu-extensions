import { getPreferenceValues, showToast, Toast } from "@raycast/api"
import { getKeeperStatus, setOverride } from "./utils/keeper-utils"

interface Preferences {
    defaultAwakeMode: "indefinite" | "screen-off"
}

export default async function Command() {
    const { defaultAwakeMode } = getPreferenceValues<Preferences>()
    const status = await getKeeperStatus()

    if (status.override && status.override.mode === defaultAwakeMode && !status.override.expiryEpochSeconds) {
        await setOverride(null)
        await showToast({
            style: Toast.Style.Success,
            title: "PC Can Now Sleep",
        })
    } else {
        await setOverride({ mode: defaultAwakeMode })
        await showToast({
            style: Toast.Style.Success,
            title:
                defaultAwakeMode === "screen-off" ? "PC Awake, Display Can Sleep" : "PC Will Stay Awake Indefinitely",
        })
    }
}
