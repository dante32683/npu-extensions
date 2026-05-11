import { showToast, Toast, getPreferenceValues } from "@raycast/api"
import { setOverride } from "./utils/keeper-utils"

interface Preferences {
    showSuccessToasts?: boolean
}

export default async function Command() {
    const prefs = getPreferenceValues<Preferences>()
    const ok = await setOverride(null)
    if (ok && prefs.showSuccessToasts !== false) {
        await showToast({
            style: Toast.Style.Success,
            title: "PC can now sleep",
        })
    }
}
