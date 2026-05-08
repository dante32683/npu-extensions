import { LocalStorage } from "@raycast/api"
import { getAnyExplorerPath } from "./explorer"

const STORAGE_KEY = "last-explorer-folder"

export async function getLastExplorerFolder(): Promise<string | null> {
    const live = await getAnyExplorerPath()
    if (live) {
        await LocalStorage.setItem(STORAGE_KEY, live)
        return live
    }

    const stored = await LocalStorage.getItem<string>(STORAGE_KEY)
    return stored && stored.length > 0 ? stored : null
}

export async function setLastExplorerFolder(folderPath: string): Promise<void> {
    if (!folderPath) return
    await LocalStorage.setItem(STORAGE_KEY, folderPath)
}
