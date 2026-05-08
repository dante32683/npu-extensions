import { Action, ActionPanel, Form, LaunchProps, showToast, Toast, useNavigation } from "@raycast/api"
import { startKeeper } from "./utils/keeper-utils"

interface Arguments {
    time?: string
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
    const { pop } = useNavigation()
    const { time } = props.arguments

    async function handleSubmit(values: { time: string }) {
        const targetEpoch = parseTimeString(values.time)
        if (!targetEpoch) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Invalid time format",
                message: "Use HH:mm (e.g. 17:30) or HH:mm:ss",
            })
            return
        }

        if (targetEpoch <= Math.floor(Date.now() / 1000)) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Time is in the past",
                message: "Please specify a future time.",
            })
            return
        }

        await startKeeper("until", targetEpoch)
        await showToast({
            style: Toast.Style.Success,
            title: `PC will stay awake until ${values.time}`,
        })
        pop()
    }

    function parseTimeString(t: string): number | null {
        const parts = t.split(":")
        if (parts.length < 2) return null

        const now = new Date()
        const target = new Date(now)
        target.setHours(parseInt(parts[0]), parseInt(parts[1]), parts.length > 2 ? parseInt(parts[2]) : 0, 0)

        // If time is earlier today, assume it's for tomorrow? 
        // PowerToys Awake usually assumes today.
        return Math.floor(target.getTime() / 1000)
    }

    if (time) {
        const targetEpoch = parseTimeString(time)
        if (targetEpoch && targetEpoch > Math.floor(Date.now() / 1000)) {
            startKeeper("until", targetEpoch).then(() => {
                showToast({
                    style: Toast.Style.Success,
                    title: `PC will stay awake until ${time}`,
                })
            })
            return null
        }
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Start Awake" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="time"
                title="Until Time"
                placeholder="e.g. 17:30"
                defaultValue={time}
                info="Keep the system and display awake until this time today."
            />
        </Form>
    )
}
