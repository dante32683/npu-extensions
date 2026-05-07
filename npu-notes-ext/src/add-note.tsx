import { Form, ActionPanel, Action } from "@raycast/api"

// TODO: implement Phi-Silica note formatting + filing
// See FEATURE_PLAN.md § "Smart Note Taker"

export default function Command() {
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Save Note" onSubmit={() => {}} />
                </ActionPanel>
            }
        >
            <Form.TextArea
                id="note"
                title="Note"
                placeholder="Write anything - Phi-Silica will clean it up and file it..."
            />
        </Form>
    )
}
