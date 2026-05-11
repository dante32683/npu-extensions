import { getPreferenceValues } from "@raycast/api"
import { TextRewriteCommand } from "./shared/TextRewriteCommand"

export default function Command() {
    const { prefillFromClipboard } = getPreferenceValues<Preferences.CustomRewrite>()
    return (
        <TextRewriteCommand
            mode="custom"
            title="Custom Rewrite"
            prefillFromClipboard={prefillFromClipboard !== false}
            requiresInstruction
        />
    )
}
