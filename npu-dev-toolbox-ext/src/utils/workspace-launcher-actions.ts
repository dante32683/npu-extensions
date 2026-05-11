import { getPreferenceValues, showToast, Toast } from "@raycast/api"
import { pushRecentWorkspace } from "./recent-workspaces"
import { LauncherOutcome, LauncherPrefs, openAll, openInExplorer, openInIde, openInTerminal } from "./launchers"

export type WorkspaceActionKey = "ide" | "terminal" | "explorer" | "all"
export type WorkspaceDefaultTarget = WorkspaceActionKey

export const WORKSPACE_ACTION_LABELS: Record<WorkspaceActionKey, string> = {
    ide: "Open in IDE",
    terminal: "Open in Terminal",
    explorer: "Open in Explorer",
    all: "Open All",
}

export type WorkspaceLauncherPrefs = LauncherPrefs & {
    defaultOpenTarget: WorkspaceDefaultTarget
    showSuccessToasts?: boolean
}

export function getWorkspaceLauncherPrefs(): WorkspaceLauncherPrefs {
    const prefs = getPreferenceValues<Preferences>()
    return {
        defaultOpenTarget: prefs.defaultOpenTarget as WorkspaceDefaultTarget,
        terminalChoice: prefs.terminalChoice,
        terminalNewTab: Boolean(prefs.terminalNewTab),
        wtProfileName: prefs.wtProfileName ?? "",
        terminalCustomPath: prefs.terminalCustomPath ?? "",
        ideChoice: prefs.ideChoice,
        ideCustomPath: prefs.ideCustomPath ?? "",
        showSuccessToasts: prefs.showSuccessToasts,
    }
}

export async function runWorkspaceLauncher(
    action: WorkspaceActionKey,
    folderPath: string,
    prefs: WorkspaceLauncherPrefs,
): Promise<void> {
    const label = WORKSPACE_ACTION_LABELS[action]
    const toast = await showToast({ style: Toast.Style.Animated, title: `${label}...` })

    let outcome: LauncherOutcome
    switch (action) {
        case "ide":
            outcome = openInIde(folderPath, prefs)
            break
        case "terminal":
            outcome = openInTerminal(folderPath, prefs)
            break
        case "explorer":
            outcome = openInExplorer(folderPath)
            break
        case "all":
            outcome = openAll(folderPath, prefs)
            break
    }

    if (outcome.ok) {
        if (prefs.showSuccessToasts !== false) {
            toast.style = Toast.Style.Success
            toast.title = `${label} Started`
            toast.message = folderPath
        } else {
            await toast.hide()
        }
        await pushRecentWorkspace(folderPath)
    } else {
        toast.style = Toast.Style.Failure
        toast.title = `${label} Failed`
        toast.message = outcome.error
    }
}

export async function runDefaultWorkspaceLauncher(folderPath: string, prefs: WorkspaceLauncherPrefs): Promise<void> {
    await runWorkspaceLauncher(prefs.defaultOpenTarget, folderPath, prefs)
}
