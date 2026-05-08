import { LocalStorage } from "@raycast/api"

const STORAGE_KEY = "recent-workspaces"
const MAX_RECENT = 20

export async function getRecentWorkspaces(): Promise<string[]> {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY)
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter((p): p is string => typeof p === "string" && p.length > 0).slice(0, MAX_RECENT)
    } catch {
        return []
    }
}

export async function pushRecentWorkspace(folderPath: string): Promise<void> {
    if (!folderPath) return
    const existing = await getRecentWorkspaces()
    const normalized = folderPath.replace(/[\\/]+$/, "")
    const next = [normalized, ...existing.filter(p => p !== normalized)].slice(0, MAX_RECENT)
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export async function removeRecentWorkspace(folderPath: string): Promise<void> {
    const existing = await getRecentWorkspaces()
    const normalized = folderPath.replace(/[\\/]+$/, "")
    const next = existing.filter(p => p !== normalized)
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export async function clearRecentWorkspaces(): Promise<void> {
    await LocalStorage.removeItem(STORAGE_KEY)
}
