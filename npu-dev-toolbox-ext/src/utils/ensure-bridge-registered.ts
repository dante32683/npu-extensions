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

async function getInstalledLocation(identityName: string): Promise<string | null> {
    try {
        const { stdout } = await execFileAsync(
            "powershell.exe",
            [
                "-NoProfile",
                "-Command",
                `$p = Get-AppxPackage -Name '${identityName}' -ErrorAction SilentlyContinue; if ($p) { $p.InstallLocation } else { '' }`,
            ],
            { windowsHide: true },
        )
        const loc = stdout.toString().trim()
        return loc || null
    } catch {
        return null
    }
}

async function removePackage(identityName: string): Promise<void> {
    try {
        await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-Command", `Remove-AppxPackage -Package (Get-AppxPackage -Name '${identityName}').PackageFullName -ErrorAction SilentlyContinue`],
            { windowsHide: true },
        )
    } catch {
        // ignore — best effort
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
    // Cache key includes binDir so the cache misses when the extension moves paths
    // (e.g. from dev source to Raycast's imported copy).
    const key = `bridge:registered:${identityName}:${binDir.replace(/[^a-z0-9]/gi, "_")}`
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

    const installedAt = await getInstalledLocation(identityName)
    if (installedAt) {
        const norm = (p: string) => p.replace(/[\\/]+$/, "").toLowerCase()
        if (norm(installedAt) === norm(binDir)) {
            // Already registered at the right path.
            await LocalStorage.setItem(key, "1")
            return
        }
        // Registered at a different path — remove and re-register at binDir.
        await removePackage(identityName)
    }

    await startElevatedRegister(manifestDestPath, binDir)

    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
        const loc = await getInstalledLocation(identityName)
        if (loc) {
            await LocalStorage.setItem(key, "1")
            return
        }
        await new Promise(r => setTimeout(r, 750))
    }
}
