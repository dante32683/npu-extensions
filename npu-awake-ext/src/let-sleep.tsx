import { showToast, Toast } from "@raycast/api"
import { stopKeeper } from "./utils/keeper-utils"

export default async function Command() {
    await stopKeeper()
    await showToast({
        style: Toast.Style.Success,
        title: "PC can now sleep",
    })
}
