import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

// Reads the path of the topmost (foreground) Windows Explorer window, or null
// if no Explorer window is currently open. Adapted from the suite's
// powershell-utils.ts SelectedItems() pattern (see npu-image-editor-ext).
const SCRIPT_GET_FOREGROUND_EXPLORER = `
$ErrorActionPreference = 'SilentlyContinue'

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class _User32 {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@

$shell = New-Object -ComObject Shell.Application
$fg = [_User32]::GetForegroundWindow()

$match = $null
foreach ($w in $shell.Windows()) {
    try {
        if ($w.HWND -eq $fg.ToInt64()) { $match = $w; break }
    } catch {}
}

# Fall back to the first File Explorer window if the foreground HWND didn't match.
if (-not $match) {
    foreach ($w in $shell.Windows()) {
        try {
            $name = $w.Name
            if ($name -eq 'File Explorer' -or $name -eq 'Windows Explorer') { $match = $w; break }
        } catch {}
    }
}

if (-not $match) { '' ; return }

try {
    $url = $match.LocationURL
    if (-not $url) { '' ; return }
    # Convert file:/// URL to a local path.
    Add-Type -AssemblyName System.Web
    $local = (New-Object System.Uri($url)).LocalPath
    if (Test-Path -LiteralPath $local) { $local } else { '' }
} catch { '' }
`

export async function getForegroundExplorerPath(): Promise<string | null> {
    try {
        const { stdout } = await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-NonInteractive", "-Command", SCRIPT_GET_FOREGROUND_EXPLORER],
            { windowsHide: true },
        )
        const trimmed = stdout.trim()
        return trimmed.length > 0 ? trimmed : null
    } catch (error) {
        console.error("[explorer] getForegroundExplorerPath failed:", error)
        return null
    }
}
