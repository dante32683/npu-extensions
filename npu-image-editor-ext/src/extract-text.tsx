/* eslint-disable @raycast/prefer-title-case */
import {
    Action,
    ActionPanel,
    Form,
    Icon,
    List,
    showToast,
    Toast,
    environment,
    useNavigation,
    getPreferenceValues,
    open,
} from "@raycast/api"
import { useCallback, useEffect, useState } from "react"
import path from "path"
import fs from "fs"
import { getSelectedExplorerFiles, getClipboardImage, SelectedFile } from "./utils/powershell-utils"
import { runNpuCommand } from "./utils/run-npu-command"

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif", ".webp"]

interface Preferences {
    /** Command-level preference on Extract Text (OCR). */
    autoOpenTxt?: boolean
    autoOpenResult?: boolean
    showSuccessToasts?: boolean
}

type OcrResult = {
    file: string
    text: string
}

export function ExtractTextForm() {
    const prefs = getPreferenceValues<Preferences>()
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [extractedText, setExtractedText] = useState<string | null>(null)
    const { pop } = useNavigation()

    const fetchSelectedFiles = useCallback(async () => {
        setIsLoading(true)
        const files = await getSelectedExplorerFiles(IMAGE_EXTENSIONS)
        const clipboard = await getClipboardImage()

        const allFiles = [...files]
        if (clipboard && !allFiles.some(f => f.path === clipboard.path)) {
            allFiles.push(clipboard)
        }

        setSelectedFiles(allFiles)
        setIsLoading(false)
    }, [])

    useEffect(() => {
        fetchSelectedFiles()
    }, [fetchSelectedFiles])

    const runOcr = async (outputMode: string) => {
        if (selectedFiles.length === 0) return

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Extracting text from ${selectedFiles.length} image(s)...`,
        })

        const results: OcrResult[] = []
        let firstError: string | null = null

        for (const file of selectedFiles) {
            const outcome = await runNpuCommand("ocr", [file.path])
            if (outcome.ok) {
                results.push({ file: file.name, text: String(outcome.result.text ?? "") })
            } else {
                console.error(`[NpuBridge OCR error for ${file.name}]`, outcome.error)
                if (firstError === null) firstError = outcome.error
            }
        }

        if (results.length === 0) {
            toast.style = Toast.Style.Failure
            toast.title = "OCR Failed"
            toast.message = firstError ?? "No text could be extracted."
            return
        }

        const formattedText = results
            .map(res => `=== ${res.file} ===\n${res.text}`)
            .join("\n\n")
            .trim()

        if (outputMode === "file") {
            const outputDir = selectedFiles[0].path.startsWith(environment.assetsPath)
                ? process.env.USERPROFILE + "\\Desktop"
                : path.dirname(selectedFiles[0].path)

            const outputPath = path.join(outputDir!, "ocr_results.txt")
            try {
                fs.writeFileSync(outputPath, formattedText, "utf-8")
            } catch (error: unknown) {
                toast.style = Toast.Style.Failure
                toast.title = "OCR Failed"
                toast.message = error instanceof Error ? error.message : String(error)
                return
            }

            if (prefs.showSuccessToasts !== false) {
                toast.style = Toast.Style.Success
                toast.title = "Text Extracted"
                toast.message = `Saved to ocr_results.txt`
            } else {
                await toast.hide()
            }

            const openTxt =
                prefs.autoOpenTxt !== undefined ? prefs.autoOpenTxt !== false : prefs.autoOpenResult !== false
            if (openTxt) {
                await open(outputPath)
            }
            pop()
        } else {
            if (prefs.showSuccessToasts !== false) {
                toast.style = Toast.Style.Success
                toast.title = "Text Extracted"
            } else {
                await toast.hide()
            }
            setExtractedText(formattedText)
        }
    }

    if (isLoading) {
        return (
            <List isLoading={true}>
                <List.EmptyView title="Loading..." />
            </List>
        )
    }

    if (selectedFiles.length === 0) {
        return (
            <List>
                <List.EmptyView
                    title="No images selected"
                    description="Select images in Explorer or press Cmd+V to paste from clipboard."
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
            </List>
        )
    }

    if (extractedText !== null) {
        return (
            <Form
                actions={
                    <ActionPanel>
                        <Action.CopyToClipboard title="Copy to Clipboard" content={extractedText} />
                        <Action
                            title="Start Over"
                            icon={Icon.ArrowClockwise}
                            onAction={() => setExtractedText(null)}
                            shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                    </ActionPanel>
                }
            >
                <Form.TextArea
                    id="result"
                    title="Extracted Text"
                    value={extractedText}
                    onChange={setExtractedText}
                    enableMarkdown
                />
            </Form>
        )
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Extract Text"
                        onSubmit={async (values: { outputMode: string }) => {
                            await runOcr(values.outputMode)
                        }}
                    />
                </ActionPanel>
            }
        >
            <Form.Description text={`Selected ${selectedFiles.length} image(s) for OCR.`} />
            <Form.Dropdown id="outputMode" title="Output Mode" defaultValue="view">
                <Form.Dropdown.Item value="view" title="View in Raycast" />
                <Form.Dropdown.Item value="file" title="Save as .txt file" />
            </Form.Dropdown>
        </Form>
    )
}

export default function Command() {
    return <ExtractTextForm />
}
