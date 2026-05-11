import {
    Action,
    ActionPanel,
    Form,
    getPreferenceValues,
    LaunchProps,
    showToast,
    Toast,
    useNavigation,
} from "@raycast/api"
import { setOverride } from "./utils/keeper-utils"

interface Preferences {
    defaultDuration: string
    showLidNote: boolean
    showSuccessToasts?: boolean
}

interface Arguments {
    duration?: string
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
    const prefs = getPreferenceValues<Preferences>()
    const { defaultDuration, showLidNote } = prefs
    const { pop } = useNavigation()
    const { duration } = props.arguments

    const lidNote = showLidNote
        ? "Note: lid close / power button behavior depends on Windows power settings."
        : undefined

    async function handleSubmit(values: { minutes: string }) {
        const mins = parseInt(values.minutes)
        if (isNaN(mins) || mins <= 0) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Invalid Duration",
                message: "Please enter a positive number of minutes.",
            })
            return
        }

        const expiry = Math.floor(Date.now() / 1000) + mins * 60
        await setOverride({ mode: "timed", expiryEpochSeconds: expiry })
        if (prefs.showSuccessToasts !== false) {
            await showToast({
                style: Toast.Style.Success,
                title: `PC Will Stay Awake for ${mins} Minute(s)`,
                message: lidNote,
            })
        }
        pop()
    }

    if (duration) {
        const mins = parseInt(duration)
        if (!isNaN(mins) && mins > 0) {
            const expiry = Math.floor(Date.now() / 1000) + mins * 60
            void setOverride({ mode: "timed", expiryEpochSeconds: expiry }).then(() => {
                if (prefs.showSuccessToasts !== false) {
                    void showToast({
                        style: Toast.Style.Success,
                        title: `PC Will Stay Awake for ${mins} Minute(s)`,
                        message: lidNote,
                    })
                }
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
                defaultValue={duration ?? defaultDuration}
                info="Keep the system and display awake for this many minutes."
            />
        </Form>
    )
}
