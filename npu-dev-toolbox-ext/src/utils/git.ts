import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export const MAX_DIFF_BYTES = 100_000
export const MAX_HUNKS_PER_FILE = 4

export type GitOutcome<T> = { ok: true; value: T } | { ok: false; error: string }

export type GitContext = {
    repoRoot: string
    branch: string
    recentCommits: string[]
    diff: string
    diffStaged: boolean
    diffEmpty: boolean
}

async function runGit(cwd: string, args: string[], opts?: { maxBuffer?: number }): Promise<GitOutcome<string>> {
    // Sanitize environment to avoid Git for Windows (MSYS2) locale warnings.
    // Complex Windows locale strings (e.g. BCP-47 with extensions) can confuse /usr/bin/sh.
    const env = { ...process.env }
    if (env.LC_ALL && (env.LC_ALL.includes("-u-") || env.LC_ALL.length > 32)) {
        delete env.LC_ALL
    }
    if (env.LANG && (env.LANG.includes("-u-") || env.LANG.length > 32)) {
        delete env.LANG
    }

    try {
        const { stdout } = await execFileAsync("git", args, {
            cwd,
            env,
            windowsHide: true,
            maxBuffer: opts?.maxBuffer ?? 10 * 1024 * 1024,
        })
        return { ok: true, value: stdout }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, error: message.trim() }
    }
}

export async function findRepoRoot(folderPath: string): Promise<GitOutcome<string>> {
    const result = await runGit(folderPath, ["rev-parse", "--show-toplevel"])
    if (!result.ok) return result
    const root = result.value.trim()
    if (!root) return { ok: false, error: "Not a git working tree." }
    return { ok: true, value: root }
}

// Truncates a unified diff so each file keeps at most `MAX_HUNKS_PER_FILE` hunks
// and the total payload stays under `MAX_DIFF_BYTES`. Appends a "(truncated N hunks)"
// footer per file and a global "(truncated)" footer if the byte cap was hit.
export function truncateDiff(rawDiff: string): string {
    if (!rawDiff) return ""

    const fileChunks = rawDiff.split(/^(?=diff --git )/m).filter(c => c.length > 0)
    const out: string[] = []
    let totalBytes = 0
    let globalTruncated = false

    for (const chunk of fileChunks) {
        const hunkParts = chunk.split(/^(?=@@ )/m)
        const header = hunkParts[0]
        const hunks = hunkParts.slice(1)

        const keep = hunks.slice(0, MAX_HUNKS_PER_FILE)
        const dropped = hunks.length - keep.length

        let assembled = header + keep.join("")
        if (dropped > 0) {
            assembled += `\n... (truncated ${dropped} hunk(s))\n`
        }

        if (totalBytes + assembled.length > MAX_DIFF_BYTES) {
            const remaining = MAX_DIFF_BYTES - totalBytes
            if (remaining > 0) {
                out.push(assembled.slice(0, remaining))
                totalBytes = MAX_DIFF_BYTES
            }
            globalTruncated = true
            break
        }

        out.push(assembled)
        totalBytes += assembled.length
    }

    let result = out.join("")
    if (globalTruncated) result += "\n... (diff truncated to fit MAX_DIFF_BYTES)\n"
    return result
}

export async function gatherGitContext(folderPath: string): Promise<GitOutcome<GitContext>> {
    const rootResult = await findRepoRoot(folderPath)
    if (!rootResult.ok) return rootResult
    const repoRoot = rootResult.value

    const branchResult = await runGit(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"])
    const branch = branchResult.ok ? branchResult.value.trim() || "(detached)" : "(unknown)"

    const recentResult = await runGit(repoRoot, ["log", "-n", "5", "--pretty=%s"])
    const recentCommits = recentResult.ok
        ? recentResult.value
              .split(/\r?\n/)
              .map(s => s.trim())
              .filter(Boolean)
        : []

    const stagedResult = await runGit(repoRoot, ["diff", "--staged"])
    if (!stagedResult.ok) return { ok: false, error: stagedResult.error }

    const diffStaged = stagedResult.value.length > 0
    let rawDiff = stagedResult.value

    if (!diffStaged) {
        const unstagedResult = await runGit(repoRoot, ["diff"])
        if (!unstagedResult.ok) return { ok: false, error: unstagedResult.error }
        rawDiff = unstagedResult.value
    }

    const diffEmpty = rawDiff.trim().length === 0
    const diff = diffEmpty ? "" : truncateDiff(rawDiff)

    return {
        ok: true,
        value: { repoRoot, branch, recentCommits, diff, diffStaged, diffEmpty },
    }
}

export async function runGitCommit(repoRoot: string, subject: string, body: string): Promise<GitOutcome<string>> {
    const args = ["commit", "-m", subject]
    if (body && body.trim().length > 0) args.push("-m", body)
    return runGit(repoRoot, args)
}
