import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import os from "os"
import { runDevBridge } from "./run-bridge"
import { getForegroundExplorerPath, getAllExplorerPaths } from "./explorer"

const execFileAsync = promisify(execFile)

export type DetectedSource =
    | "argument"
    | "windows-terminal"
    | "shell"
    | "vscode"
    | "cursor"
    | "windsurf"
    | "explorer"
    | "picker"

export type DetectedContext = {
    cwd: string
    source: DetectedSource
    pid?: number
}

const SHELL_PROCESS_NAMES = new Set(["pwsh.exe", "powershell.exe", "cmd.exe", "wsl.exe", "bash.exe"])

const TERMINAL_PROCESS_NAMES = new Set(["windowsterminal.exe", "wt.exe"])

const ELECTRON_IDE_NAMES: Record<
    string,
    Exclude<DetectedSource, "argument" | "windows-terminal" | "shell" | "explorer" | "picker">
> = {
    "code.exe": "vscode",
    "cursor.exe": "cursor",
    "windsurf.exe": "windsurf",
    "windsurfnext.exe": "windsurf",
}

const SCRIPT_GET_FOREGROUND_PROCESS = `
$ErrorActionPreference = 'SilentlyContinue'

Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class _User32 {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
}
'@

$GW_HWNDNEXT = 2
$hwnd = [_User32]::GetForegroundWindow()

for ($i = 0; $i -lt 32; $i++) {
    if ($hwnd -eq [IntPtr]::Zero) { break }
    if (-not [_User32]::IsWindowVisible($hwnd)) {
        $hwnd = [_User32]::GetWindow($hwnd, $GW_HWNDNEXT)
        continue
    }

    $pidOut = 0
    [void][_User32]::GetWindowThreadProcessId($hwnd, [ref]$pidOut)
    if ($pidOut -le 0) {
        $hwnd = [_User32]::GetWindow($hwnd, $GW_HWNDNEXT)
        continue
    }

    $titleBuf = New-Object System.Text.StringBuilder 1024
    [void][_User32]::GetWindowText($hwnd, $titleBuf, $titleBuf.Capacity)
    $title = $titleBuf.ToString()

    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pidOut" -ErrorAction SilentlyContinue
    $exe = ($proc.Name -as [string])
    if (-not $exe) {
        $hwnd = [_User32]::GetWindow($hwnd, $GW_HWNDNEXT)
        continue
    }

    $exeLower = $exe.ToLowerInvariant()
    if ($exeLower -eq 'raycast.exe' -or $exeLower -eq 'raycast') {
        $hwnd = [_User32]::GetWindow($hwnd, $GW_HWNDNEXT)
        continue
    }

    [pscustomobject]@{ Pid = $pidOut; Exe = $exe; Title = $title } | ConvertTo-Json -Compress
    exit 0
}

''
`

const SCRIPT_GET_CHILD_SHELL = `
param([int]$ParentPid)
$ErrorActionPreference = 'SilentlyContinue'
$queue = New-Object System.Collections.Generic.Queue[int]
$queue.Enqueue($ParentPid)

$shellNames = @('pwsh.exe','powershell.exe','cmd.exe','wsl.exe','bash.exe')

$result = $null
while ($queue.Count -gt 0) {
    $current = $queue.Dequeue()
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$current" -ErrorAction SilentlyContinue
    foreach ($c in $children) {
        if ($shellNames -contains $c.Name) { $result = $c; break }
        $queue.Enqueue([int]$c.ProcessId)
    }
    if ($result) { break }
}

if ($result) {
    [pscustomobject]@{ Pid = [int]$result.ProcessId; Exe = $result.Name } | ConvertTo-Json -Compress
} else {
    ''
}
`

type ForegroundProc = { Pid: number; Exe: string; Title: string }

async function getForegroundProcess(): Promise<ForegroundProc | null> {
    try {
        const { stdout } = await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-NonInteractive", "-Command", SCRIPT_GET_FOREGROUND_PROCESS],
            { windowsHide: true },
        )
        const json = stdout.trim()
        if (!json) return null
        const parsed = JSON.parse(json) as ForegroundProc
        if (!parsed?.Pid || !parsed?.Exe) return null
        return parsed
    } catch (error) {
        console.error("[foreground-context] getForegroundProcess failed:", error)
        return null
    }
}

async function findChildShellPid(parentPid: number): Promise<number | null> {
    try {
        const { stdout } = await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-NonInteractive", "-Command", SCRIPT_GET_CHILD_SHELL, "-ParentPid", String(parentPid)],
            { windowsHide: true },
        )
        const json = stdout.trim()
        if (!json) return null
        const parsed = JSON.parse(json) as { Pid?: number }
        return parsed?.Pid ?? null
    } catch (error) {
        console.error("[foreground-context] findChildShellPid failed:", error)
        return null
    }
}

async function readCwdViaBridge(pid: number): Promise<string | null> {
    try {
        const outcome = await runDevBridge("cwd-of-pid", [String(pid)])
        if (!outcome.ok) return null
        const cwd = outcome.result.cwd
        if (typeof cwd !== "string" || cwd.length === 0) return null
        return cwd
    } catch (error) {
        console.error("[foreground-context] readCwdViaBridge failed:", error)
        return null
    }
}

function isDirectory(p: string): boolean {
    try {
        return fs.statSync(p).isDirectory()
    } catch {
        return false
    }
}

// Try to extract a folder path from a Cursor/VS Code/Windsurf MainWindowTitle.
// Format: "<file> - <folder> - <appname>". The folder segment may itself contain " - ", so
// we walk segments backwards and pick the first one that looks like an existing directory.
function extractFolderFromTitle(title: string): string | null {
    if (!title) return null
    const parts = title.split(" - ")
    for (let i = parts.length - 2; i >= 0; i--) {
        const candidate = parts[i].trim()
        if (candidate.length === 0) continue
        if (isDirectory(candidate)) return candidate
    }
    return null
}

function readJsonSafe<T>(filePath: string): T | null {
    try {
        if (!fs.existsSync(filePath)) return null
        const raw = fs.readFileSync(filePath, "utf8")
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

type StorageJson = {
    windowsState?: { lastActiveWindow?: { folder?: string } }
    openedPathsList?: { workspaces3?: string[] }
}

function lastFolderFromStorage(appKey: "Code" | "Cursor" | "Windsurf"): string | null {
    const appData = process.env.APPDATA
    if (!appData) return null
    const file = path.join(appData, appKey, "storage.json")
    const data = readJsonSafe<StorageJson>(file)
    if (!data) return null

    const direct = data.windowsState?.lastActiveWindow?.folder
    if (direct && isDirectory(direct)) return direct

    const workspaces = data.openedPathsList?.workspaces3 ?? []
    for (const entry of workspaces) {
        if (typeof entry !== "string") continue
        const local = entry.startsWith("file:///")
            ? decodeURIComponent(entry.replace(/^file:\/\/\//, "")).replace(/\//g, "\\")
            : entry
        if (isDirectory(local)) return local
    }
    return null
}

function appKeyFor(source: "vscode" | "cursor" | "windsurf"): "Code" | "Cursor" | "Windsurf" {
    if (source === "vscode") return "Code"
    if (source === "cursor") return "Cursor"
    return "Windsurf"
}

async function detectFromIde(proc: ForegroundProc): Promise<DetectedContext | null> {
    const exe = proc.Exe.toLowerCase()
    const ideSource = ELECTRON_IDE_NAMES[exe]
    if (!ideSource) return null

    const fromTitle = extractFolderFromTitle(proc.Title)
    if (fromTitle) return { cwd: fromTitle, source: ideSource, pid: proc.Pid }

    const fromStorage = lastFolderFromStorage(appKeyFor(ideSource))
    if (fromStorage) return { cwd: fromStorage, source: ideSource, pid: proc.Pid }

    return null
}

async function detectFromTerminal(proc: ForegroundProc): Promise<DetectedContext | null> {
    const exe = proc.Exe.toLowerCase()
    if (TERMINAL_PROCESS_NAMES.has(exe)) {
        const childPid = await findChildShellPid(proc.Pid)
        if (childPid) {
            const cwd = await readCwdViaBridge(childPid)
            if (cwd && isDirectory(cwd)) {
                return { cwd, source: "windows-terminal", pid: childPid }
            }
        }
        return null
    }
    if (SHELL_PROCESS_NAMES.has(exe)) {
        const cwd = await readCwdViaBridge(proc.Pid)
        if (cwd && isDirectory(cwd)) {
            return { cwd, source: "shell", pid: proc.Pid }
        }
    }
    return null
}

async function detectFromExplorer(proc: ForegroundProc): Promise<DetectedContext | null> {
    if (proc.Exe.toLowerCase() !== "explorer.exe") return null
    const folder = await getForegroundExplorerPath()
    if (folder && isDirectory(folder)) {
        return { cwd: folder, source: "explorer", pid: proc.Pid }
    }
    return null
}

/**
 * Returns a list of potential workspace candidate paths from all open windows.
 */
async function detectPotentialWorkspaces(): Promise<DetectedContext[]> {
    const candidates: DetectedContext[] = []

    // 1. Foreground window (highest priority)
    const proc = await getForegroundProcess()
    if (proc) {
        try {
            const ide = await detectFromIde(proc)
            if (ide) candidates.push(ide)
            const term = await detectFromTerminal(proc)
            if (term) candidates.push(term)
            const explorer = await detectFromExplorer(proc)
            if (explorer) candidates.push(explorer)
        } catch (e) {
            console.error("[foreground-context] foreground detection failed:", e)
        }
    }

    // 2. All open Explorer windows
    try {
        const explorerPaths = await getAllExplorerPaths()
        for (const p of explorerPaths) {
            // Don't duplicate foreground explorer if it's already there
            if (!candidates.some(c => c.cwd.toLowerCase() === p.toLowerCase())) {
                candidates.push({ cwd: p, source: "explorer" })
            }
        }
    } catch (e) {
        console.error("[foreground-context] getAllExplorerPaths failed:", e)
    }

    return candidates
}

async function isGitRepo(dir: string): Promise<boolean> {
    try {
        const { stdout } = await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], {
            cwd: dir,
            windowsHide: true,
        })
        return stdout.trim() === "true"
    } catch {
        return false
    }
}

/**
 * Tries each detection method in order, short-circuiting on the first hit
 * that is actually a Git repository.
 */
export async function detectActiveWorkspace(arg?: string): Promise<DetectedContext | null> {
    // Priority 1: Argument
    if (arg && arg.trim().length > 0) {
        const expanded = arg.replace(/^~(?=$|\/|\\)/, os.homedir())
        const resolved = path.resolve(expanded)
        if (isDirectory(resolved)) return { cwd: resolved, source: "argument" }
    }

    // Priority 2: Candidates from all open windows, filtered for Git repos
    const candidates = await detectPotentialWorkspaces()
    for (const cand of candidates) {
        if (await isGitRepo(cand.cwd)) {
            return cand
        }
    }

    // Priority 3: Last active IDE folder (fallback if no Git repo open)
    // This is essentially what we had before if nothing was a git repo.
    if (candidates.length > 0) {
        return candidates[0]
    }

    return null
}

export function describeSource(source: DetectedSource): string {
    switch (source) {
        case "argument":
            return "Argument"
        case "windows-terminal":
            return "Windows Terminal"
        case "shell":
            return "Shell"
        case "vscode":
            return "VS Code"
        case "cursor":
            return "Cursor"
        case "windsurf":
            return "Windsurf"
        case "explorer":
            return "File Explorer"
        case "picker":
            return "Picker"
    }
}
