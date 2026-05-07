import { Action, ActionPanel, Form } from "@raycast/api"
import { showAwakePendingToast } from "./shared/showAwakePendingToast"

// TODO: launch AwakeKeeper.exe in timed mode.
// See FEATURE_PLAN.md section "Awake".

export default function Command() {
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Start Awake Timer"
                        onSubmit={() => showAwakePendingToast("Awake For pending")}
                    />
                </ActionPanel>
            }
        >
            <Form.TextField id="duration" title="Minutes" placeholder="40" />
        </Form>
    )
}
