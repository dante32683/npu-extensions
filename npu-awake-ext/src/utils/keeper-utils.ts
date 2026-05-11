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

/** Raycast LocalStorage may round-trip numeric PIDs inconsistently; normalize before `process.kill`. */
function normalizeStoredPid(raw: unknown): number | null {
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
        const n = Math.floor(raw)
        return n > 0 ? n : null
    }
    if (typeof raw === "string" && /^\d+$/.test(raw)) {
        const n = Number(raw)
        return Number.isFinite(n) && n > 0 ? n : null
    }
    return null
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
    const raw = await LocalStorage.getItem(DAEMON_PID_KEY)
    const pid = normalizeStoredPid(raw)
    if (raw === undefined || raw === null) return
    if (pid) {
        try {
            process.kill(pid)
        } catch {
            // already dead or no permission
        }
    }
    await LocalStorage.removeItem(DAEMON_PID_KEY)
}

export async function ensureDaemonRunning(): Promise<number | null> {
    const rawExisting = await LocalStorage.getItem(DAEMON_PID_KEY)
    const existing = normalizeStoredPid(rawExisting)
    if (existing && isPidAlive(existing)) return existing
    if (rawExisting !== undefined && rawExisting !== null) {
        await LocalStorage.removeItem(DAEMON_PID_KEY)
    }

    const binPath = keeperExePath()
    if (!fs.existsSync(binPath)) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Awake Keeper Failed",
            message: `AwakeKeeper.exe was not found. Build the keeper and ensure assets/bin contains the publish output.`,
        })
        return null
    }

    const binDir = path.dirname(binPath)
    const { supportDir } = getStatePaths()
    const args: string[] = ["daemon", supportDir]

    const startTimeoutMs = 8000
    const verifyAliveMs = 500

    return await new Promise<number | null>(resolve => {
        let settled = false
        const startTimeout: { id?: ReturnType<typeof setTimeout> } = {}

        const finish = async (value: number | null, failureMessage?: string) => {
            if (settled) return
            settled = true
            if (startTimeout.id !== undefined) clearTimeout(startTimeout.id)
            if (failureMessage) {
                await showToast({
                    style: Toast.Style.Failure,
                    title: "Awake Keeper Failed",
                    message: failureMessage,
                })
            }
            resolve(value)
        }

        startTimeout.id = setTimeout(() => {
            void finish(
                null,
                "Starting the keeper timed out. Check antivirus, permissions, and that assets/bin is complete.",
            )
        }, startTimeoutMs)

        const child = spawn(binPath, args, {
            cwd: binDir,
            detached: true,
            stdio: "ignore",
            windowsHide: true,
        })

        child.once("error", err => {
            void finish(
                null,
                `Could not start the keeper (${err.message}). Reinstall the extension or rebuild npu-awake-ext/keeper.`,
            )
        })

        child.once("spawn", () => {
            void (async () => {
                const pid = child.pid
                if (!pid) {
                    await finish(
                        null,
                        "The keeper did not return a process ID. Reinstall the extension or rebuild the keeper.",
                    )
                    return
                }
                await LocalStorage.setItem(DAEMON_PID_KEY, pid)
                child.unref()
                await new Promise<void>(r => setTimeout(r, verifyAliveMs))
                if (!isPidAlive(pid)) {
                    await LocalStorage.removeItem(DAEMON_PID_KEY)
                    await finish(
                        null,
                        "The keeper exited right after launch. Reinstall the extension or verify the full publish output is under assets/bin.",
                    )
                    return
                }
                await finish(pid)
            })()
        })
    })
}

export async function setOverride(
    override: { mode: OverrideMode; expiryEpochSeconds?: number | null } | null,
): Promise<boolean> {
    const { statePath } = getStatePaths()
    const previous = readJsonFile<unknown>(statePath, {})
    const next = override ? { override } : {}
    atomicWriteJson(statePath, next)

    const schedules = await getSchedules()
    if (override || schedules.length > 0) {
        const pid = await ensureDaemonRunning()
        if (!pid) {
            if (override) {
                atomicWriteJson(statePath, previous)
            }
            return false
        }
        return true
    }

    await stopDaemon()
    return true
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
    const rawPid = await LocalStorage.getItem(DAEMON_PID_KEY)
    const normalized = normalizeStoredPid(rawPid)
    const daemonPid = normalized && isPidAlive(normalized) ? normalized : null
    if (rawPid !== undefined && rawPid !== null && !daemonPid) {
        await LocalStorage.removeItem(DAEMON_PID_KEY)
    }

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
