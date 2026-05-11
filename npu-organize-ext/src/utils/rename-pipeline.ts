import fs from "fs"
import path from "path"
import { describeScreenshot } from "./run-bridge"
import { ScreenshotCandidate, ResolvedPreferences } from "./screenshots"
import { buildFallbackSlug, buildTargetFilename, resolveCollision, slugify } from "./slug"
import { readKeeperState, getPaths } from "./organize-state"

export type ProposalStatus = "pending" | "ready" | "renamed" | "skipped" | "error"

export interface RenameProposal {
    candidate: ScreenshotCandidate
    targetBasename: string
    targetPath: string
    description: string
    ocrExcerpt: string | null
    confidence: "high" | "low" | "fallback"
    elapsedMs: number
    status: ProposalStatus
    error?: string
}

/**
 * Run the bridge against a single candidate and produce a {@link RenameProposal}.
 * Pure planning — no file is touched here. Use {@link applyProposal} to commit
 * the rename.
 */
export async function planRename(
    candidate: ScreenshotCandidate,
    prefs: ResolvedPreferences,
    existingNames: Set<string>,
): Promise<RenameProposal> {
    const outcome = await describeScreenshot(candidate.fullPath)
    if (!outcome.ok) {
        return makeFallbackProposal(candidate, prefs, existingNames, outcome.error)
    }

    let slug = slugify(outcome.result.description, { maxTokens: prefs.maxSlugTokens })
    let confidence: "high" | "low" | "fallback" = outcome.result.confidence

    if (slug.length === 0 || outcome.result.confidence === "low") {
        slug = buildFallbackSlug(`${candidate.fullPath}:${candidate.captureDate.getTime()}`)
        confidence = "fallback"
    }

    const baseFilename = buildTargetFilename({
        slug,
        extension: candidate.extension,
        pattern: prefs.namingPattern,
        captureDate: candidate.captureDate,
    })
    const finalBasename = resolveCollision({
        baseFilename,
        isTaken: name => existingNames.has(name.toLowerCase()),
    })
    existingNames.add(finalBasename.toLowerCase())

    return {
        candidate,
        targetBasename: finalBasename,
        targetPath: path.join(path.dirname(candidate.fullPath), finalBasename),
        description: outcome.result.description,
        ocrExcerpt: outcome.result.ocrExcerpt,
        confidence,
        elapsedMs: outcome.result.elapsedMs,
        status: "ready",
    }
}

/** Plan-only fallback used when the bridge itself fails (missing exe, etc.). */
function makeFallbackProposal(
    candidate: ScreenshotCandidate,
    prefs: ResolvedPreferences,
    existingNames: Set<string>,
    error: string,
): RenameProposal {
    const slug = buildFallbackSlug(`${candidate.fullPath}:${candidate.captureDate.getTime()}`)
    const baseFilename = buildTargetFilename({
        slug,
        extension: candidate.extension,
        pattern: prefs.namingPattern,
        captureDate: candidate.captureDate,
    })
    const finalBasename = resolveCollision({
        baseFilename,
        isTaken: name => existingNames.has(name.toLowerCase()),
    })
    existingNames.add(finalBasename.toLowerCase())

    return {
        candidate,
        targetBasename: finalBasename,
        targetPath: path.join(path.dirname(candidate.fullPath), finalBasename),
        description: "",
        ocrExcerpt: null,
        confidence: "fallback",
        elapsedMs: 0,
        status: "error",
        error,
    }
}

/**
 * Commit a single proposal to disk. Idempotent: if the source already lives at
 * the proposed path (case-insensitive), the proposal is marked "renamed" with
 * no I/O. Never overwrites an existing different file.
 */
export function applyProposal(proposal: RenameProposal): RenameProposal {
    if (proposal.status === "error") return proposal

    const src = proposal.candidate.fullPath
    const dest = proposal.targetPath
    if (src.toLowerCase() === dest.toLowerCase()) {
        return { ...proposal, status: "skipped" }
    }
    if (fs.existsSync(dest)) {
        return {
            ...proposal,
            status: "error",
            error: `Target already exists: ${proposal.targetBasename}`,
        }
    }

    try {
        fs.renameSync(src, dest)
        updateStateCursor(dest)
        return { ...proposal, status: "renamed" }
    } catch (err: unknown) {
        return {
            ...proposal,
            status: "error",
            error: err instanceof Error ? err.message : String(err),
        }
    }
}

/**
 * Bump the shared state.json cursor so the OrganizeKeeper (if running) won't
 * race the manual command on the same file. Best-effort: we don't fail the
 * rename if the state file isn't writable.
 */
function updateStateCursor(renamedPath: string): void {
    try {
        const state = readKeeperState()
        const now = new Date().toISOString()
        const next = {
            ...state,
            lastProcessedAt: now,
            lastProcessedPath: renamedPath,
            lastHeartbeatAt: now,
            processed: (state.processed ?? 0) + 1,
        }
        const { statePath } = getPaths()
        const dir = path.dirname(statePath)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const tmp = `${statePath}.${process.pid}.${Date.now()}.tmp`
        fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8")
        fs.renameSync(tmp, statePath)
    } catch {
        // best-effort
    }
}

/**
 * Build the initial set of "taken" names from disk. The pipeline mutates this
 * set as it queues additional renames so two candidates can't both win the
 * same target filename in one batch.
 */
export function snapshotExistingNames(folder: string): Set<string> {
    const out = new Set<string>()
    if (!fs.existsSync(folder)) return out
    for (const name of fs.readdirSync(folder)) {
        out.add(name.toLowerCase())
    }
    return out
}
