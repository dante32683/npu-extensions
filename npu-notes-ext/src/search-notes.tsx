import { List } from "@raycast/api"

// TODO: implement note search
// See FEATURE_PLAN.md § "Search Notes (stretch goal)"

export default function Command() {
    return <List searchBarPlaceholder="Search your notes..." isLoading={false} />
}
