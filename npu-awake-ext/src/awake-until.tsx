import { Action, ActionPanel, Form } from "@raycast/api"
import { showAwakePendingToast } from "./shared/showAwakePendingToast"

// TODO: launch AwakeKeeper.exe in until mode.
// See FEATURE_PLAN.md section "Awake".

export default function Command() {
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Stay Awake Until"
                        onSubmit={() => showAwakePendingToast("Awake Until pending")}
                    />
                </ActionPanel>
            }
        >
            <Form.TextField id="time" title="Until" placeholder="17:30" />
        </Form>
    )
}
