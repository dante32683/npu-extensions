import {
    Action,
    ActionPanel,
    Alert,
    confirmAlert,
    Form,
    getPreferenceValues,
    Icon,
    List,
    showToast,
    Toast,
    useNavigation,
} from "@raycast/api"
import fs from "fs"
import path from "path"
import { useCallback, useEffect, useState } from "react"
import { getLastExplorerFolder, setLastExplorerFolder } from "./utils/last-explorer-folder"
import {
    clearRecentWorkspaces,
    getRecentWorkspaces,
    pushRecentWorkspace,
    removeRecentWorkspace,
} from "./utils/recent-workspaces"
import {
    getWorkspaceLauncherPrefs,
    runDefaultWorkspaceLauncher,
    runWorkspaceLauncher,
    WORKSPACE_ACTION_LABELS,
    type WorkspaceLauncherPrefs,
} from "./utils/workspace-launcher-actions"

function listSubfolders(folderPath: string): string[] {
    try {
        return fs
            .readdirSync(folderPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => path.join(folderPath, d.name))
            .sort((a, b) => a.localeCompare(b))
    } catch {
        return []
    }
}

function SubfolderBrowser({
    rootFolder,
    prefs,
    onMutate,
}: {
    rootFolder: string
    prefs: WorkspaceLauncherPrefs
    onMutate: () => void
}) {
    const { push } = useNavigation()
    const folders = listSubfolders(rootFolder)

    return (
        <List searchBarPlaceholder="Filter subfolders...">
            <List.Section title={rootFolder} subtitle={folders.length > 0 ? `${folders.length}` : undefined}>
                {folders.map(f => (
                    <List.Item
                        key={f}
                        title={path.basename(f)}
                        subtitle={f}
                        icon={Icon.Folder}
                        actions={
                            <ActionPanel>
                                <ActionPanel.Section title="Open">
                                    <Action
                                        title="Open (default)"
                                        icon={Icon.Play}
                                        onAction={() => runDefaultWorkspaceLauncher(f, prefs).then(onMutate)}
                                    />
                                    <Action
                                        title={WORKSPACE_ACTION_LABELS.ide}
                                        icon={Icon.Code}
                                        onAction={() => runWorkspaceLauncher("ide", f, prefs).then(onMutate)}
                                    />
                                    <Action
                                        title={WORKSPACE_ACTION_LABELS.terminal}
                                        icon={Icon.Terminal}
                                        onAction={() => runWorkspaceLauncher("terminal", f, prefs).then(onMutate)}
                                    />
                                    <Action
                                        title={WORKSPACE_ACTION_LABELS.explorer}
                                        icon={Icon.Folder}
                                        onAction={() => runWorkspaceLauncher("explorer", f, prefs).then(onMutate)}
                                    />
                                    <Action
                                        title={WORKSPACE_ACTION_LABELS.all}
                                        icon={Icon.Stars}
                                        onAction={() => runWorkspaceLauncher("all", f, prefs).then(onMutate)}
                                    />
                                </ActionPanel.Section>
                                <ActionPanel.Section>
                                    <Action
                                        title="Browse Into…"
                                        icon={Icon.ArrowRight}
                                        onAction={() =>
                                            push(<SubfolderBrowser rootFolder={f} prefs={prefs} onMutate={onMutate} />)
                                        }
                                    />
                                    <Action.CopyToClipboard
                                        title="Copy Path"
                                        content={f}
                                        shortcut={{ modifiers: ["cmd"], key: "." }}
                                    />
                                </ActionPanel.Section>
                            </ActionPanel>
                        }
                    />
                ))}
            </List.Section>
            {folders.length === 0 ? (
                <List.EmptyView
                    title="No subfolders"
                    description="This folder contains no subfolders."
                    icon={Icon.Folder}
                />
            ) : null}
        </List>
    )
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
    prefs: WorkspaceLauncherPrefs,
    options: { onMutate: () => void; push: ReturnType<typeof useNavigation>["push"] },
) {
    return (
        <ActionPanel>
            <ActionPanel.Section title="Open">
                <Action
                    title="Open (default)"
                    icon={Icon.Play}
                    onAction={() => runDefaultWorkspaceLauncher(folderPath, prefs).then(options.onMutate)}
                />
                <Action
                    title={WORKSPACE_ACTION_LABELS.ide}
                    icon={Icon.Code}
                    onAction={() => runWorkspaceLauncher("ide", folderPath, prefs).then(options.onMutate)}
                />
                <Action
                    title={WORKSPACE_ACTION_LABELS.terminal}
                    icon={Icon.Terminal}
                    onAction={() => runWorkspaceLauncher("terminal", folderPath, prefs).then(options.onMutate)}
                />
                <Action
                    title={WORKSPACE_ACTION_LABELS.explorer}
                    icon={Icon.Folder}
                    onAction={() => runWorkspaceLauncher("explorer", folderPath, prefs).then(options.onMutate)}
                />
                <Action
                    title={WORKSPACE_ACTION_LABELS.all}
                    icon={Icon.Stars}
                    onAction={() => runWorkspaceLauncher("all", folderPath, prefs).then(options.onMutate)}
                />
            </ActionPanel.Section>
            <ActionPanel.Section>
                <Action
                    title="Browse Subfolders…"
                    icon={Icon.Folder}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() =>
                        options.push(
                            <SubfolderBrowser rootFolder={folderPath} prefs={prefs} onMutate={options.onMutate} />,
                        )
                    }
                />
                <Action.CopyToClipboard
                    title="Copy Path"
                    content={folderPath}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                />
            </ActionPanel.Section>
        </ActionPanel>
    )
}

function recentWorkspaceActions(folderPath: string, prefs: WorkspaceLauncherPrefs, onMutate: () => void) {
    return (
        <ActionPanel>
            <ActionPanel.Section title="Open">
                <Action
                    title="Open (default)"
                    icon={Icon.Play}
                    onAction={() => runDefaultWorkspaceLauncher(folderPath, prefs).then(onMutate)}
                />
                <Action
                    title={WORKSPACE_ACTION_LABELS.ide}
                    icon={Icon.Code}
                    onAction={() => runWorkspaceLauncher("ide", folderPath, prefs).then(onMutate)}
                />
                <Action
                    title={WORKSPACE_ACTION_LABELS.terminal}
                    icon={Icon.Terminal}
                    onAction={() => runWorkspaceLauncher("terminal", folderPath, prefs).then(onMutate)}
                />
                <Action
                    title={WORKSPACE_ACTION_LABELS.explorer}
                    icon={Icon.Folder}
                    onAction={() => runWorkspaceLauncher("explorer", folderPath, prefs).then(onMutate)}
                />
                <Action
                    title={WORKSPACE_ACTION_LABELS.all}
                    icon={Icon.Stars}
                    onAction={() => runWorkspaceLauncher("all", folderPath, prefs).then(onMutate)}
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
                        onMutate()
                    }}
                />
            </ActionPanel.Section>
        </ActionPanel>
    )
}

export default function Command() {
    const prefs = getWorkspaceLauncherPrefs()
    const { push } = useNavigation()

    const [currentFolder, setCurrentFolder] = useState<string | null>(null)
    const [subfolders, setSubfolders] = useState<string[]>([])
    const [recent, setRecent] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const refresh = useCallback(async () => {
        setIsLoading(true)
        try {
            const current = await getLastExplorerFolder()
            setCurrentFolder(current)
            setSubfolders(current ? listSubfolders(current) : [])
            setRecent(await getRecentWorkspaces())
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const handlePicked = useCallback(
        async (folder: string) => {
            await setLastExplorerFolder(folder)
            await pushRecentWorkspace(folder)
            await refresh()
        },
        [refresh],
    )

    const clearHistory = async () => {
        const ok = await confirmAlert({
            title: "Clear Workspace History?",
            message: "This will remove all saved workspaces from history.",
            primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
        })
        if (!ok) return
        await clearRecentWorkspaces()
        await refresh()
        const hprefs = getPreferenceValues<Preferences>()
        if (hprefs.showSuccessToasts !== false) {
            await showToast({ style: Toast.Style.Success, title: "History Cleared" })
        }
    }

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Filter workspaces...">
            {recent.length > 0 ? (
                <List.Section title="Recent" subtitle={`${recent.length}`}>
                    {recent.map(folderPath => (
                        <List.Item
                            key={folderPath}
                            title={path.basename(folderPath)}
                            subtitle={folderPath}
                            icon={Icon.Clock}
                            actions={recentWorkspaceActions(folderPath, prefs, refresh)}
                        />
                    ))}
                    <List.Item
                        title="Clear History"
                        icon={Icon.Trash}
                        actions={
                            <ActionPanel>
                                <Action
                                    title="Clear History"
                                    icon={Icon.Trash}
                                    style={Action.Style.Destructive}
                                    onAction={clearHistory}
                                />
                            </ActionPanel>
                        }
                    />
                </List.Section>
            ) : null}

            <List.Section title="Current Explorer Folder">
                {currentFolder ? (
                    <List.Item
                        title={currentFolder}
                        icon={Icon.Folder}
                        actions={workspaceActions(currentFolder, prefs, { onMutate: refresh, push })}
                    />
                ) : (
                    <List.Item
                        title="No Explorer folder found"
                        subtitle="Open an Explorer window (or pick a folder below)."
                        icon={Icon.Warning}
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
                )}
            </List.Section>

            <List.Section
                title="Workspaces in Current Folder"
                subtitle={currentFolder && subfolders.length > 0 ? `${subfolders.length}` : undefined}
            >
                {currentFolder
                    ? subfolders.map(folderPath => (
                          <List.Item
                              key={folderPath}
                              title={path.basename(folderPath)}
                              subtitle={folderPath}
                              icon={Icon.Folder}
                              actions={workspaceActions(folderPath, prefs, { onMutate: refresh, push })}
                          />
                      ))
                    : null}
                {currentFolder && subfolders.length === 0 ? (
                    <List.EmptyView
                        title="No subfolders found"
                        description="This folder has no subfolders to treat as workspaces."
                        icon={Icon.Folder}
                    />
                ) : null}
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
        </List>
    )
}
