import {
    Action,
    ActionPanel,
    Color,
    Detail,
    Icon,
    launchCommand,
    LaunchType,
    open,
    showToast,
    Toast,
} from "@raycast/api"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getKeeperHealth, KeeperHealth } from "./utils/keeper-control"
import { getPaths, readKeeperState, readLogTail, KeeperState } from "./utils/organize-state"

interface ViewModel {
    health: KeeperHealth
    state: KeeperState
    log: string[]
}

function buildModel(): ViewModel {
    return {
        health: { running: false, pid: null, exeMissing: false, bridgeMissing: false },
        state: readKeeperState(),
        log: readLogTail(30),
    }
}

export default function Command() {
    const [model, setModel] = useState<ViewModel | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const refresh = useCallback(async () => {
        const health = await getKeeperHealth()
        setModel({
            health,
            state: readKeeperState(),
            log: readLogTail(30),
        })
        setIsLoading(false)
    }, [])

    useEffect(() => {
        const initial = buildModel()
        setModel(initial)
        void refresh()
        const id = setInterval(refresh, 2000)
        return () => clearInterval(id)
    }, [refresh])

    // Both Start and Stop are delegated to their dedicated commands via
    // launchCommand so that command-scoped preferences (skipOnBattery,
    // debounceMs, ignorePattern) are visible to the running command —
    // Status's getPreferenceValues cannot see those.
    const handleStart = useCallback(async () => {
        try {
            await launchCommand({ name: "start-screenshot-watcher", type: LaunchType.UserInitiated })
        } catch (err: unknown) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to launch Start Screenshot Watcher",
                message: err instanceof Error ? err.message : String(err),
            })
        }
        setTimeout(() => void refresh(), 1500)
    }, [refresh])

    const handleStop = useCallback(async () => {
        try {
            await launchCommand({ name: "stop-screenshot-watcher", type: LaunchType.UserInitiated })
        } catch (err: unknown) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to launch Stop Screenshot Watcher",
                message: err instanceof Error ? err.message : String(err),
            })
        }
        setTimeout(() => void refresh(), 1500)
    }, [refresh])

    const markdown = useMemo(() => renderMarkdown(model), [model])
    const paths = useMemo(() => getPaths(), [])

    return (
        <Detail
            isLoading={isLoading}
            navigationTitle="Screenshot Watcher Status"
            markdown={markdown}
            metadata={renderMetadata(model)}
            actions={
                <ActionPanel>
                    {model?.health.running ? (
                        <Action
                            title="Stop Watcher"
                            icon={{ source: Icon.Stop, tintColor: Color.Red }}
                            onAction={handleStop}
                        />
                    ) : (
                        <Action
                            title="Start Watcher"
                            icon={{ source: Icon.Play, tintColor: Color.Green }}
                            onAction={handleStart}
                        />
                    )}
                    <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={refresh}
                    />
                    <Action title="Open Log File" icon={Icon.Document} onAction={() => open(paths.logPath)} />
                    <Action title="Open Support Folder" icon={Icon.Folder} onAction={() => open(paths.supportDir)} />
                    <Action
                        title="Open Watched Folder"
                        icon={Icon.Image}
                        onAction={() => model?.state.watchFolder && open(model.state.watchFolder)}
                    />
                </ActionPanel>
            }
        />
    )
}

function renderMarkdown(model: ViewModel | null): string {
    if (!model) return "Loading..."
    const { health, state, log } = model

    const lines: string[] = []
    if (health.exeMissing) {
        lines.push("## Keeper binary missing")
        lines.push("")
        lines.push("From `npu-organize-ext\\keeper` run:")
        lines.push("")
        lines.push("```powershell")
        lines.push("dotnet publish -c Release -r win-x64 --self-contained true -o ..\\assets\\bin")
        lines.push("```")
        lines.push("")
    }
    if (health.bridgeMissing) {
        lines.push("## Bridge binary missing")
        lines.push("")
        lines.push("From `npu-organize-ext\\bridge` run:")
        lines.push("")
        lines.push("```powershell")
        lines.push("dotnet publish -c Release -r win-x64 --self-contained true -o ..\\assets\\bin")
        lines.push("```")
        lines.push("")
    }

    lines.push(`## ${health.running ? "Watcher running" : "Watcher stopped"}`)
    lines.push("")
    if (state.lastError) {
        lines.push(`> **Last error:** ${state.lastError}`)
        lines.push("")
    }

    lines.push("### Recent activity")
    lines.push("")
    if (log.length === 0) {
        lines.push(
            "_No activity logged yet. Save a screenshot to `" +
                (state.watchFolder ?? "the watched folder") +
                "` to trigger the pipeline._",
        )
    } else {
        lines.push("```")
        for (const line of log) lines.push(line)
        lines.push("```")
    }
    return lines.join("\n")
}

function renderMetadata(model: ViewModel | null) {
    if (!model) return undefined
    const { health, state } = model

    return (
        <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                    text={health.running ? "Running" : "Stopped"}
                    color={health.running ? Color.Green : Color.SecondaryText}
                />
                {health.pid !== null && <Detail.Metadata.TagList.Item text={`PID ${health.pid}`} />}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Watched Folder" text={state.watchFolder ?? "(not started yet)"} />
            <Detail.Metadata.Label title="Started" text={fmtIso(state.startedAt)} />
            <Detail.Metadata.Label title="Last Heartbeat" text={fmtIso(state.lastHeartbeatAt)} />
            <Detail.Metadata.Label title="Last File Event" text={fmtIso(state.lastEventAt)} />
            <Detail.Metadata.Label title="Last Rename" text={fmtIso(state.lastProcessedAt)} />
            {state.lastProcessedPath && (
                <Detail.Metadata.Label title="Last Renamed Path" text={state.lastProcessedPath} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Counters">
                <Detail.Metadata.TagList.Item text={`${state.processed} renamed`} color={Color.Green} />
                <Detail.Metadata.TagList.Item text={`${state.skipped} skipped`} color={Color.Yellow} />
                <Detail.Metadata.TagList.Item
                    text={`${state.errors} errors`}
                    color={state.errors > 0 ? Color.Red : Color.SecondaryText}
                />
            </Detail.Metadata.TagList>
        </Detail.Metadata>
    )
}

function fmtIso(value: string | null): string {
    if (!value) return "—"
    try {
        return new Date(value).toLocaleString()
    } catch {
        return value
    }
}
