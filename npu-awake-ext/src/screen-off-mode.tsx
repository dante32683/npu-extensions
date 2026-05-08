import { showToast, Toast } from "@raycast/api"
import { getKeeperStatus, startKeeper, stopKeeper } from "./utils/keeper-utils"

export default async function Command() {
    const status = await getKeeperStatus()

    if (status && status.mode === "screen-off") {
        await stopKeeper()
        await showToast({
            style: Toast.Style.Success,
            title: "PC can now sleep",
        })
    } else {
        await startKeeper("screen-off")
        await showToast({
            style: Toast.Style.Success,
            title: "PC awake, display can sleep",
        })
    }
}
