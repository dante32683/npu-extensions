import { List, Icon, ActionPanel, Action, Color } from "@raycast/api"
import { useEffect, useState } from "react"
import { getKeeperStatus, KeeperStatus, setOverride } from "./utils/keeper-utils"

function isScheduleActiveNow(s: KeeperStatus["schedules"][number], now: Date): boolean {
    if (!s.enabled) return false
    const dow = now.getDay() // 0=Sun..6=Sat
    if (!s.days.includes(dow)) return false

    const [sh, sm] = s.start.split(":").map(n => parseInt(n, 10))
    const [eh, em] = s.end.split(":").map(n => parseInt(n, 10))
    if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return false

    const start = sh * 60 + sm
    const end = eh * 60 + em
    const cur = now.getHours() * 60 + now.getMinutes()

    if (start === end) return true
    if (start < end) return cur >= start && cur < end
    return cur >= start || cur < end // cross-midnight
}

function formatDays(days: number[]) {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return [...days]
        .sort((a, b) => a - b)
        .map(d => labels[d] ?? String(d))
        .join(", ")
}

export default function Command() {
    const [status, setStatus] = useState<KeeperStatus>({ daemonPid: null, override: null, schedules: [] })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchStatus() {
            const s = await getKeeperStatus()
            setStatus(s)
            setIsLoading(false)
        }
        fetchStatus()
    }, [])

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

    return (
        <List isLoading={isLoading}>
            {status.override ? (
                <List.Item
                    title={`Mode: ${modeLabels[status.override.mode] || status.override.mode}`}
                    subtitle={status.override.expiryEpochSeconds ? `Remaining: ${getRemainingTime()}` : "No time limit"}
                    icon={{ source: Icon.Clock, tintColor: Color.Green }}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Let PC Sleep"
                                icon={Icon.Moon}
                                onAction={async () => {
                                    await setOverride(null)
                                    setStatus(await getKeeperStatus())
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
                                title="Let PC Sleep (Clear Manual Override)"
                                icon={Icon.Moon}
                                onAction={async () => {
                                    await setOverride(null)
                                    setStatus(await getKeeperStatus())
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
                <List.EmptyView
                    title="PC can sleep normally"
                    description="No keep-awake session is active."
                    icon={Icon.Moon}
                />
            )}
        </List>
    )
}
