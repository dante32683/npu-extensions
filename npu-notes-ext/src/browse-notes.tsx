import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api"

// TODO: implement client-side markdown note browsing
// See FEATURE_PLAN.md section "Browse Notes command"

export default function Command() {
    const showPendingToast = async () => {
        await showToast({
            style: Toast.Style.Failure,
            title: "Browse Notes pending",
            message: "This command is scaffolded; implementation is tracked in FEATURE_PLAN.md.",
        })
    }

    return (
        <List searchBarPlaceholder="Filter saved notes..." isLoading={false}>
            <List.EmptyView
                title="Browse Notes"
                description="Notes browsing is scaffolded but not implemented yet."
                icon={Icon.Document}
                actions={
                    <ActionPanel>
                        <Action title="Show Status" icon={Icon.Info} onAction={showPendingToast} />
                    </ActionPanel>
                }
            />
        </List>
    )
}
