import { showToast, Toast } from "@raycast/api"
import { getKeeperStatus, startKeeper, stopKeeper } from "./utils/keeper-utils"

export default async function Command() {
    const status = await getKeeperStatus()

    if (status && status.mode === "indefinite") {
        await stopKeeper()
        await showToast({
            style: Toast.Style.Success,
            title: "PC can now sleep",
        })
    } else {
        await startKeeper("indefinite")
        await showToast({
            style: Toast.Style.Success,
            title: "PC will stay awake indefinitely",
        })
    }
}
