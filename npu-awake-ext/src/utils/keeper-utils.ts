import { LocalStorage, showToast, Toast, environment } from "@raycast/api"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

const DAEMON_PID_KEY = "keeperDaemonPid"

type OverrideMode = "indefinite" | "timed" | "until" | "screen-off"

export type KeeperStatus = {
    daemonPid: number | null
    override: { mode: OverrideMode; expiryEpochSeconds?: number | null } | null
    schedules: Array<{ id: string; enabled: boolean; days: number[]; start: string; end: string }>
}

function getSupportDir(): string {
    const dir = environment.supportPath
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
}

function getStatePaths() {
    const supportDir = getSupportDir()
    return {
        supportDir,
        schedulesPath: path.join(supportDir, "schedules.json"),
        statePath: path.join(supportDir, "state.json"),
    }
}

function atomicWriteJson(filePath: string, value: unknown) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(value), "utf8")
    fs.renameSync(tmp, filePath)
}

function readJsonFile<T>(filePath: string, fallback: T): T {
    try {
        if (!fs.existsSync(filePath)) return fallback
        const raw = fs.readFileSync(filePath, "utf8").trim()
        if (!raw) return fallback
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

function keeperExePath(): string {
    return path.join(environment.assetsPath, "bin", "AwakeKeeper.exe")
}

function isPidAlive(pid: number): boolean {
    try {
        process.kill(pid, 0)
        return true
    } catch {
        return false
    }
}

export async function stopDaemon() {
    const pid = await LocalStorage.getItem<number>(DAEMON_PID_KEY)
    if (pid) {
        try {
            process.kill(pid)
        } catch {
            // already dead or no permission
        }
        await LocalStorage.removeItem(DAEMON_PID_KEY)
    }
}

export async function ensureDaemonRunning(): Promise<number | null> {
    const existing = await LocalStorage.getItem<number>(DAEMON_PID_KEY)
    if (existing && isPidAlive(existing)) return existing

    const binPath = keeperExePath()
    if (!fs.existsSync(binPath)) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Keeper Binary Not Found",
            message: "Please build the extension first.",
        })
        return null
    }

    const { supportDir } = getStatePaths()
    const args: string[] = ["daemon", supportDir]

    const child = spawn(binPath, args, {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
    })

    if (child.pid) {
        await LocalStorage.setItem(DAEMON_PID_KEY, child.pid)
        child.unref()
        return child.pid
    }

    return null
}

export async function setOverride(override: { mode: OverrideMode; expiryEpochSeconds?: number | null } | null) {
    const { statePath } = getStatePaths()
    const next = override ? { override } : {}
    atomicWriteJson(statePath, next)

    const schedules = await getSchedules()
    if (override || schedules.length > 0) {
        await ensureDaemonRunning()
    } else {
        await stopDaemon()
    }
}

export async function getSchedules(): Promise<KeeperStatus["schedules"]> {
    const { schedulesPath } = getStatePaths()
    const parsed = readJsonFile<unknown>(schedulesPath, [])
    if (!Array.isArray(parsed)) return []
    const safe: KeeperStatus["schedules"] = []
    for (const s of parsed) {
        if (!s || typeof s !== "object") continue
        const obj = s as Record<string, unknown>
        const id = typeof obj.id === "string" ? obj.id : ""
        const enabled = obj.enabled !== false
        const days = Array.isArray(obj.days) ? obj.days : null
        const start = typeof obj.start === "string" ? obj.start : null
        const end = typeof obj.end === "string" ? obj.end : null
        if (!id || !days || !start || !end) continue
        safe.push({
            id,
            enabled,
            days: days.filter(d => Number.isInteger(d) && d >= 0 && d <= 6) as number[],
            start,
            end,
        })
    }
    return safe
}

export async function setSchedules(schedules: KeeperStatus["schedules"]) {
    const { schedulesPath } = getStatePaths()
    atomicWriteJson(schedulesPath, schedules)
    if (schedules.length > 0) {
        await ensureDaemonRunning()
    } else {
        const status = await getKeeperStatus()
        if (!status.override) await stopDaemon()
    }
}

export async function getKeeperStatus(): Promise<KeeperStatus> {
    const pid = await LocalStorage.getItem<number>(DAEMON_PID_KEY)
    const daemonPid = pid && isPidAlive(pid) ? pid : null
    if (pid && !daemonPid) await LocalStorage.removeItem(DAEMON_PID_KEY)

    const { statePath } = getStatePaths()
    const state = readJsonFile<unknown>(statePath, {})
    const override = parseOverride(state)

    const schedules = await getSchedules()
    return { daemonPid, override, schedules }
}

function parseOverride(value: unknown): KeeperStatus["override"] {
    if (!value || typeof value !== "object") return null
    const obj = value as Record<string, unknown>
    if (!obj.override || typeof obj.override !== "object") return null
    const ov = obj.override as Record<string, unknown>
    const mode = typeof ov.mode === "string" ? (ov.mode as OverrideMode) : null
    if (!mode) return null
    const expiryEpochSeconds = typeof ov.expiryEpochSeconds === "number" ? ov.expiryEpochSeconds : null
    return { mode, expiryEpochSeconds }
}
