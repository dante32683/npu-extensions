import { List, ActionPanel, Action, Icon, open, showToast, Toast } from "@raycast/api"
import { useEffect, useState, useMemo } from "react"
import path from "path"
import { getNotesFolder, getAllNotes, Note } from "./utils/note-utils"

export default function Command() {
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
