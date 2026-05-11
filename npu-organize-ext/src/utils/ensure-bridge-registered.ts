import { LocalStorage } from "@raycast/api"
import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execFileAsync = promisify(execFile)

type EnsureOptions = {
    identityName: string
    binDir: string
    manifestSourcePath: string
}

async function isInstalled(identityName: string): Promise<boolean> {
    try {
        const { stdout } = await execFileAsync(
            "powershell.exe",
            [
                "-NoProfile",
                "-Command",
                `if (Get-AppxPackage -Name '${identityName}' -ErrorAction SilentlyContinue) { '1' } else { '0' }`,
            ],
            { windowsHide: true },
        )
        return stdout.toString().trim() === "1"
    } catch {
        return false
    }
}

async function startElevatedRegister(manifestDestPath: string, binDir: string): Promise<void> {
    const cmd = `Add-AppxPackage -Register '${manifestDestPath}' -ExternalLocation '${binDir}' -ForceApplicationShutdown`
    const elevated = `Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-Command',"${cmd.replace(/"/g, '""')}")`
    await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", elevated], {
        windowsHide: true,
    })
}

export async function ensureBridgeRegisteredOnce({
    identityName,
    binDir,
    manifestSourcePath,
}: EnsureOptions): Promise<void> {
    const key = `bridge:registered:${identityName}`
    const cached = await LocalStorage.getItem<string>(key)
    if (cached === "1") return

    if (!(fs.existsSync(binDir) && fs.statSync(binDir).isDirectory())) return
    if (!fs.existsSync(manifestSourcePath)) return

    const manifestDestPath = path.join(binDir, "AppxManifest.xml")
    try {
        fs.copyFileSync(manifestSourcePath, manifestDestPath)
    } catch {
        return
    }

    if (await isInstalled(identityName)) {
        await LocalStorage.setItem(key, "1")
        return
    }

    await startElevatedRegister(manifestDestPath, binDir)

    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
        if (await isInstalled(identityName)) {
            await LocalStorage.setItem(key, "1")
            return
        }
        await new Promise(r => setTimeout(r, 750))
    }
}
