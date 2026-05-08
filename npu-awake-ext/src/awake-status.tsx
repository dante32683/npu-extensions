import { List, Icon, ActionPanel, Action, Color } from "@raycast/api"
import { useEffect, useState } from "react"
import { getKeeperStatus, stopKeeper } from "./utils/keeper-utils"

export default function Command() {
    const [status, setStatus] = useState<{ mode: string; expiry?: number | null } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchStatus() {
            const s = await getKeeperStatus()
            setStatus(s ? { mode: s.mode, expiry: s.expiry } : null)
            setIsLoading(false)
        }
        fetchStatus()
    }, [])

    const getRemainingTime = () => {
        if (!status?.expiry) return null
        const diff = status.expiry - Math.floor(Date.now() / 1000)
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
    }

    return (
        <List isLoading={isLoading}>
            {status ? (
                <List.Item
                    title={`Mode: ${modeLabels[status.mode] || status.mode}`}
                    subtitle={status.expiry ? `Remaining: ${getRemainingTime()}` : "No time limit"}
                    icon={{ source: Icon.Clock, tintColor: Color.Green }}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Let PC Sleep"
                                icon={Icon.Moon}
                                onAction={async () => {
                                    await stopKeeper()
                                    setStatus(null)
                                }}
                            />
                        </ActionPanel>
                    }
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
