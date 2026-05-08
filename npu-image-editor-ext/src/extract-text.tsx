/* eslint-disable @typescript-eslint/no-explicit-any, @raycast/prefer-title-case */
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
} from "@raycast/api"
import { useCallback, useEffect, useState } from "react"
import { getSelectedExplorerFiles, getClipboardImage, SelectedFile } from "./utils/powershell-utils"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execFileAsync = promisify(execFile)
const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif", ".webp"]

type OcrResult = {
    file: string
    text: string
}

export function ExtractTextForm() {
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

        const preferences = getPreferenceValues<{ autoOpenTxt: boolean }>()
        const autoOpen = preferences.autoOpenTxt

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Extracting text from ${selectedFiles.length} image(s)...`,
        })

        if (!fs.existsSync(BRIDGE_PATH)) {
            toast.style = Toast.Style.Failure
            toast.title = "Bridge Not Found"
            toast.message = `NpuBridge.exe missing.`
            return
        }

        const results: OcrResult[] = []

        try {
            for (const file of selectedFiles) {
                const { stdout, stderr } = await execFileAsync(BRIDGE_PATH, ["ocr", file.path], {
                    cwd: path.dirname(BRIDGE_PATH),
                    windowsHide: true,
                })

                if (stderr) console.error("[NpuBridge OCR stderr]", stderr)

                const result = JSON.parse(stdout)
                if (result.status === "success") {
                    results.push({ file: file.name, text: result.text })
                } else {
                    console.error(`[NpuBridge OCR error for ${file.name}]`, result.message)
                }
            }

            if (results.length === 0) {
                toast.style = Toast.Style.Failure
                toast.title = "OCR Failed"
                toast.message = "No text could be extracted."
                return
            }

            let formattedText = ""
            for (const res of results) {
                formattedText += `=== ${res.file} ===\n${res.text}\n\n`
            }
            formattedText = formattedText.trim()

            if (outputMode === "file") {
                const outputDir = selectedFiles[0].path.startsWith(environment.assetsPath)
                    ? process.env.USERPROFILE + "\\Desktop"
                    : path.dirname(selectedFiles[0].path)

                const outputPath = path.join(outputDir!, "ocr_results.txt")
                fs.writeFileSync(outputPath, formattedText, "utf-8")

                toast.style = Toast.Style.Success
                toast.title = "Text Extracted"
                toast.message = `Saved to ocr_results.txt`

                if (autoOpen) {
                    execFile("powershell.exe", ["-NoProfile", "-Command", `Invoke-Item '${outputPath}'`])
                }
                pop() // close the form
            } else {
                toast.style = Toast.Style.Success
                toast.title = "Text Extracted"
                setExtractedText(formattedText)
            }
        } catch (error: any) {
            toast.style = Toast.Style.Failure
            toast.title = "OCR Failed"
            toast.message = String(error)
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
