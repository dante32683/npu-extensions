import { Action, ActionPanel, Icon, List, Toast, environment, open, showToast, getPreferenceValues } from "@raycast/api"
import { execFile } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { useEffect, useMemo, useRef, useState } from "react"
import { promisify } from "util"
import { getAllNotes, getNotesFolder, Note } from "./utils/note-utils"
import { ensureBridgeRegisteredOnce } from "./utils/ensure-bridge-registered"
import { showPhiFailureToast } from "./utils/present-phi-error"

const execFileAsync = promisify(execFile)

const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")
const BRIDGE_BIN_DIR = path.join(environment.assetsPath, "bin")
const BRIDGE_MANIFEST_SOURCE = path.join(environment.assetsPath, "..", "bridge", "Package.appxmanifest")
const BRIDGE_IDENTITY = "NpuNotesBridge.Identity"

const PREVIEW_CHARS = 280
const MIN_QUERY_CHARS_FOR_PHI = 3
const KEYWORD_RESULTS_BEFORE_PHI = 3
const DEFAULT_MAX_PHI_CHECKS = 30

interface Preferences {
    semanticSearchDebounce?: string
    maxSemanticChecks?: string
    maxSemanticResults?: string
    showSuccessToasts?: boolean
    ensureModelReady?: boolean
}

type SearchRelevanceRequest = {
    query: string
    candidate: {
        path: string
        title: string
        category: string
        preview: string
    }
}

function normalizeForSearch(text: string): string {
    return text.toLowerCase()
}

function notePreview(note: Note): string {
    const singleLine = note.content.replace(/\s+/g, " ").trim()
    return singleLine.length <= PREVIEW_CHARS ? singleLine : `${singleLine.slice(0, PREVIEW_CHARS).trim()}...`
}

function noteIdFromPath(rootFolder: string, filePath: string): string {
    const rel = path.relative(rootFolder, filePath).replace(/\\/g, "/")
    return rel.endsWith(".md") ? rel.slice(0, -3) : rel
}

async function runPhiRelevance(request: SearchRelevanceRequest, ensureReady: boolean): Promise<boolean> {
    if (!fs.existsSync(BRIDGE_PATH)) {
        throw new Error("Bridge not found. Run: dotnet publish -c Release -r win-x64 --self-contained true.")
    }

    await ensureBridgeRegisteredOnce({
        identityName: BRIDGE_IDENTITY,
        binDir: BRIDGE_BIN_DIR,
        manifestSourcePath: BRIDGE_MANIFEST_SOURCE,
    })

    const tempFile = path.join(os.tmpdir(), `phi-search-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
    try {
        fs.writeFileSync(tempFile, JSON.stringify(request), "utf8")

        let stdout = ""
        let stderr = ""
        try {
            const args = ["phi-search-relevance", tempFile]
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

        const parsed = JSON.parse(stdout.trim()) as { status: string; relevant?: boolean; message?: string }
        if (parsed.status !== "success") throw new Error(parsed.message ?? "Unknown bridge error")
        return Boolean(parsed.relevant)
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
    }
}

export default function Command() {
    const prefs = getPreferenceValues<Preferences>()
    const debounceMs = parseInt(prefs.semanticSearchDebounce ?? "600", 10)
    const maxHits = parseInt(prefs.maxSemanticResults ?? "5", 10)
    const maxPhiChecks = parseInt(prefs.maxSemanticChecks ?? String(DEFAULT_MAX_PHI_CHECKS), 10)

    const notesFolder = useMemo(() => getNotesFolder(), [])
    const allNotes = useMemo(() => getAllNotes(notesFolder), [notesFolder])

    const [searchText, setSearchText] = useState("")
    const [semanticHits, setSemanticHits] = useState<string[]>([])
    const [isSemanticLoading, setIsSemanticLoading] = useState(false)

    const semanticRunId = useRef(0)
    const relevanceCache = useRef<Map<string, boolean>>(new Map())
    const semanticHitsCache = useRef<Map<string, string[]>>(new Map())
    const semanticToastCache = useRef<Map<string, number>>(new Map())

    const keywordHits = useMemo(() => {
        const q = normalizeForSearch(searchText.trim())
        if (!q) return []

        return allNotes.filter(note => {
            const haystack = normalizeForSearch(`${note.title} ${note.category} ${note.raw} ${note.content}`)
            return haystack.includes(q)
        })
    }, [allNotes, searchText])

    const results = useMemo(() => {
        if (!searchText.trim()) return []

        const ids = new Set<string>()
        const merged: Note[] = []
        for (const note of keywordHits) {
            const id = noteIdFromPath(notesFolder, note.path)
            if (ids.has(id)) continue
            ids.add(id)
            merged.push(note)
        }

        for (const id of semanticHits) {
            if (ids.has(id)) continue
            const match = allNotes.find(n => noteIdFromPath(notesFolder, n.path) === id)
            if (match) {
                ids.add(id)
                merged.push(match)
            }
        }

        return merged
    }, [allNotes, keywordHits, notesFolder, searchText, semanticHits])

    useEffect(() => {
        // Reset semantic results as the user types. We'll auto-run semantic after a pause.
        setSemanticHits([])
        setIsSemanticLoading(false)
        semanticRunId.current += 1
    }, [searchText])

    const runSemanticSearch = async () => {
        const query = searchText.trim()
        if (!query) {
            await showToast({
                style: Toast.Style.Failure,
                title: "No Query Provided",
                message: "Type a query in the search bar first.",
            })
            return
        }

        if (query.length < MIN_QUERY_CHARS_FOR_PHI) {
            return
        }

        if (keywordHits.length >= KEYWORD_RESULTS_BEFORE_PHI) {
            return
        }

        semanticRunId.current += 1
        const runId = semanticRunId.current

        setIsSemanticLoading(true)

        try {
            const cachedHits = semanticHitsCache.current.get(query)
            if (cachedHits) {
                setSemanticHits(cachedHits)
                if (prefs.showSuccessToasts !== false && semanticToastCache.current.get(query) !== cachedHits.length) {
                    semanticToastCache.current.set(query, cachedHits.length)
                    await showToast({
                        style: Toast.Style.Success,
                        title: "Semantic Matches Found",
                        message: `Found ${cachedHits.length} match(es).`,
                    })
                }
                return
            }

            const keywordIds = new Set(keywordHits.map(n => noteIdFromPath(notesFolder, n.path)))
            const checkCap = Number.isFinite(maxPhiChecks) && maxPhiChecks > 0 ? maxPhiChecks : DEFAULT_MAX_PHI_CHECKS
            const candidates = allNotes
                .filter(n => !keywordIds.has(noteIdFromPath(notesFolder, n.path)))
                .slice(0, checkCap)

            const hits: string[] = []
            for (const note of candidates) {
                if (semanticRunId.current !== runId) return
                if (hits.length >= maxHits) break

                const candidateId = noteIdFromPath(notesFolder, note.path)
                const cacheKey = `${query}\n${candidateId}`
                const cached = relevanceCache.current.get(cacheKey)

                let relevant: boolean
                if (cached !== undefined) {
                    relevant = cached
                } else {
                    const request: SearchRelevanceRequest = {
                        query,
                        candidate: {
                            path: candidateId,
                            title: note.title,
                            category: note.category,
                            preview: notePreview(note),
                        },
                    }

                    relevant = await runPhiRelevance(request, prefs.ensureModelReady !== false)
                    relevanceCache.current.set(cacheKey, relevant)
                }

                if (relevant) hits.push(candidateId)
            }

            if (semanticRunId.current !== runId) return
            semanticHitsCache.current.set(query, hits)
            setSemanticHits(hits)

            if (prefs.showSuccessToasts !== false) {
                semanticToastCache.current.set(query, hits.length)
                await showToast({
                    style: Toast.Style.Success,
                    title: "Semantic Matches Found",
                    message: `Found ${hits.length} match(es).`,
                })
            }
        } catch (err) {
            if (semanticRunId.current !== runId) return
            await showPhiFailureToast("Semantic Search Failed", err)
        } finally {
            if (semanticRunId.current === runId) setIsSemanticLoading(false)
        }
    }

    useEffect(() => {
        const query = searchText.trim()
        if (!query || query.length < MIN_QUERY_CHARS_FOR_PHI) return
        if (keywordHits.length >= KEYWORD_RESULTS_BEFORE_PHI) return
        if (isSemanticLoading) return

        const handle = setTimeout(() => {
            // Fire-and-forget; runSemanticSearch has its own guards and cancellation via semanticRunId.
            void runSemanticSearch()
        }, debounceMs)

        return () => clearTimeout(handle)
    }, [isSemanticLoading, keywordHits.length, searchText, debounceMs])

    return (
        <List
            isLoading={isSemanticLoading}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchBarPlaceholder="Search notes..."
        >
            {!searchText.trim() ? (
                <List.EmptyView
                    title="Type a query to search notes"
                    description="Keyword search updates as you type. Semantic search runs after you stop typing briefly (when keyword results are scarce)."
                    icon={Icon.MagnifyingGlass}
                />
            ) : results.length === 0 ? (
                <List.EmptyView
                    title="No matches found"
                    description={
                        isSemanticLoading
                            ? "Running Phi-Silica semantic search..."
                            : "If keyword search is empty, Phi-Silica semantic search will try after a short pause."
                    }
                    icon={Icon.TextDocument}
                />
            ) : (
                results.map(note => (
                    <List.Item
                        key={note.path}
                        title={note.title.replace(/-/g, " ")}
                        subtitle={note.content.split("\n")[0]}
                        accessories={[
                            { text: note.date.split(" ")[0], icon: Icon.Calendar },
                            keywordHits.includes(note)
                                ? { text: "Keyword", icon: Icon.Text }
                                : { text: "Semantic", icon: Icon.Stars },
                        ]}
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
                ))
            )}
        </List>
    )
}
