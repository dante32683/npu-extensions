import { getPreferenceValues } from "@raycast/api"
import { TextRewriteCommand } from "./shared/TextRewriteCommand"

export default function Command() {
    const { prefillFromClipboard } = getPreferenceValues<Preferences.MakeConcise>()
    return (
        <TextRewriteCommand mode="concise" title="Make Concise" prefillFromClipboard={prefillFromClipboard !== false} />
    )
}
