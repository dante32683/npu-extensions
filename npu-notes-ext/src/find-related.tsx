import { Action, ActionPanel, Icon, List, Toast, environment, getPreferenceValues, open, showToast } from "@raycast/api"
import fs from "fs"
import os from "os"
import path from "path"
import { execFile } from "child_process"
import { useMemo, useState } from "react"
import { promisify } from "util"
import { getAllNotes, getNotesFolder, Note } from "./utils/note-utils"
import { ensureBridgeRegisteredOnce } from "./utils/ensure-bridge-registered"
import { applyPhiFailureToToast } from "./utils/present-phi-error"

const execFileAsync = promisify(execFile)

const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")
const BRIDGE_BIN_DIR = path.join(environment.assetsPath, "bin")
const BRIDGE_MANIFEST_SOURCE = path.join(environment.assetsPath, "..", "bridge", "Package.appxmanifest")
const BRIDGE_IDENTITY = "NpuNotesBridge.Identity"

interface Preferences {
    ensureModelReady?: boolean
}

const MAX_CANDIDATES = 20
const MAX_LINKS = 5
const PREVIEW_CHARS = 200

type RelatedRequest = {
    newNote: {
        path: string
        title: string
        category: string
        preview: string
    }
    candidates: Array<{
        path: string
        title: string
        category: string
        preview: string
    }>
    maxLinks: number
}

function notePreview(note: Note): string {
    const singleLine = note.content.replace(/\s+/g, " ").trim()
    return singleLine.length <= PREVIEW_CHARS ? singleLine : `${singleLine.slice(0, PREVIEW_CHARS).trim()}...`
}

function noteIdFromPath(rootFolder: string, filePath: string): string {
    const rel = path.relative(rootFolder, filePath).replace(/\\/g, "/")
    return rel.endsWith(".md") ? rel.slice(0, -3) : rel
}

async function runRelatedBridge(request: RelatedRequest, ensureReady: boolean): Promise<{ related: string[] }> {
    if (!fs.existsSync(BRIDGE_PATH)) {
        throw new Error("Bridge not found. Run: dotnet publish -c Release -r win-x64 --self-contained true.")
    }

    await ensureBridgeRegisteredOnce({
        identityName: BRIDGE_IDENTITY,
        binDir: BRIDGE_BIN_DIR,
        manifestSourcePath: BRIDGE_MANIFEST_SOURCE,
    })

    const tempFile = path.join(os.tmpdir(), `phi-related-${Date.now()}.json`)
    try {
        fs.writeFileSync(tempFile, JSON.stringify(request), "utf8")

        let stdout = ""
        let stderr = ""
        try {
            const args = ["phi-related", tempFile]
            if (ensureReady) args.push("--ensure-ready")

            const result = await execFileAsync(BRIDGE_PATH, args, {
                cwd: path.dirname(BRIDGE_PATH),
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024,
            })
            stdout = result.stdout
            stderr = result.stderr
        } catch (err: unknown) {
            const e = err as { stdout?: string; stderr?: string; message?: string }
            stdout = e.stdout ?? ""
            stderr = e.stderr ?? ""
            if (!stdout.trim()) throw new Error(stderr.trim() || e.message || "Bridge failed.")
        }

        const parsed = JSON.parse(stdout.trim()) as { status: string; related?: string[]; message?: string }
        if (parsed.status !== "success") throw new Error(parsed.message ?? "Unknown bridge error")

        return { related: Array.isArray(parsed.related) ? parsed.related : [] }
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
    }
}

export default function Command() {
    const prefs = getPreferenceValues<Preferences>()
    const [searchText, setSearchText] = useState("")
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
    const [relatedIds, setRelatedIds] = useState<string[] | null>(null)
    const [isFinding, setIsFinding] = useState(false)

    const notesFolder = useMemo(() => getNotesFolder(), [])
    const allNotes = useMemo(() => getAllNotes(notesFolder), [notesFolder])

    const notesById = useMemo(() => {
        const map = new Map<string, Note>()
        for (const note of allNotes) map.set(noteIdFromPath(notesFolder, note.path), note)
        return map
    }, [allNotes, notesFolder])

    const filteredNotes = useMemo(() => {
        const search = searchText.trim().toLowerCase()
        if (!search) return allNotes

        return allNotes.filter(note => {
            return (
                note.title.toLowerCase().includes(search) ||
                note.content.toLowerCase().includes(search) ||
                note.category.toLowerCase().includes(search)
            )
        })
    }, [allNotes, searchText])

    const selectedNote = selectedNoteId ? notesById.get(selectedNoteId) : null

    const relatedNotes = useMemo(() => {
        if (!relatedIds) return null
        const result: Note[] = []
        for (const id of relatedIds) {
            const note = notesById.get(id)
            if (note) result.push(note)
        }
        return result
    }, [notesById, relatedIds])

    const findRelated = async () => {
        if (!selectedNote) {
            await showToast({
                style: Toast.Style.Failure,
                title: "No Note Selected",
                message: "Select a note in the list first.",
            })
            return
        }

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Finding Related Notes...",
            message: "Phi-Silica is comparing recent notes...",
        })

        setIsFinding(true)
        try {
            const selectedId = noteIdFromPath(notesFolder, selectedNote.path)

            const candidates = allNotes
                .filter(n => noteIdFromPath(notesFolder, n.path) !== selectedId)
                .slice(0, MAX_CANDIDATES)

            const request: RelatedRequest = {
                newNote: {
                    path: selectedId,
                    title: selectedNote.title,
                    category: selectedNote.category,
                    preview: notePreview(selectedNote),
                },
                candidates: candidates.map(n => ({
                    path: noteIdFromPath(notesFolder, n.path),
                    title: n.title,
                    category: n.category,
                    preview: notePreview(n),
                })),
                maxLinks: MAX_LINKS,
            }

            const { related } = await runRelatedBridge(request, prefs.ensureModelReady !== false)

            const candidateSet = new Set(request.candidates.map(c => c.path))
            const cleaned = related.filter(p => typeof p === "string" && candidateSet.has(p))

            setRelatedIds(cleaned)

            toast.style = Toast.Style.Success
            toast.title = "Related Notes Found"
            toast.message =
                cleaned.length === 0 ? "No related notes found." : `Found ${cleaned.length} related note(s).`
        } catch (err) {
            await applyPhiFailureToToast(toast, err, { title: "Find Related Notes Failed" })
        } finally {
            setIsFinding(false)
        }
    }

    if (relatedNotes) {
        return (
            <List
                isLoading={isFinding}
                searchBarPlaceholder="Search related notes..."
                navigationTitle={
                    selectedNote ? `Related to: ${selectedNote.title.replace(/-/g, " ")}` : "Related Notes"
                }
            >
                {relatedNotes.length === 0 ? (
                    <List.EmptyView title="No related notes found" icon={Icon.MagnifyingGlass} />
                ) : (
                    relatedNotes.map(note => (
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
                                    <Action
                                        title="Choose Another Note"
                                        icon={Icon.ArrowLeft}
                                        onAction={() => setRelatedIds(null)}
                                    />
                                </ActionPanel>
                            }
                        />
                    ))
                )}
            </List>
        )
    }

    return (
        <List
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Pick a note to find related notes..."
            onSelectionChange={id => setSelectedNoteId(id)}
        >
            {filteredNotes.length === 0 ? (
                <List.EmptyView title="No notes found" icon={Icon.TextDocument} />
            ) : (
                filteredNotes.map(note => {
                    const id = noteIdFromPath(notesFolder, note.path)
                    return (
                        <List.Item
                            key={note.path}
                            id={id}
                            title={note.title.replace(/-/g, " ")}
                            subtitle={note.content.split("\n")[0]}
                            accessories={[{ text: note.date.split(" ")[0], icon: Icon.Calendar }]}
                            actions={
                                <ActionPanel>
                                    <Action
                                        title="Find Related Notes"
                                        icon={Icon.MagnifyingGlass}
                                        onAction={findRelated}
                                    />
                                    <Action.Open title="Open in Editor" target={note.path} />
                                    <Action.CopyToClipboard title="Copy Content" content={note.content} />
                                    <Action
                                        title="Open Folder"
                                        icon={Icon.Folder}
                                        onAction={() => open(path.dirname(note.path))}
                                    />
                                </ActionPanel>
                            }
                        />
                    )
                })
            )}
        </List>
    )
}
