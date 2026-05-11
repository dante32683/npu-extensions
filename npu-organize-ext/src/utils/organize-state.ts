import fs from "fs"
import os from "os"
import path from "path"
import { ResolvedPreferences } from "./screenshots"

/**
 * Filesystem-based contract shared with the C# keeper:
 *
 *   %LocalAppData%\NpuOrganize\
 *   ├── config.json        — written by the Raycast Start command from current prefs.
 *   ├── state.json         — counters + heartbeat, written by the keeper, read by the Status view.
 *   ├── stop.flag          — sentinel written by the Raycast Stop command (graceful stop).
 *   └── organize.log       — append-only audit trail (no rotation in v1).
 *
 * The keeper polls config.json's mtime and hot-reloads when it changes, so
 * editing prefs doesn't require restarting the watcher.
 */

export interface KeeperConfig {
    watchFolder: string
    namingPattern: "date-slug" | "slug-only"
    fileExtensions: string[]
    skipAlreadyNamed: boolean
    maxFileSizeBytes: number | null
    maxSlugTokens: number
    skipOnBattery: boolean
    debounceMs: number
    ignorePattern: string | null
    bridgePath: string
    ensureModelReady: boolean
}

export interface KeeperState {
    startedAt: string | null
    lastHeartbeatAt: string | null
    lastEventAt: string | null
    lastProcessedAt: string | null
    lastProcessedPath: string | null
    lastError: string | null
    processed: number
    skipped: number
    errors: number
    watchFolder: string | null
}

const EMPTY_STATE: KeeperState = {
    startedAt: null,
    lastHeartbeatAt: null,
    lastEventAt: null,
    lastProcessedAt: null,
    lastProcessedPath: null,
    lastError: null,
    processed: 0,
    skipped: 0,
    errors: 0,
    watchFolder: null,
}

export function getSupportDir(): string {
    const dir = path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"), "NpuOrganize")
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
}

export function getPaths() {
    const supportDir = getSupportDir()
    return {
        supportDir,
        configPath: path.join(supportDir, "config.json"),
        statePath: path.join(supportDir, "state.json"),
        stopFlagPath: path.join(supportDir, "stop.flag"),
        logPath: path.join(supportDir, "organize.log"),
    }
}

export function writeKeeperConfig(prefs: ResolvedPreferences, bridgePath: string): KeeperConfig {
    const config: KeeperConfig = {
        watchFolder: prefs.watchFolder,
        namingPattern: prefs.namingPattern,
        fileExtensions: [...prefs.fileExtensions],
        skipAlreadyNamed: prefs.skipAlreadyNamed,
        maxFileSizeBytes: prefs.maxFileSizeBytes,
        maxSlugTokens: prefs.maxSlugTokens,
        skipOnBattery: prefs.skipOnBattery,
        debounceMs: prefs.debounceMs,
        ignorePattern: prefs.ignorePattern,
        bridgePath,
        ensureModelReady: prefs.ensureModelReady,
    }
    const { configPath } = getPaths()
    atomicWriteJson(configPath, config)
    return config
}

export function readKeeperState(): KeeperState {
    const { statePath } = getPaths()
    try {
        if (!fs.existsSync(statePath)) return { ...EMPTY_STATE }
        const raw = fs.readFileSync(statePath, "utf8").trim()
        if (!raw) return { ...EMPTY_STATE }
        const parsed = JSON.parse(raw) as Partial<KeeperState>
        return { ...EMPTY_STATE, ...parsed }
    } catch {
        return { ...EMPTY_STATE }
    }
}

export function readLogTail(maxLines = 40): string[] {
    const { logPath } = getPaths()
    try {
        if (!fs.existsSync(logPath)) return []
        const raw = fs.readFileSync(logPath, "utf8")
        const lines = raw.split(/\r?\n/).filter(l => l.length > 0)
        return lines.slice(-maxLines)
    } catch {
        return []
    }
}

export function writeStopFlag(): void {
    const { stopFlagPath } = getPaths()
    try {
        fs.writeFileSync(stopFlagPath, new Date().toISOString(), "utf8")
    } catch {
        // best-effort
    }
}

function atomicWriteJson(filePath: string, value: unknown) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8")
    fs.renameSync(tmp, filePath)
}
