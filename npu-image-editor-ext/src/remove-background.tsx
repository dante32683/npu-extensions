import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, showToast, open } from "@raycast/api"
import { useEffect, useState } from "react"
import { SelectedFile, getSelectedExplorerFiles } from "./utils/powershell-utils"
import { runNpuCommand } from "./utils/run-npu-command"

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif", ".webp"]

interface Preferences {
    showSuccessToasts?: boolean
    autoOpenResult?: boolean
}

export default function Command() {
    const prefs = getPreferenceValues<Preferences>()
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchFiles() {
            const images = await getSelectedExplorerFiles(IMAGE_EXTENSIONS)
            setSelectedFiles(images)
            setIsLoading(false)
        }
        void fetchFiles()
    }, [])

    async function handleRemoveBackground() {
        if (selectedFiles.length === 0) {
            await showToast({
                style: Toast.Style.Failure,
                title: "No Images Selected",
                message: "Select images in Explorer first.",
            })
            return
        }

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Removing background…",
            message: "First run may take a moment to prepare the NPU model.",
        })

        let successCount = 0
        let firstError: string | null = null
        let lastOutputPath: string | null = null

        for (const file of selectedFiles) {
            const outcome = await runNpuCommand("remove-background", [file.path])
            if (outcome.ok) {
                successCount++
                lastOutputPath = outcome.result.outputPath ?? null
            } else if (firstError === null) {
                firstError = outcome.error
            }
        }

        if (firstError === null) {
            if (prefs.showSuccessToasts !== false) {
                toast.style = Toast.Style.Success
                toast.title = "Remove Background Complete"
                toast.message = `Processed ${successCount} image(s).`
            } else {
                await toast.hide()
            }

            if (prefs.autoOpenResult !== false && lastOutputPath) {
                await open(lastOutputPath)
            }
        } else {
            toast.style = Toast.Style.Failure
            toast.title = "Remove Background Failed"
            toast.message = firstError
        }
    }

    if (isLoading) {
        return <Form isLoading={true} />
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Remove Background" icon={Icon.Wand} onSubmit={handleRemoveBackground} />
                </ActionPanel>
            }
        >
            <Form.Description
                text={`Removes the background from ${selectedFiles.length} selected image(s) using on-device segmentation.`}
            />
        </Form>
    )
}
