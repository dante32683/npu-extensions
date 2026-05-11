import { getPreferenceValues } from "@raycast/api"
import { TextRewriteCommand } from "./shared/TextRewriteCommand"

export default function Command() {
    const { prefillFromClipboard } = getPreferenceValues<Preferences.Simplify>()
    return <TextRewriteCommand mode="simplify" title="Simplify" prefillFromClipboard={prefillFromClipboard !== false} />
}
