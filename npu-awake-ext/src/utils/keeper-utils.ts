import { LocalStorage, showToast, Toast, environment } from "@raycast/api"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

const KEEPER_PID_KEY = "keeperPid"
const KEEPER_MODE_KEY = "keeperMode"
const KEEPER_EXPIRY_KEY = "keeperExpiry"

export async function stopKeeper() {
    const pid = await LocalStorage.getItem<number>(KEEPER_PID_KEY)
    if (pid) {
        try {
            process.kill(pid)
        } catch (e) {
            // Already dead or permission denied
        }
        await LocalStorage.removeItem(KEEPER_PID_KEY)
        await LocalStorage.removeItem(KEEPER_MODE_KEY)
        await LocalStorage.removeItem(KEEPER_EXPIRY_KEY)
    }
}

export async function startKeeper(mode: "indefinite" | "timed" | "until" | "screen-off", value?: number) {
    await stopKeeper()

    const binPath = path.join(environment.assetsPath, "bin", "AwakeKeeper.exe")
    if (!fs.existsSync(binPath)) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Keeper binary not found",
            message: "Please build the extension first.",
        })
        return
    }

    const args: string[] = [mode]
    if (value !== undefined) {
        args.push(value.toString())
    }

    const child = spawn(binPath, args, {
        detached: true,
        stdio: "ignore",
    })

    if (child.pid) {
        await LocalStorage.setItem(KEEPER_PID_KEY, child.pid)
        await LocalStorage.setItem(KEEPER_MODE_KEY, mode)
        if (mode === "timed" && value) {
            const expiry = Math.floor(Date.now() / 1000) + value
            await LocalStorage.setItem(KEEPER_EXPIRY_KEY, expiry)
        } else if (mode === "until" && value) {
            await LocalStorage.setItem(KEEPER_EXPIRY_KEY, value)
        }
        child.unref()
    }
}

export async function getKeeperStatus() {
    const pid = await LocalStorage.getItem<number>(KEEPER_PID_KEY)
    if (!pid) return null

    try {
        process.kill(pid, 0) // Check if process exists
        const mode = (await LocalStorage.getItem<string>(KEEPER_MODE_KEY)) || "unknown"
        const expiry = await LocalStorage.getItem<number>(KEEPER_EXPIRY_KEY)
        return { pid, mode, expiry }
    } catch (e) {
        // Process is dead
        await LocalStorage.removeItem(KEEPER_PID_KEY)
        await LocalStorage.removeItem(KEEPER_MODE_KEY)
        await LocalStorage.removeItem(KEEPER_EXPIRY_KEY)
        return null
    }
}
