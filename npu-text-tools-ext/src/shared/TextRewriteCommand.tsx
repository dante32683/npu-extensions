import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api"

type TextRewriteCommandProps = {
    mode: "grammar" | "formal" | "concise" | "bullets" | "simplify" | "custom"
    title: string
    textPlaceholder?: string
    requiresInstruction?: boolean
}

export function TextRewriteCommand({ title, textPlaceholder, requiresInstruction = false }: TextRewriteCommandProps) {
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title={title}
                        onSubmit={async () => {
                            await showToast({
                                style: Toast.Style.Failure,
                                title: "Phi-Silica bridge pending",
                                message: "This command is scaffolded; implementation is tracked in FEATURE_PLAN.md.",
                            })
                        }}
                    />
                </ActionPanel>
            }
        >
            {requiresInstruction ? (
                <Form.TextField
                    id="instruction"
                    title="Instruction"
                    placeholder='e.g. "make this somewhat formal but still friendly"'
                />
            ) : null}
            <Form.TextArea id="text" title="Text" placeholder={textPlaceholder ?? "Paste your text here..."} />
        </Form>
    )
}
