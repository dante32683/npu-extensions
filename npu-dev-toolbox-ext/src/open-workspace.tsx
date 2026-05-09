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
import fs from "fs"
import path from "path"
import { useCallback, useEffect, useState } from "react"
import { getLastExplorerFolder, setLastExplorerFolder } from "./utils/last-explorer-folder"
import { pushRecentWorkspace } from "./utils/recent-workspaces"
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
    const prefs = getPreferenceValues<Preferences.OpenWorkspace>()
    return {
        defaultOpenTarget: prefs.defaultOpenTarget as DefaultOpenTarget,
        terminalChoice: prefs.terminalChoice,
        terminalNewTab: Boolean(prefs.terminalNewTab),
        wtProfileName: prefs.wtProfileName ?? "",
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

async function runDefaultLauncher(folderPath: string, prefs: LauncherPrefs & { defaultOpenTarget: DefaultOpenTarget }) {
    await runLauncher(prefs.defaultOpenTarget, folderPath, prefs)
}

function SubfolderBrowser({
    rootFolder,
    prefs,
    onMutate,
}: {
    rootFolder: string
    prefs: LauncherPrefs & { defaultOpenTarget: DefaultOpenTarget }
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
                                        onAction={() => runDefaultLauncher(f, prefs).then(onMutate)}
                                    />
                                    <Action
                                        title={ACTION_LABELS.ide}
                                        icon={Icon.Code}
                                        onAction={() => runLauncher("ide", f, prefs).then(onMutate)}
                                    />
                                    <Action
                                        title={ACTION_LABELS.terminal}
                                        icon={Icon.Terminal}
                                        onAction={() => runLauncher("terminal", f, prefs).then(onMutate)}
                                    />
                                    <Action
                                        title={ACTION_LABELS.explorer}
                                        icon={Icon.Folder}
                                        onAction={() => runLauncher("explorer", f, prefs).then(onMutate)}
                                    />
                                    <Action
                                        title={ACTION_LABELS.all}
                                        icon={Icon.Stars}
                                        onAction={() => runLauncher("all", f, prefs).then(onMutate)}
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

export default function Command() {
    const prefs = getLauncherPrefs()
    const { push } = useNavigation()

    const [currentFolder, setCurrentFolder] = useState<string | null>(null)
    const [subfolders, setSubfolders] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const refresh = useCallback(async () => {
        setIsLoading(true)
        try {
            const current = await getLastExplorerFolder()
            setCurrentFolder(current)
            setSubfolders(current ? listSubfolders(current) : [])
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

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Filter workspaces in current folder...">
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
