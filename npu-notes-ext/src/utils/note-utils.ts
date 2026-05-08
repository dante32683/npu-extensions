import { getPreferenceValues } from "@raycast/api"
import path from "path"
import fs from "fs"
import os from "os"

export interface Preferences {
    notesFolder?: string
}

export function getNotesFolder(): string {
    const prefs = getPreferenceValues<Preferences>()
    const folder = prefs.notesFolder || path.join(os.homedir(), "Documents", "RaycastNotes")

    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true })
    }

    return folder
}

export interface Note {
    path: string
    date: string
    category: string
    title: string
    raw: string
    content: string
}

export function parseNote(filePath: string): Note {
    const fileContent = fs.readFileSync(filePath, "utf8")
    const lines = fileContent.split("\n")

    let date = ""
    let category = ""
    let title = ""
    let raw = ""
    let content = ""
    let inFrontmatter = false
    let frontmatterEnded = false

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.trim() === "---") {
            if (!inFrontmatter && !frontmatterEnded) {
                inFrontmatter = true
                continue
            } else if (inFrontmatter) {
                inFrontmatter = false
                frontmatterEnded = true
                continue
            }
        }

        if (inFrontmatter) {
            if (line.startsWith("date: ")) date = line.replace("date: ", "").trim()
            else if (line.startsWith("category: ")) category = line.replace("category: ", "").trim()
            else if (line.startsWith("title: ")) title = line.replace("title: ", "").trim()
            else if (line.startsWith("raw: ")) {
                try {
                    raw = JSON.parse(line.replace("raw: ", "").trim())
                } catch {
                    raw = line.replace("raw: ", "").trim()
                }
            }
        } else if (frontmatterEnded) {
            content += line + "\n"
        }
    }

    return {
        path: filePath,
        date,
        category,
        title,
        raw,
        content: content.trim(),
    }
}

export function saveNote(
    folder: string,
    metadata: { date: string; category: string; title: string; raw: string },
    content: string,
): string {
    const categoryFolder = path.join(folder, metadata.category)
    if (!fs.existsSync(categoryFolder)) {
        fs.mkdirSync(categoryFolder, { recursive: true })
    }

    const dateStr = metadata.date.split(" ")[0] // YYYY-MM-DD
    const fileName = `${dateStr}_${metadata.title}.md`
    const filePath = path.join(categoryFolder, fileName)

    const fileContent = `---
date: ${metadata.date}
category: ${metadata.category}
title: ${metadata.title}
raw: ${JSON.stringify(metadata.raw)}
---

${content}
`

    fs.writeFileSync(filePath, fileContent, "utf8")
    return filePath
}

export function getAllNotes(rootFolder: string): Note[] {
    const notes: Note[] = []
    if (!fs.existsSync(rootFolder)) return notes

    const categories = fs.readdirSync(rootFolder)
    for (const category of categories) {
        const categoryPath = path.join(rootFolder, category)
        if (fs.statSync(categoryPath).isDirectory()) {
            const files = fs.readdirSync(categoryPath)
            for (const file of files) {
                if (file.endsWith(".md")) {
                    try {
                        notes.push(parseNote(path.join(categoryPath, file)))
                    } catch (e) {
                        console.error(`Failed to parse note ${file}:`, e)
                    }
                }
            }
        }
    }

    return notes.sort((a, b) => b.date.localeCompare(a.date))
}
