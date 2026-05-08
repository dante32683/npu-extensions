import { Action, ActionPanel, Form, LaunchProps, showToast, Toast, useNavigation } from "@raycast/api"
import { startKeeper } from "./utils/keeper-utils"

interface Arguments {
    duration?: string
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
    const { pop } = useNavigation()
    const { duration } = props.arguments

    async function handleSubmit(values: { minutes: string }) {
        const mins = parseInt(values.minutes)
        if (isNaN(mins) || mins <= 0) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Invalid duration",
                message: "Please enter a positive number of minutes.",
            })
            return
        }

        await startKeeper("timed", mins * 60)
        await showToast({
            style: Toast.Style.Success,
            title: `PC will stay awake for ${mins} minute(s)`,
        })
        pop()
    }

    if (duration) {
        const mins = parseInt(duration)
        if (!isNaN(mins) && mins > 0) {
            startKeeper("timed", mins * 60).then(() => {
                showToast({
                    style: Toast.Style.Success,
                    title: `PC will stay awake for ${mins} minute(s)`,
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
                id="minutes"
                title="Duration (minutes)"
                placeholder="e.g. 60"
                defaultValue={duration}
                info="Keep the system and display awake for this many minutes."
            />
        </Form>
    )
}
