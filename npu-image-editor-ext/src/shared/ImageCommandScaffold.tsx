import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api"
import { useCallback, useEffect, useState } from "react"
import { getSelectedExplorerFiles, SelectedFile } from "../utils/powershell-utils"

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif", ".webp"]

type ImageCommandScaffoldProps = {
    title: string
    actionTitle: string
}

export function ImageCommandScaffold({ title, actionTitle }: ImageCommandScaffoldProps) {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchSelectedFiles = useCallback(async () => {
        setIsLoading(true)
        setSelectedFiles(await getSelectedExplorerFiles(IMAGE_EXTENSIONS))
        setIsLoading(false)
    }, [])

    useEffect(() => {
        fetchSelectedFiles()
    }, [fetchSelectedFiles])

    const showPendingToast = async () => {
        await showToast({
            style: Toast.Style.Failure,
            title: "Not Implemented Yet",
            message: "This command is scaffolded; implementation is tracked in FEATURE_PLAN.md.",
        })
    }

    return (
        <List isLoading={isLoading} searchBarPlaceholder="Selected images in Explorer...">
            {selectedFiles.map(file => (
                <List.Item
                    key={file.path}
                    title={file.name}
                    subtitle={file.path}
                    icon={Icon.Image}
                    actions={
                        <ActionPanel>
                            <Action title={actionTitle} icon={Icon.Wand} onAction={showPendingToast} />
                            <Action
                                title="Refresh Selection"
                                icon={Icon.ArrowClockwise}
                                onAction={fetchSelectedFiles}
                            />
                        </ActionPanel>
                    }
                />
            ))}
            {selectedFiles.length === 0 ? (
                <List.EmptyView
                    title="No images selected"
                    description={`Select images in Explorer to use ${title}.`}
                    icon={Icon.Image}
                    actions={
                        <ActionPanel>
                            <Action
                                title="Refresh Selection"
                                icon={Icon.ArrowClockwise}
                                onAction={fetchSelectedFiles}
                            />
                        </ActionPanel>
                    }
                />
            ) : null}
        </List>
    )
}
