import { showToast, Toast } from "@raycast/api"
import { setOverride } from "./utils/keeper-utils"

export default async function Command() {
    await setOverride(null)
    await showToast({
        style: Toast.Style.Success,
        title: "PC can now sleep",
    })
}
