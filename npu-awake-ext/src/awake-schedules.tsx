import {
    Action,
    ActionPanel,
    Alert,
    Icon,
    List,
    confirmAlert,
    getPreferenceValues,
    showToast,
    Toast,
} from "@raycast/api"
import { useEffect, useMemo, useState } from "react"
import { getKeeperStatus, KeeperStatus, setSchedules, stopDaemon } from "./utils/keeper-utils"

const DOW_LABELS: Record<number, string> = {
    0: "Sun",
    1: "Mon",
    2: "Tue",
    3: "Wed",
    4: "Thu",
    5: "Fri",
    6: "Sat",
}

function formatDays(days: number[]) {
    const sorted = [...days].sort((a, b) => a - b)
    return sorted.map(d => DOW_LABELS[d] ?? String(d)).join(", ")
}

interface Prefs {
    showSuccessToasts?: boolean
}

export default function Command() {
    const prefs = getPreferenceValues<Prefs>()
    const [status, setStatus] = useState<KeeperStatus>({ daemonPid: null, override: null, schedules: [] })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        getKeeperStatus()
            .then(s => setStatus(s))
            .finally(() => setIsLoading(false))
    }, [])

    const enabledCount = useMemo(() => status.schedules.filter(s => s.enabled).length, [status.schedules])

    async function refresh() {
        setStatus(await getKeeperStatus())
    }

    async function toggleEnabled(id: string) {
        const next = status.schedules.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
        await setSchedules(next)
        if (prefs.showSuccessToasts !== false) {
            await showToast({ style: Toast.Style.Success, title: "Schedule Updated" })
        }
        await refresh()
    }

    async function deleteSchedule(id: string) {
        const target = status.schedules.find(s => s.id === id)
        const ok = await confirmAlert({
            title: "Delete Schedule?",
            message: target ? `${formatDays(target.days)} • ${target.start}–${target.end}` : "This cannot be undone.",
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        })
        if (!ok) return
        const next = status.schedules.filter(s => s.id !== id)
        await setSchedules(next)
        if (prefs.showSuccessToasts !== false) {
            await showToast({ style: Toast.Style.Success, title: "Schedule Deleted" })
        }
        await refresh()
    }

    async function clearAll() {
        const ok = await confirmAlert({
            title: "Clear All Schedules?",
            message: "This will remove all schedules.",
            primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
        })
        if (!ok) return
        await setSchedules([])
        if (prefs.showSuccessToasts !== false) {
            await showToast({ style: Toast.Style.Success, title: "Schedules Cleared" })
        }
        await refresh()
    }

    async function stopDaemonNow() {
        const ok = await confirmAlert({
            title: "Stop Awake Daemon?",
            message:
                "This stops the background Awake process. Scheduled awake windows will not apply until it starts again.",
            primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
        })
        if (!ok) return
        await stopDaemon()
        if (prefs.showSuccessToasts !== false) {
            await showToast({ style: Toast.Style.Success, title: "Awake Daemon Stopped" })
        }
        await refresh()
    }

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Filter schedules…" navigationTitle="Awake Schedules">
            <List.Section
                title="Schedules"
                subtitle={status.schedules.length === 0 ? "None" : `${enabledCount}/${status.schedules.length} enabled`}
            >
                {status.schedules.map(s => (
                    <List.Item
                        key={s.id}
                        title={`${s.start}–${s.end}`}
                        subtitle={formatDays(s.days)}
                        icon={s.enabled ? Icon.Checkmark : Icon.Circle}
                        accessories={[{ text: s.enabled ? "Enabled" : "Paused" }]}
                        actions={
                            <ActionPanel>
                                <Action
                                    title={s.enabled ? "Pause Schedule" : "Enable Schedule"}
                                    icon={s.enabled ? Icon.Pause : Icon.Play}
                                    onAction={() => toggleEnabled(s.id)}
                                />
                                <Action
                                    title="Delete Schedule"
                                    icon={Icon.Trash}
                                    style={Action.Style.Destructive}
                                    onAction={() => deleteSchedule(s.id)}
                                />
                                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
                                <ActionPanel.Section>
                                    <Action
                                        title="Clear All Schedules"
                                        icon={Icon.XMarkCircle}
                                        style={Action.Style.Destructive}
                                        onAction={clearAll}
                                    />
                                    <Action
                                        title="Stop Awake Daemon"
                                        icon={Icon.Stop}
                                        style={Action.Style.Destructive}
                                        onAction={stopDaemonNow}
                                    />
                                </ActionPanel.Section>
                            </ActionPanel>
                        }
                    />
                ))}
            </List.Section>

            {status.schedules.length === 0 ? (
                <List.EmptyView
                    title="No schedules configured"
                    description="Use Smart Awake to create a schedule (e.g. “weekdays 09:00 to 17:00”)."
                    icon={Icon.Calendar}
                />
            ) : null}
        </List>
    )
}
