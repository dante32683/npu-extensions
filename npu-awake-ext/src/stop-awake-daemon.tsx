import { showToast, Toast } from "@raycast/api"
import { stopDaemon } from "./utils/keeper-utils"

export default async function Command() {
    await stopDaemon()
    await showToast({ style: Toast.Style.Success, title: "Awake Daemon Stopped" })
}
