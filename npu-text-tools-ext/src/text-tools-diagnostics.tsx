import { Action, ActionPanel, Detail, Icon, Toast, open, showToast } from "@raycast/api"
import { useMemo } from "react"
import fs from "fs"
import path from "path"
import { SELECTION_HELPER_PATH } from "./utils/paths"
import { runVerifySelectionHelper } from "./utils/verify-selection-helper-run"

export default function Command() {
    const exists = fs.existsSync(SELECTION_HELPER_PATH)
    const markdown = useMemo(() => {
        const p = SELECTION_HELPER_PATH.replace(/\\/g, "/")
        return [
            "## Text Selection Helper",
            "",
            `**Path:** ${p}`,
            "",
            `**Exists:** ${exists ? "Yes" : "No"}`,
            "",
            exists
                ? "Run **Verify helper** to execute `noop` (same check as the old root command)."
                : "Publish the helper per `selection-helper/README.md`, then reload this extension.",
        ].join("\n")
    }, [exists])

    const onVerify = async () => {
        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Running helper check...",
            message: "Starting noop check.",
        })
        const result = await runVerifySelectionHelper()
        await toast.hide()
        if (result.ok) {
            await showToast({
                style: Toast.Style.Success,
                title: "TextSelectionHelper ran",
                message: result.detail,
            })
        } else {
            await showToast({
                style: Toast.Style.Failure,
                title: "Helper failed to start",
                message: result.error,
            })
        }
    }

    return (
        <Detail
            navigationTitle="Text Tools Diagnostics"
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action title="Verify Helper" icon={Icon.Checkmark} onAction={onVerify} />
                    <Action
                        title="Open Helper Folder"
                        icon={Icon.Folder}
                        onAction={() => open(path.dirname(SELECTION_HELPER_PATH))}
                    />
                    <Action.CopyToClipboard title="Copy Helper Path" content={SELECTION_HELPER_PATH} />
                </ActionPanel>
            }
        />
    )
}
