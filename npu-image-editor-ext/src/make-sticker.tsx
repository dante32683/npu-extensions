/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel, Form, Icon, Toast, showToast, getPreferenceValues, open } from "@raycast/api"
import fs from "fs"
import path from "path"
import { useEffect, useState } from "react"
import { Jimp } from "jimp"
import { SelectedFile, getSelectedExplorerFiles } from "./utils/powershell-utils"
import { runNpuCommand } from "./utils/run-npu-command"
import { encodeRgbaToWebp } from "./utils/webp-encoder"

interface Preferences {
    autoOpenResult?: boolean
    showSuccessToasts?: boolean
}

export default function Command() {
    const prefs = getPreferenceValues<Preferences>()
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchFiles() {
            const images = await getSelectedExplorerFiles([".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif", ".webp"])
            setSelectedFiles(images)
            setIsLoading(false)
        }
        fetchFiles()
    }, [])

    async function handleMakeSticker() {
        if (selectedFiles.length === 0) {
            await showToast({
                style: Toast.Style.Failure,
                title: "No Images Selected",
                message: "Select an image in Explorer first.",
            })
            return
        }

        if (selectedFiles.length !== 1) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Select One Image",
                message: "Make Sticker currently supports one image at a time.",
            })
            return
        }

        const file = selectedFiles[0]

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Running NPU Make Sticker...",
            message: "First run may take a moment to prepare the NPU model.",
        })

        const outcome = await runNpuCommand("make-sticker", [file.path])
        if (!outcome.ok) {
            toast.style = Toast.Style.Failure
            toast.title = "Make Sticker Failed"
            toast.message = outcome.error
            return
        }

        const rawPngPath = String(outcome.result.outputPath ?? "")
        const subjectDetected = Boolean(outcome.result.subjectDetected)

        if (!rawPngPath) {
            toast.style = Toast.Style.Failure
            toast.title = "Make Sticker Failed"
            toast.message = "Bridge returned success but no outputPath."
            return
        }

        const baseName = path.basename(file.name, file.extension)
        const outputFileName = `${baseName}_sticker.webp`
        const finalOutputPath = path.join(path.dirname(file.path), outputFileName)

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const image = await (Jimp as any).read(rawPngPath)

            const stickerSize = 480
            image.contain({
                w: stickerSize,
                h: stickerSize,
                background: 0x00000000,
            })

            const rgba = new Uint8ClampedArray(
                image.bitmap.data.buffer,
                image.bitmap.data.byteOffset,
                image.bitmap.data.byteLength,
            )
            const outBytes = await encodeRgbaToWebp(rgba, image.bitmap.width, image.bitmap.height)
            await fs.promises.writeFile(finalOutputPath, outBytes)

            if (prefs.showSuccessToasts !== false) {
                toast.style = Toast.Style.Success
                toast.title = "Make Sticker Complete"
                toast.message = subjectDetected
                    ? `Saved to ${outputFileName}.`
                    : `No clear subject detected — center crop used. Saved to ${outputFileName}.`
            } else {
                await toast.hide()
            }

            if (prefs.autoOpenResult) {
                await open(finalOutputPath)
            }
        } catch (error: unknown) {
            toast.style = Toast.Style.Failure
            toast.title = "Make Sticker Failed"
            toast.message = error instanceof Error ? error.message : String(error)
        } finally {
            try {
                await fs.promises.unlink(rawPngPath)
            } catch {
                // ignore cleanup errors
            }
        }
    }

    if (isLoading) return <Form isLoading={true} />

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Make Sticker" icon={Icon.Wand} onSubmit={handleMakeSticker} />
                </ActionPanel>
            }
        >
            <Form.Description
                text={`This will generate a 480×480 transparent WebP sticker from the selected image. Selected ${selectedFiles.length} image(s).`}
            />
        </Form>
    )
}
