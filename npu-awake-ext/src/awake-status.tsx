import { Action, ActionPanel, Icon, List } from "@raycast/api"
import { showAwakePendingToast } from "./shared/showAwakePendingToast"

// TODO: read keeper PID and mode from LocalStorage.
// See FEATURE_PLAN.md section "Awake".

export default function Command() {
    return (
        <List isLoading={false}>
            <List.Item
                title="Awake status unavailable"
                subtitle="AwakeKeeper integration is scaffolded but not implemented yet."
                icon={Icon.Clock}
                actions={
                    <ActionPanel>
                        <Action
                            title="Show Status"
                            icon={Icon.Info}
                            onAction={() => showAwakePendingToast("Awake Status pending")}
                        />
                    </ActionPanel>
                }
            />
        </List>
    )
}
