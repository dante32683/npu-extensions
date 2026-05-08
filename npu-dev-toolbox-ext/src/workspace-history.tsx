import {
    Action,
    ActionPanel,
    getPreferenceValues,
    Icon,
    List,
    showToast,
    Toast,
    confirmAlert,
    Alert,
    useNavigation,
} from "@raycast/api"
import path from "path"
import { useCallback, useEffect, useState } from "react"
import {
    clearRecentWorkspaces,
    getRecentWorkspaces,
    pushRecentWorkspace,
    removeRecentWorkspace,
} from "./utils/recent-workspaces"
import { LauncherOutcome, LauncherPrefs, openAll, openInExplorer, openInIde, openInTerminal } from "./utils/launchers"

type ActionKey = "ide" | "terminal" | "explorer" | "all"
type DefaultOpenTarget = ActionKey

const ACTION_LABELS: Record<ActionKey, string> = {
    ide: "Open in IDE",
    terminal: "Open in Terminal",
    explorer: "Open in Explorer",
    all: "Open All",
}

function getLauncherPrefs(): LauncherPrefs & { defaultOpenTarget: DefaultOpenTarget } {
    const prefs = getPreferenceValues<Preferences.WorkspaceHistory>()
    return {
        defaultOpenTarget: prefs.defaultOpenTarget as DefaultOpenTarget,
        terminalChoice: prefs.terminalChoice,
        terminalNewTab: Boolean(prefs.terminalNewTab),
        terminalCustomPath: prefs.terminalCustomPath ?? "",
        ideChoice: prefs.ideChoice,
        ideCustomPath: prefs.ideCustomPath ?? "",
    }
}

async function runLauncher(action: ActionKey, folderPath: string, prefs: LauncherPrefs): Promise<void> {
    const label = ACTION_LABELS[action]
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
        toast.style = Toast.Style.Success
        toast.title = `${label} Started`
        toast.message = folderPath
        await pushRecentWorkspace(folderPath)
    } else {
        toast.style = Toast.Style.Failure
        toast.title = `${label} Failed`
        toast.message = outcome.error
    }
}

async function runDefaultLauncher(folderPath: string, prefs: LauncherPrefs & { defaultOpenTarget: DefaultOpenTarget }) {
    await runLauncher(prefs.defaultOpenTarget, folderPath, prefs)
}

function historyActions(
    folderPath: string,
    prefs: LauncherPrefs & { defaultOpenTarget: DefaultOpenTarget },
    options: { onMutate: () => void; push: ReturnType<typeof useNavigation>["push"] },
) {
    return (
        <ActionPanel>
            <ActionPanel.Section title="Open">
                <Action
                    title="Open (default)"
                    icon={Icon.Play}
                    onAction={() => runDefaultLauncher(folderPath, prefs).then(options.onMutate)}
                />
                <Action
                    title={ACTION_LABELS.ide}
                    icon={Icon.Code}
                    onAction={() => runLauncher("ide", folderPath, prefs).then(options.onMutate)}
                />
                <Action
                    title={ACTION_LABELS.terminal}
                    icon={Icon.Terminal}
                    onAction={() => runLauncher("terminal", folderPath, prefs).then(options.onMutate)}
                />
                <Action
                    title={ACTION_LABELS.explorer}
                    icon={Icon.Folder}
                    onAction={() => runLauncher("explorer", folderPath, prefs).then(options.onMutate)}
                />
                <Action
                    title={ACTION_LABELS.all}
                    icon={Icon.Stars}
                    onAction={() => runLauncher("all", folderPath, prefs).then(options.onMutate)}
                />
            </ActionPanel.Section>
            <ActionPanel.Section title="Manage">
                <Action.CopyToClipboard
                    title="Copy Path"
                    content={folderPath}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action
                    title="Remove from History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                        await removeRecentWorkspace(folderPath)
                        options.onMutate()
                    }}
                />
            </ActionPanel.Section>
        </ActionPanel>
    )
}

export default function Command() {
    const prefs = getLauncherPrefs()
    const { push } = useNavigation()

    const [items, setItems] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const refresh = useCallback(async () => {
        setIsLoading(true)
        try {
            const list = await getRecentWorkspaces()
            setItems(list)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Filter workspace history...">
            <List.Section title="History" subtitle={items.length > 0 ? `${items.length}` : undefined}>
                {items.map(folderPath => (
                    <List.Item
                        key={folderPath}
                        title={path.basename(folderPath)}
                        subtitle={folderPath}
                        icon={Icon.Clock}
                        actions={historyActions(folderPath, prefs, { onMutate: refresh, push })}
                    />
                ))}
            </List.Section>

            <List.Section title="Actions">
                <List.Item
                    title="Clear History"
                    icon={Icon.Trash}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Clear History"
                                icon={Icon.Trash}
                                style={Action.Style.Destructive}
                                onAction={async () => {
                                    const ok = await confirmAlert({
                                        title: "Clear Workspace History?",
                                        message: "This will remove all saved workspaces from history.",
                                        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                                    })
                                    if (!ok) return
                                    await clearRecentWorkspaces()
                                    await refresh()
                                    await showToast({ style: Toast.Style.Success, title: "History Cleared" })
                                }}
                            />
                            <Action
                                title="Refresh"
                                icon={Icon.ArrowClockwise}
                                shortcut={{ modifiers: ["cmd"], key: "r" }}
                                onAction={refresh}
                            />
                        </ActionPanel>
                    }
                />
            </List.Section>

            {items.length === 0 ? (
                <List.EmptyView
                    title="No history yet"
                    description="Open a folder from Open Workspace (or any open action) and it will appear here."
                    icon={Icon.Clock}
                />
            ) : null}
        </List>
    )
}
