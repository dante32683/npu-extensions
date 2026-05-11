import { getPreferenceValues } from "@raycast/api"
import { TextRewriteCommand } from "./shared/TextRewriteCommand"

export default function Command() {
    const { prefillFromClipboard } = getPreferenceValues<Preferences.BulletPoints>()
    return (
        <TextRewriteCommand
            mode="bullets"
            title="Bullet Points"
            prefillFromClipboard={prefillFromClipboard !== false}
        />
    )
}
