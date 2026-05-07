/* eslint-disable @typescript-eslint/no-explicit-any, @raycast/prefer-title-case */
import { Form, ActionPanel, Action, showToast, Toast, environment, Icon } from "@raycast/api"
import { useEffect, useState } from "react"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import { getSelectedExplorerFiles, SelectedFile } from "./utils/powershell-utils"

const execFileAsync = promisify(execFile)
const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")

export default function Command() {
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

    async function handleUpscale(values: { factor: string }) {
        if (selectedFiles.length === 0) {
            await showToast({ style: Toast.Style.Failure, title: "No images selected" })
            return
        }

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Running NPU Super Resolution...`,
            message: "First run may take a moment to prepare the NPU model.",
        })

        if (!fs.existsSync(BRIDGE_PATH)) {
            toast.style = Toast.Style.Failure
            toast.title = "Bridge Not Found"
            toast.message = `NpuBridge.exe missing. Run: dotnet publish -c Release -r win-x64 --self-contained true`
            return
        }

        let successCount = 0
        try {
            for (const file of selectedFiles) {
                const { stdout, stderr } = await execFileAsync(
                    BRIDGE_PATH,
                    ["super-resolution", file.path, values.factor],
                    {
                        cwd: path.dirname(BRIDGE_PATH),
                        windowsHide: true,
                    },
                )

                if (stderr) console.error("[NpuBridge]", stderr)
                const result = JSON.parse(stdout)
                if (result.status !== "success") {
                    throw new Error(result.message)
                }
                successCount++
            }
            toast.style = Toast.Style.Success
            toast.title = "Success"
            toast.message = `Upscaled ${successCount} image(s)`
        } catch (error: any) {
            toast.style = Toast.Style.Failure
            toast.title = "Upscaling failed"
            const msg =
                error?.code === "UNKNOWN"
                    ? `Bridge failed to start. Rebuild: cd bridge && dotnet publish -c Release -r win-x64 --self-contained true`
                    : String(error)
            toast.message = msg
        }
    }

    if (isLoading) {
        return <Form isLoading={true} />
    }

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Upscale Images" icon={Icon.MagnifyingGlass} onSubmit={handleUpscale} />
                </ActionPanel>
            }
        >
            <Form.Dropdown id="factor" title="Scale Factor" defaultValue="2">
                <Form.Dropdown.Item value="2" title="2x" />
                <Form.Dropdown.Item value="4" title="4x" />
            </Form.Dropdown>
            <Form.Description
                text={`This will upscale ${selectedFiles.length} selected image(s) using the on-device NPU ImageScaler.`}
            />
        </Form>
    )
}
