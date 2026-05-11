import {
    List,
    ActionPanel,
    Action,
    Alert,
    Icon,
    open,
    showToast,
    Toast,
    confirmAlert,
    getPreferenceValues,
} from "@raycast/api"
import { useEffect, useState, useMemo } from "react"
import path from "path"
import fs from "fs"
import { execFile } from "child_process"
import { promisify } from "util"
import { getNotesFolder, getAllNotes, Note } from "./utils/note-utils"

const execFileAsync = promisify(execFile)

interface Preferences {
    showSuccessToasts?: boolean
}

export default function Command() {
    const prefs = getPreferenceValues<Preferences>()
    const [notes, setNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchText, setSearchText] = useState("")

    useEffect(() => {
        try {
            const folder = getNotesFolder()
            const allNotes = getAllNotes(folder)
            setNotes(allNotes)
        } catch (error) {
            showToast({
                style: Toast.Style.Failure,
                title: "Failed to Load Notes",
                message: "Check that your notes folder exists and is readable.",
            })
        } finally {
            setIsLoading(false)
        }
    }, [])

    const groupedNotes = useMemo(() => {
        const filtered = notes.filter(note => {
            const search = searchText.toLowerCase()
            return (
                note.title.toLowerCase().includes(search) ||
                note.content.toLowerCase().includes(search) ||
                note.category.toLowerCase().includes(search)
            )
        })

        const groups: Record<string, Note[]> = {}
        for (const note of filtered) {
            if (!groups[note.category]) groups[note.category] = []
            groups[note.category].push(note)
        }
        return groups
    }, [notes, searchText])

    const categories = Object.keys(groupedNotes).sort()

    const moveToRecycleBin = async (filePath: string) => {
        // Prefer Recycle Bin over permanent delete.
        // If this fails, we do NOT fall back to permanent deletion.
        const script = `& {
  $p = ${JSON.stringify(filePath)}
  Add-Type -AssemblyName Microsoft.VisualBasic
  [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
    $p,
    [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
    [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin
  )
}`

        try {
            await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script], {
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024,
            })
        } catch (err: unknown) {
            const e = err as { stderr?: string; message?: string }
            const details = e.stderr?.trim()
            throw new Error(details || e.message || "Failed to move file to Recycle Bin.")
        }
    }

    const deleteNote = async (note: Note) => {
        const confirmed = await confirmAlert({
            title: "Delete Note",
            message: `Move "${note.title.replace(/-/g, " ")}" to the Recycle Bin?`,
            primaryAction: {
                title: "Delete Note",
                style: Alert.ActionStyle.Destructive,
            },
        })

        if (!confirmed) return

        try {
            if (!fs.existsSync(note.path)) {
                throw new Error("File not found.")
            }

            await moveToRecycleBin(note.path)
            setNotes(prev => prev.filter(n => n.path !== note.path))

            if (prefs.showSuccessToasts !== false) {
                await showToast({
                    style: Toast.Style.Success,
                    title: "Note Deleted",
                    message: path.basename(note.path),
                })
            }
        } catch (err) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Delete Failed",
                message: err instanceof Error ? err.message : String(err),
            })
        }
    }

    return (
        <List
            isLoading={isLoading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Search notes by title, content, or category..."
        >
            {categories.length === 0 && !isLoading ? (
                <List.EmptyView title="No notes found" icon={Icon.TextDocument} />
            ) : (
                categories.map(category => (
                    <List.Section key={category} title={category.toUpperCase()}>
                        {groupedNotes[category].map(note => (
                            <List.Item
                                key={note.path}
                                title={note.title.replace(/-/g, " ")}
                                subtitle={note.content.split("\n")[0]}
                                accessories={[{ text: note.date.split(" ")[0], icon: Icon.Calendar }]}
                                actions={
                                    <ActionPanel>
                                        <Action.Open title="Open in Editor" target={note.path} />
                                        <Action.CopyToClipboard title="Copy Content" content={note.content} />
                                        <Action
                                            title="Open Folder"
                                            icon={Icon.Folder}
                                            onAction={() => open(path.dirname(note.path))}
                                        />
                                        <ActionPanel.Section title="Manage">
                                            <Action
                                                title="Delete Note"
                                                icon={Icon.Trash}
                                                style={Action.Style.Destructive}
                                                shortcut={{ modifiers: ["ctrl"], key: "d" }}
                                                onAction={() => deleteNote(note)}
                                            />
                                        </ActionPanel.Section>
                                    </ActionPanel>
                                }
                            />
                        ))}
                    </List.Section>
                ))
            )}
        </List>
    )
}
