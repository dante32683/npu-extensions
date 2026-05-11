import { getPreferenceValues } from "@raycast/api"
import fs from "fs"
import os from "os"
import path from "path"
import { isAlreadyDateNamed, NamingPattern, normalizeExtension, parseExtensionList } from "./slug"

export interface OrganizePreferences {
    watchFolder?: string
    namingPattern?: NamingPattern
    fileExtensions?: string
    skipAlreadyNamed?: boolean
    maxFileSizeMb?: string
    maxSlugTokens?: string
    showSuccessToasts?: boolean
    ensureModelReady?: boolean
}

export interface ResolvedPreferences {
    watchFolder: string
    namingPattern: NamingPattern
    fileExtensions: Set<string>
    skipAlreadyNamed: boolean
    maxFileSizeBytes: number | null
    maxSlugTokens: number
    showSuccessToasts: boolean
    ensureModelReady: boolean
}

export interface ScreenshotCandidate {
    fullPath: string
    basename: string
    extension: string
    sizeBytes: number
    captureDate: Date
}

const DEFAULT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"])
const DEFAULT_MAX_TOKENS = 5

export function resolvePreferences(
    raw: OrganizePreferences = getPreferenceValues<OrganizePreferences>(),
): ResolvedPreferences {
    const watchFolder = (raw.watchFolder?.trim() || defaultScreenshotsFolder()).replace(/[/\\]+$/, "")

    const parsedExts = raw.fileExtensions ? parseExtensionList(raw.fileExtensions) : new Set<string>()
    const fileExtensions = parsedExts.size > 0 ? parsedExts : new Set(DEFAULT_EXTENSIONS)

    const maxMb = parseFloat(raw.maxFileSizeMb ?? "")
    const maxFileSizeBytes = Number.isFinite(maxMb) && maxMb > 0 ? Math.round(maxMb * 1024 * 1024) : null

    const tokensParsed = parseInt(raw.maxSlugTokens ?? "", 10)
    const maxSlugTokens = Number.isFinite(tokensParsed) && tokensParsed > 0 ? tokensParsed : DEFAULT_MAX_TOKENS

    return {
        watchFolder,
        namingPattern: raw.namingPattern === "slug-only" ? "slug-only" : "date-slug",
        fileExtensions,
        skipAlreadyNamed: raw.skipAlreadyNamed !== false,
        maxFileSizeBytes,
        maxSlugTokens,
        showSuccessToasts: raw.showSuccessToasts !== false,
        ensureModelReady: raw.ensureModelReady !== false,
    }
}

export function defaultScreenshotsFolder(): string {
    return path.join(os.homedir(), "Pictures", "Screenshots")
}

/**
 * Enumerate renameable screenshots in the watch folder, newest first. Filters
 * by extension allow-list, max file size, and (optionally) skips files whose
 * basename already matches the `YYYY-MM-DD_` pattern.
 */
export function listScreenshotCandidates(prefs: ResolvedPreferences): ScreenshotCandidate[] {
    if (!fs.existsSync(prefs.watchFolder)) return []
    const stat = fs.statSync(prefs.watchFolder)
    if (!stat.isDirectory()) return []

    const entries = fs.readdirSync(prefs.watchFolder, { withFileTypes: true })
    const candidates: ScreenshotCandidate[] = []

    for (const entry of entries) {
        if (!entry.isFile()) continue
        const fullPath = path.join(prefs.watchFolder, entry.name)
        const ext = normalizeExtension(path.extname(entry.name))
        if (!prefs.fileExtensions.has(ext)) continue
        if (prefs.skipAlreadyNamed && isAlreadyDateNamed(entry.name)) continue

        let s: fs.Stats
        try {
            s = fs.statSync(fullPath)
        } catch {
            continue
        }
        if (prefs.maxFileSizeBytes !== null && s.size > prefs.maxFileSizeBytes) continue

        candidates.push({
            fullPath,
            basename: entry.name,
            extension: ext,
            sizeBytes: s.size,
            captureDate: pickCaptureDate(s),
        })
    }

    candidates.sort((a, b) => b.captureDate.getTime() - a.captureDate.getTime())
    return candidates
}

function pickCaptureDate(s: fs.Stats): Date {
    // birthtime can be epoch on some filesystems; fall back to mtime when invalid.
    const birth = s.birthtime?.getTime() ?? 0
    if (birth > 0) return s.birthtime
    return s.mtime
}
