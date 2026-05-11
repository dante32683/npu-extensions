import {
    Action,
    ActionPanel,
    Color,
    getPreferenceValues,
    Icon,
    launchCommand,
    LaunchType,
    List,
    showToast,
    Toast,
} from "@raycast/api"
import { useCallback, useEffect, useState } from "react"
import { getKeeperStatus, KeeperStatus, setOverride, stopDaemon } from "./utils/keeper-utils"

function isScheduleActiveNow(s: KeeperStatus["schedules"][number], now: Date): boolean {
    if (!s.enabled) return false
    const dow = now.getDay()
    if (!s.days.includes(dow)) return false

    const [sh, sm] = s.start.split(":").map(n => parseInt(n, 10))
    const [eh, em] = s.end.split(":").map(n => parseInt(n, 10))
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return false

    const start = sh * 60 + sm
    const end = eh * 60 + em
    const cur = now.getHours() * 60 + now.getMinutes()

    if (start === end) return true
    if (start < end) return cur >= start && cur < end
    return cur >= start || cur < end
}

function formatDays(days: number[]) {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return [...days]
        .sort((a, b) => a - b)
        .map(d => labels[d] ?? String(d))
        .join(", ")
}

interface Prefs {
    showSuccessToasts?: boolean
}

async function launchNamed(name: string) {
    try {
        await launchCommand({ name, type: LaunchType.UserInitiated })
    } catch (err: unknown) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Failed to open command",
            message: err instanceof Error ? err.message : String(err),
        })
    }
}

export default function Command() {
    const prefs = getPreferenceValues<Prefs>()
    const [status, setStatus] = useState<KeeperStatus>({ daemonPid: null, override: null, schedules: [] })
    const [isLoading, setIsLoading] = useState(true)

    const refresh = useCallback(async () => {
        const s = await getKeeperStatus()
        setStatus(s)
        setIsLoading(false)
    }, [])

    useEffect(() => {
        void refresh()
        const id = setInterval(() => void refresh(), 3000)
        return () => clearInterval(id)
    }, [refresh])

    const getRemainingTime = () => {
        const exp = status?.override?.expiryEpochSeconds
        if (!exp) return null
        const diff = exp - Math.floor(Date.now() / 1000)
        if (diff <= 0) return "Expired"
        const hours = Math.floor(diff / 3600)
        const minutes = Math.floor((diff % 3600) / 60)
        const seconds = diff % 60
        return `${hours > 0 ? hours + "h " : ""}${minutes}m ${seconds}s`
    }

    const modeLabels: Record<string, string> = {
        indefinite: "Indefinite",
        timed: "Timed Duration",
        until: "Until Specific Time",
        "screen-off": "Screen-Off (System Awake)",
        daemon: "Daemon (Schedules)",
    }

    const handleStopDaemon = async () => {
        await stopDaemon()
        await refresh()
        if (prefs.showSuccessToasts !== false) {
            await showToast({ style: Toast.Style.Success, title: "Awake daemon stopped" })
        }
    }

    return (
        <List isLoading={isLoading} navigationTitle="Awake Dashboard">
            <List.Section title="Current session">
                {status.override ? (
                    <List.Item
                        title={`Mode: ${modeLabels[status.override.mode] || status.override.mode}`}
                        subtitle={
                            status.override.expiryEpochSeconds ? `Remaining: ${getRemainingTime()}` : "No time limit"
                        }
                        icon={{ source: Icon.Clock, tintColor: Color.Green }}
                        actions={
                            <ActionPanel>
                                <Action
                                    // eslint-disable-next-line @raycast/prefer-title-case
                                    title="Let PC Sleep"
                                    icon={Icon.Moon}
                                    onAction={async () => {
                                        const ok = await setOverride(null)
                                        await refresh()
                                        if (ok && prefs.showSuccessToasts !== false) {
                                            await showToast({
                                                style: Toast.Style.Success,
                                                title: "Manual keep-awake cleared",
                                            })
                                        }
                                    }}
                                />
                            </ActionPanel>
                        }
                    />
                ) : status.schedules.some(s => isScheduleActiveNow(s, new Date())) ? (
                    <List.Item
                        title="Awake via schedule"
                        subtitle={(() => {
                            const active = status.schedules.find(s => isScheduleActiveNow(s, new Date()))
                            return active
                                ? `${formatDays(active.days)} • ${active.start}–${active.end}`
                                : "Schedule is active"
                        })()}
                        icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                        actions={
                            <ActionPanel>
                                <Action
                                    // eslint-disable-next-line @raycast/prefer-title-case
                                    title="Let PC Sleep (Clear Manual Override)"
                                    icon={Icon.Moon}
                                    onAction={async () => {
                                        await setOverride(null)
                                        await refresh()
                                    }}
                                />
                            </ActionPanel>
                        }
                    />
                ) : status.schedules.length > 0 ? (
                    <List.Item
                        title="Schedules configured (not active right now)"
                        subtitle={`${status.schedules.filter(s => s.enabled).length} enabled`}
                        icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
                    />
                ) : (
                    <List.Item
                        title="PC can sleep normally"
                        subtitle="No keep-awake session is active."
                        icon={Icon.Moon}
                    />
                )}
            </List.Section>

            <List.Section title="Commands" subtitle="Open a Raycast command">
                <List.Item
                    title="Smart Awake"
                    subtitle="Natural language schedules and durations"
                    icon={Icon.Wand}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Open Smart Awake"
                                icon={Icon.Wand}
                                onAction={() => launchNamed("awake-natural")}
                            />
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Awake for…"
                    subtitle="Keep awake for N minutes"
                    icon={Icon.Clock}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Open Awake For…"
                                icon={Icon.Clock}
                                onAction={() => launchNamed("awake-for")}
                            />
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Awake Until"
                    subtitle="Keep awake until a time"
                    icon={Icon.Calendar}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Open Awake Until"
                                icon={Icon.Calendar}
                                onAction={() => launchNamed("awake-until")}
                            />
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Awake Schedules"
                    subtitle="View, pause, or delete schedules"
                    icon={Icon.List}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Open Awake Schedules"
                                icon={Icon.List}
                                onAction={() => launchNamed("awake-schedules")}
                            />
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Awake"
                    subtitle="Toggle keep-awake (uses Default Awake Mode in command preferences)"
                    icon={Icon.Power}
                    actions={
                        <ActionPanel>
                            <Action title="Run Awake Toggle" icon={Icon.Power} onAction={() => launchNamed("awake")} />
                        </ActionPanel>
                    }
                />
                <List.Item
                    title="Let Sleep"
                    subtitle="Cancel the active keep-awake session"
                    icon={Icon.Moon}
                    actions={
                        <ActionPanel>
                            <Action title="Run Let Sleep" icon={Icon.Moon} onAction={() => launchNamed("let-sleep")} />
                        </ActionPanel>
                    }
                />
            </List.Section>

            <List.Section title="Advanced">
                <List.Item
                    title="Stop Awake Daemon"
                    subtitle="Stops the background process (use before rebuilding the keeper)"
                    icon={{ source: Icon.Stop, tintColor: Color.Red }}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Stop Awake Daemon"
                                icon={{ source: Icon.Stop, tintColor: Color.Red }}
                                style={Action.Style.Destructive}
                                onAction={handleStopDaemon}
                            />
                        </ActionPanel>
                    }
                />
            </List.Section>
        </List>
    )
}
