import { showToast, Toast, getPreferenceValues } from "@raycast/api"
import { setOverride } from "./utils/keeper-utils"

interface Preferences {
    showSuccessToasts?: boolean
}

export default async function Command() {
    const prefs = getPreferenceValues<Preferences>()
    await setOverride(null)
    if (prefs.showSuccessToasts !== false) {
        await showToast({
            style: Toast.Style.Success,
            title: "PC can now sleep",
        })
    }
}
