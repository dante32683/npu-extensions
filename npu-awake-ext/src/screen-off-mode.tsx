import { showToast, Toast } from "@raycast/api"
import { getKeeperStatus, setOverride } from "./utils/keeper-utils"

export default async function Command() {
    const status = await getKeeperStatus()

    if (status.override && status.override.mode === "screen-off") {
        await setOverride(null)
        await showToast({
            style: Toast.Style.Success,
            title: "PC can now sleep",
        })
    } else {
        await setOverride({ mode: "screen-off" })
        await showToast({
            style: Toast.Style.Success,
            title: "PC awake, display can sleep",
        })
    }
}
