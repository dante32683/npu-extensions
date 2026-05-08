import { Form, ActionPanel, Action, showToast, Toast, environment, Clipboard, Icon, open } from "@raycast/api"
import { useEffect, useState } from "react"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import os from "os"
import { getNotesFolder, saveNote } from "./utils/note-utils"

const execFileAsync = promisify(execFile)
const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")

interface FormValues {
    note: string
}

export default function Command() {
    const [isLoadingClipboard, setIsLoadingClipboard] = useState(true)
    const [defaultNote, setDefaultNote] = useState("")

    useEffect(() => {
        Clipboard.readText()
            .then(text => setDefaultNote(text ?? ""))
            .catch(() => setDefaultNote(""))
            .finally(() => setIsLoadingClipboard(false))
    }, [])

    const handleSubmit = async (values: FormValues) => {
        const rawNote = values.note.trim()
        if (!rawNote) {
            await showToast({ style: Toast.Style.Failure, title: "No note provided" })
            return
        }

        if (!fs.existsSync(BRIDGE_PATH)) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Bridge not found",
                message: "Run: dotnet publish -c Release -r win-x64 --self-contained true",
            })
            return
        }

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Formatting with Phi-Silica...",
            message: "Classifying and cleaning up your note...",
        })

        let tempFile: string | null = null
        try {
            tempFile = path.join(os.tmpdir(), `phi-note-${Date.now()}.tmp`)
            fs.writeFileSync(tempFile, rawNote, "utf8")

            const { stdout } = await execFileAsync(BRIDGE_PATH, ["phi-note", tempFile], {
                cwd: path.dirname(BRIDGE_PATH),
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024,
            })

            const parsed = JSON.parse(stdout.trim())
            if (parsed.status !== "success") throw new Error(parsed.message ?? "Unknown bridge error")

            const { category, title, formattedMarkdown } = parsed
            const notesFolder = getNotesFolder()

            const now = new Date()
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

            const filePath = saveNote(
                notesFolder,
                {
                    date: dateStr,
                    category,
                    title,
                    raw: rawNote,
                },
                formattedMarkdown,
            )

            toast.style = Toast.Style.Success
            toast.title = "Note Saved"
            toast.message = `${category}/${path.basename(filePath)}`

            toast.primaryAction = {
                title: "Open Note",
                onAction: () => {
                    open(filePath)
                },
            }
        } catch (err: unknown) {
            toast.style = Toast.Style.Failure
            toast.title = "Phi-Silica error"
            toast.message = err instanceof Error ? err.message : String(err)
        } finally {
            if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        }
    }

    return (
        <Form
            isLoading={isLoadingClipboard}
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Save Note" icon={Icon.Checkmark} onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextArea
                id="note"
                title="Note"
                placeholder="Write anything - Phi-Silica will clean it up and file it..."
                defaultValue={defaultNote}
            />
        </Form>
    )
}
