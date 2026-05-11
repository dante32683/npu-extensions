import { environment, LocalStorage } from "@raycast/api"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { getPaths, writeKeeperConfig } from "./organize-state"
import { resolvePreferences } from "./screenshots"

const KEEPER_PID_KEY = "organize:keeperPid"

function keeperExePath(): string {
    return path.join(environment.assetsPath, "bin", "OrganizeKeeper.exe")
}

function bridgeExePath(): string {
    return path.join(environment.assetsPath, "bin", "NpuBridge.exe")
}

export function getKeeperExe(): { exe: string; bridge: string; exeExists: boolean; bridgeExists: boolean } {
    const exe = keeperExePath()
    const bridge = bridgeExePath()
    return {
        exe,
        bridge,
        exeExists: fs.existsSync(exe),
        bridgeExists: fs.existsSync(bridge),
    }
}

function isPidAlive(pid: number): boolean {
    if (!pid || pid <= 0) return false
    try {
        process.kill(pid, 0)
        return true
    } catch (err: unknown) {
        // ESRCH = no such process. EPERM = exists but we lack permission (treat as alive).
        const code = (err as NodeJS.ErrnoException | undefined)?.code
        return code === "EPERM"
    }
}

export async function getStoredPid(): Promise<number | null> {
    const raw = await LocalStorage.getItem<number>(KEEPER_PID_KEY)
    if (typeof raw !== "number" || raw <= 0) return null
    return raw
}

export interface KeeperHealth {
    running: boolean
    pid: number | null
    exeMissing: boolean
    bridgeMissing: boolean
}

export async function getKeeperHealth(): Promise<KeeperHealth> {
    const { exeExists, bridgeExists } = getKeeperExe()
    const pid = await getStoredPid()
    const alive = pid !== null && isPidAlive(pid)
    if (!alive && pid !== null) {
        await LocalStorage.removeItem(KEEPER_PID_KEY)
    }
    return {
        running: alive,
        pid: alive ? pid : null,
        exeMissing: !exeExists,
        bridgeMissing: !bridgeExists,
    }
}

export type StartOutcome =
    | { ok: true; pid: number }
    | {
          ok: false
          reason: "keeper-missing" | "bridge-missing" | "watch-folder-missing" | "spawn-failed"
          detail?: string
      }

export async function startKeeper(): Promise<StartOutcome> {
    const { exe, bridge, exeExists, bridgeExists } = getKeeperExe()
    if (!exeExists) return { ok: false, reason: "keeper-missing" }
    if (!bridgeExists) return { ok: false, reason: "bridge-missing" }

    const prefs = resolvePreferences()
    if (!fs.existsSync(prefs.watchFolder)) {
        return { ok: false, reason: "watch-folder-missing", detail: prefs.watchFolder }
    }

    // Always seed config.json before launch; the keeper refuses to start without it.
    writeKeeperConfig(prefs, bridge)

    // Clear any leftover stop.flag.
    const { stopFlagPath, supportDir } = getPaths()
    try {
        if (fs.existsSync(stopFlagPath)) fs.unlinkSync(stopFlagPath)
    } catch {
        // best-effort
    }

    // If a PID is already recorded and the process is alive, no-op success.
    const existing = await getStoredPid()
    if (existing !== null && isPidAlive(existing)) return { ok: true, pid: existing }

    try {
        const child = spawn(exe, ["watch", "--support-dir", supportDir], {
            detached: true,
            stdio: "ignore",
            windowsHide: true,
            cwd: path.dirname(exe),
        })
        if (!child.pid) return { ok: false, reason: "spawn-failed" }
        await LocalStorage.setItem(KEEPER_PID_KEY, child.pid)
        child.unref()
        return { ok: true, pid: child.pid }
    } catch (err: unknown) {
        return { ok: false, reason: "spawn-failed", detail: err instanceof Error ? err.message : String(err) }
    }
}

export async function stopKeeper(): Promise<{ stopped: boolean; pid: number | null }> {
    const pid = await getStoredPid()

    // Always write the stop flag — even if the PID lookup fails, the keeper
    // polls for the flag once per second and exits gracefully.
    const { stopFlagPath } = getPaths()
    try {
        fs.writeFileSync(stopFlagPath, new Date().toISOString(), "utf8")
    } catch {
        // best-effort
    }

    if (pid === null) return { stopped: false, pid: null }

    // Give the keeper a chance to clean up before hard-killing.
    const deadline = Date.now() + 3000
    while (Date.now() < deadline) {
        if (!isPidAlive(pid)) {
            await LocalStorage.removeItem(KEEPER_PID_KEY)
            return { stopped: true, pid }
        }
        await new Promise(r => setTimeout(r, 200))
    }

    try {
        process.kill(pid)
    } catch {
        // already dead or no permission
    }
    await LocalStorage.removeItem(KEEPER_PID_KEY)
    return { stopped: true, pid }
}
