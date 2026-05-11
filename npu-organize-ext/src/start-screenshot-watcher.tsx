import { showToast, Toast, closeMainWindow, getPreferenceValues } from "@raycast/api"
import { startKeeper } from "./utils/keeper-control"

interface Preferences {
    showSuccessToasts?: boolean
}

export default async function Command() {
    await closeMainWindow()
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting screenshot watcher..." })

    const outcome = await startKeeper()
    if (outcome.ok) {
        const prefs = getPreferenceValues<Preferences>()
        if (prefs.showSuccessToasts !== false) {
            toast.style = Toast.Style.Success
            toast.title = "Screenshot watcher started"
            toast.message = `PID ${outcome.pid}`
        } else {
            await toast.hide()
        }
        return
    }

    toast.style = Toast.Style.Failure
    switch (outcome.reason) {
        case "keeper-missing":
            toast.title = "Keeper not built"
            toast.message =
                "From npu-organize-ext\\keeper run: dotnet publish -c Release -r win-x64 --self-contained true -o ..\\assets\\bin"
            break
        case "bridge-missing":
            toast.title = "Bridge not built"
            toast.message =
                "From npu-organize-ext\\bridge: dotnet publish -c Release -r win-x64 --self-contained true -o ..\\assets\\bin"
            break
        case "watch-folder-missing":
            toast.title = "Screenshots folder does not exist"
            toast.message = outcome.detail ?? ""
            break
        case "spawn-failed":
            toast.title = "Failed to start watcher"
            toast.message = outcome.detail ?? "spawn() returned no pid"
            break
    }
}
