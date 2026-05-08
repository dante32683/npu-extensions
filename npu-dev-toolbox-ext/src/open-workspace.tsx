import {
    Action,
    ActionPanel,
    Form,
    getPreferenceValues,
    Icon,
    List,
    showToast,
    Toast,
    useNavigation,
} from "@raycast/api"
import { useCallback, useEffect, useState } from "react"
import { describeSource, detectActiveWorkspace, DetectedContext } from "./utils/foreground-context"
import { getRecentWorkspaces, pushRecentWorkspace, removeRecentWorkspace } from "./utils/recent-workspaces"
import { LauncherOutcome, LauncherPrefs, openAll, openInExplorer, openInIde, openInTerminal } from "./utils/launchers"

type ActionKey = "ide" | "terminal" | "explorer" | "all"

const ACTION_LABELS: Record<ActionKey, string> = {
    ide: "Open in IDE",
    terminal: "Open in Terminal",
    explorer: "Open in Explorer",
    all: "Open All",
}

function getLauncherPrefs(): LauncherPrefs {
    const prefs = getPreferenceValues<Preferences.OpenWorkspace>()
    return {
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

function FolderPickerForm({ onPicked }: { onPicked: (folderPath: string) => void }) {
    const { pop } = useNavigation()
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Use This Folder"
                        icon={Icon.Folder}
                        onSubmit={async (values: { folder: string[] }) => {
                            const picked = values.folder?.[0]
                            if (!picked) {
                                await showToast({
                                    style: Toast.Style.Failure,
                                    title: "No Folder Selected",
                                    message: "Pick a folder to continue.",
                                })
                                return
                            }
                            onPicked(picked)
                            pop()
                        }}
                    />
                </ActionPanel>
            }
        >
            <Form.FilePicker
                id="folder"
                title="Folder"
                allowMultipleSelection={false}
                canChooseDirectories
                canChooseFiles={false}
            />
        </Form>
    )
}

function workspaceActions(
    folderPath: string,
    prefs: LauncherPrefs,
    options: { isRecent: boolean; onMutate: () => void },
) {
    return (
        <ActionPanel>
            <ActionPanel.Section title="Open">
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
            <ActionPanel.Section>
                <Action.CopyToClipboard
                    title="Copy Path"
                    content={folderPath}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                {options.isRecent ? (
                    <Action
                        title="Remove from Recents"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={async () => {
                            await removeRecentWorkspace(folderPath)
                            options.onMutate()
                        }}
                    />
                ) : null}
            </ActionPanel.Section>
        </ActionPanel>
    )
}

export default function Command() {
    const prefs = getLauncherPrefs()
    const { push } = useNavigation()

    const [detected, setDetected] = useState<DetectedContext | null>(null)
    const [recents, setRecents] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const refresh = useCallback(async () => {
        setIsLoading(true)
        try {
            const [autoDetected, recentList] = await Promise.all([detectActiveWorkspace(), getRecentWorkspaces()])
            setDetected(autoDetected)
            setRecents(recentList)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const handlePicked = useCallback(
        async (folder: string) => {
            await pushRecentWorkspace(folder)
            await refresh()
        },
        [refresh],
    )

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Filter recent workspaces...">
            {detected ? (
                <List.Section title="Auto-Detected">
                    <List.Item
                        title={detected.cwd}
                        subtitle={describeSource(detected.source)}
                        icon={Icon.Wand}
                        accessories={[{ tag: describeSource(detected.source) }]}
                        actions={workspaceActions(detected.cwd, prefs, { isRecent: false, onMutate: refresh })}
                    />
                </List.Section>
            ) : null}

            <List.Section title="Recent Workspaces" subtitle={recents.length > 0 ? `${recents.length}` : undefined}>
                {recents.map(folderPath => (
                    <List.Item
                        key={folderPath}
                        title={folderPath}
                        icon={Icon.Folder}
                        actions={workspaceActions(folderPath, prefs, { isRecent: true, onMutate: refresh })}
                    />
                ))}
            </List.Section>

            <List.Section title="Browse">
                <List.Item
                    title="Pick a folder..."
                    icon={Icon.Plus}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Pick a Folder…"
                                icon={Icon.Plus}
                                onAction={() => push(<FolderPickerForm onPicked={handlePicked} />)}
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

            {!detected && recents.length === 0 ? (
                <List.EmptyView
                    title="No workspaces yet"
                    description="Run a command from a project folder, or pick one with the Browse action."
                    icon={Icon.Folder}
                />
            ) : null}
        </List>
    )
}
