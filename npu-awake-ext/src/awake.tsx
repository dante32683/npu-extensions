import { getPreferenceValues, showToast, Toast } from "@raycast/api"
import { getKeeperStatus, setOverride } from "./utils/keeper-utils"

interface Preferences {
    defaultAwakeMode: "indefinite" | "screen-off"
    showSuccessToasts?: boolean
}

export default async function Command() {
    try {
        const prefs = getPreferenceValues<Preferences>()
        const defaultAwakeMode: Preferences["defaultAwakeMode"] =
            prefs.defaultAwakeMode === "screen-off" ? "screen-off" : "indefinite"
        const status = await getKeeperStatus()

        if (status.override && status.override.mode === defaultAwakeMode && !status.override.expiryEpochSeconds) {
            const ok = await setOverride(null)
            if (ok && prefs.showSuccessToasts !== false) {
                await showToast({
                    style: Toast.Style.Success,
                    title: "PC Can Now Sleep",
                })
            }
        } else {
            const ok = await setOverride({ mode: defaultAwakeMode })
            if (ok && prefs.showSuccessToasts !== false) {
                await showToast({
                    style: Toast.Style.Success,
                    title:
                        defaultAwakeMode === "screen-off"
                            ? "PC Awake, Display Can Sleep"
                            : "PC Will Stay Awake Indefinitely",
                })
            }
        }
    } catch (err) {
        const detail = err instanceof Error ? err.message : String(err)
        await showToast({
            style: Toast.Style.Failure,
            title: "Awake Failed",
            message: `Something went wrong (${detail}). Open Awake Dashboard or reinstall the extension if this continues.`,
        })
    }
}
