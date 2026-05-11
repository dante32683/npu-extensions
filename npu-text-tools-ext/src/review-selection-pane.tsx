import { Action, ActionPanel, Detail, Icon, LaunchProps, Toast, showToast } from "@raycast/api"
import { pasteRewrittenAtSelection } from "./utils/selection-rewrite"

type ReviewContext = {
    title: string
    rewritten: string
    sourcePreview: string
    restoreClipboard: string | null
}

export default function Command(props: LaunchProps<{ launchContext?: ReviewContext }>) {
    const ctx = props.launchContext
    if (!ctx?.rewritten) {
        return (
            <Detail
                navigationTitle="Review Selection"
                markdown="## Nothing to show\n\nThis screen opens from a **Review Selection** command after text is captured."
            />
        )
    }

    const { title, rewritten, sourcePreview, restoreClipboard } = ctx

    const onReplace = async () => {
        try {
            await pasteRewrittenAtSelection(rewritten, restoreClipboard)
        } catch (e) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Replace failed",
                message: e instanceof Error ? e.message : String(e),
            })
        }
    }

    const esc = (s: string) => s.replace(/\r\n/g, "\n").replace(/```/g, "\\`\\`\\`")
    const md = `Review the rewrite, then **Replace Selection** (primary action, Enter).\n\n## Rewritten\n\n\`\`\`\n${esc(rewritten)}\n\`\`\`\n\n---\n\n### Original (excerpt)\n\n\`\`\`\n${esc(sourcePreview)}\n\`\`\``

    return (
        <Detail
            navigationTitle={title}
            markdown={md}
            actions={
                <ActionPanel>
                    <Action title="Replace Selection" icon={Icon.Checkmark} onAction={onReplace} />
                    <Action.CopyToClipboard title="Copy Result" content={rewritten} />
                </ActionPanel>
            }
        />
    )
}
