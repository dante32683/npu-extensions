import { getPreferenceValues } from "@raycast/api"
import { TextRewriteCommand } from "./shared/TextRewriteCommand"

export default function Command() {
    const { prefillFromClipboard } = getPreferenceValues<Preferences.MakeFormal>()
    return (
        <TextRewriteCommand mode="formal" title="Make Formal" prefillFromClipboard={prefillFromClipboard !== false} />
    )
}
