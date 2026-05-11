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
    showLidNote: boolean
    showSuccessToasts?: boolean
    defaultUntilTime?: string
}

interface Arguments {
    time?: string
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
    const prefs = getPreferenceValues<Preferences>()
    const { showLidNote } = prefs
    const { pop } = useNavigation()
    const { time } = props.arguments

    const lidNote = showLidNote
        ? "Note: lid close / power button behavior depends on Windows power settings."
        : undefined

    async function handleSubmit(values: { time: string }) {
        const targetEpoch = parseTimeString(values.time)
        if (!targetEpoch) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Invalid Time Format",
                message: "Use HH:mm (e.g. 17:30) or HH:mm:ss.",
            })
            return
        }

        if (targetEpoch <= Math.floor(Date.now() / 1000)) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Time Is in the Past",
                message: "Please specify a future time.",
            })
            return
        }

        await setOverride({ mode: "until", expiryEpochSeconds: targetEpoch })
        if (prefs.showSuccessToasts !== false) {
            await showToast({
                style: Toast.Style.Success,
                title: `PC Will Stay Awake Until ${values.time}`,
                message: lidNote,
            })
        }
        pop()
    }

    function parseTimeString(t: string): number | null {
        const parts = t.split(":")
        if (parts.length < 2) return null

        const now = new Date()
        const target = new Date(now)
        target.setHours(parseInt(parts[0]), parseInt(parts[1]), parts.length > 2 ? parseInt(parts[2]) : 0, 0)

        if (target <= now) target.setDate(target.getDate() + 1)

        return Math.floor(target.getTime() / 1000)
    }

    if (time) {
        const targetEpoch = parseTimeString(time)
        if (targetEpoch && targetEpoch > Math.floor(Date.now() / 1000)) {
            void setOverride({ mode: "until", expiryEpochSeconds: targetEpoch }).then(() => {
                if (prefs.showSuccessToasts !== false) {
                    void showToast({
                        style: Toast.Style.Success,
                        title: `PC Will Stay Awake Until ${time}`,
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
                id="time"
                title="Until Time"
                placeholder="e.g. 17:30"
                defaultValue={time ?? prefs.defaultUntilTime ?? ""}
                info="Keep the system and display awake until this time today."
            />
        </Form>
    )
}
