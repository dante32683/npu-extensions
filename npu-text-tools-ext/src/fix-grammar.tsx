import { getPreferenceValues } from "@raycast/api"
import { TextRewriteCommand } from "./shared/TextRewriteCommand"

export default function Command() {
    const { prefillFromClipboard } = getPreferenceValues<Preferences.FixGrammar>()
    return (
        <TextRewriteCommand mode="grammar" title="Fix Grammar" prefillFromClipboard={prefillFromClipboard !== false} />
    )
}
