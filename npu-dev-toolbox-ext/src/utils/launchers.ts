import { spawn, spawnSync } from "child_process"
import fs from "fs"
import path from "path"

export type LauncherOutcome = { ok: true } | { ok: false; error: string }

export type TerminalChoice = "wt" | "pwsh" | "powershell" | "cmd" | "custom"
export type IdeChoice =
    | "cursor"
    | "code"
    | "windsurf"
    | "idea"
    | "pycharm"
    | "webstorm"
    | "rider"
    | "subl"
    | "notepad++"
    | "custom"

export type LauncherPrefs = {
    terminalChoice: TerminalChoice
    terminalNewTab: boolean
    wtProfileName: string
    terminalCustomPath: string
    ideChoice: IdeChoice
    ideCustomPath: string
}

function tryGetWindowsTerminalDefaultProfileGuid(): string | null {
    // Windows Terminal stable Store package (most common on Win11).
    // We deliberately avoid invoking `wt` because it can show GUI dialogs on bad args.
    try {
        const localAppData = process.env.LOCALAPPDATA
        if (!localAppData) return null
        const settingsPath = path.join(
            localAppData,
            "Packages",
            "Microsoft.WindowsTerminal_8wekyb3d8bbwe",
            "LocalState",
            "settings.json",
        )
        if (!fs.existsSync(settingsPath)) return null
        const raw = fs.readFileSync(settingsPath, "utf8")
        const parsed = JSON.parse(raw) as { defaultProfile?: string }
        const guid = parsed.defaultProfile?.trim()
        return guid ? guid : null
    } catch {
        return null
    }
}

function ensureDirectory(folderPath: string): LauncherOutcome {
    if (!folderPath) return { ok: false, error: "No folder path provided." }
    try {
        const stat = fs.statSync(folderPath)
        if (!stat.isDirectory()) return { ok: false, error: `Not a directory: ${folderPath}` }
    } catch {
        return { ok: false, error: `Folder does not exist: ${folderPath}` }
    }
    return { ok: true }
}

function ensureFile(filePath: string, label: string): LauncherOutcome {
    if (!filePath) return { ok: false, error: `${label} is empty. Set a path in extension preferences.` }
    if (!fs.existsSync(filePath)) return { ok: false, error: `${label} not found: ${filePath}` }
    return { ok: true }
}

function ensureCommandOrPath(commandOrPath: string, label: string): LauncherOutcome {
    if (!commandOrPath) return { ok: false, error: `${label} is empty. Set a path in extension preferences.` }
    // If it looks like a path, verify it exists. Otherwise treat it as a PATH command.
    if (path.isAbsolute(commandOrPath) || commandOrPath.includes("\\") || commandOrPath.includes("/")) {
        return ensureFile(commandOrPath, label)
    }
    if (!commandExistsOnPath(commandOrPath)) return { ok: false, error: `${label} not found on PATH: ${commandOrPath}` }
    return { ok: true }
}

function fireAndForget(command: string, args: string[], cwd?: string): LauncherOutcome {
    try {
        const child = spawn(command, args, {
            cwd,
            detached: true,
            stdio: "ignore",
            // Avoid flashing a console window (notably when launching via `cmd.exe /c start ...`).
            windowsHide: true,
        })
        child.on("error", err => console.error(`[launchers] spawn error for ${command}:`, err))
        child.unref()
        return { ok: true }
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
}

// `start "" /D "<cwd>" "<exe>" <args...>` is the canonical Windows incantation for
// firing a GUI app detached with a working directory. It also handles .lnk / .cmd / .bat.
function startViaCmd(exePath: string, args: string[], cwd: string): LauncherOutcome {
    const startArgs = ["/c", "start", "", "/D", cwd, exePath, ...args]
    return fireAndForget("cmd.exe", startArgs, cwd)
}

// ---------- Explorer ----------

export function openInExplorer(folderPath: string): LauncherOutcome {
    const dir = ensureDirectory(folderPath)
    if (!dir.ok) return dir
    return fireAndForget("explorer.exe", [folderPath])
}

// ---------- Terminal ----------

export function openInTerminal(folderPath: string, prefs: LauncherPrefs): LauncherOutcome {
    const dir = ensureDirectory(folderPath)
    if (!dir.ok) return dir

    switch (prefs.terminalChoice) {
        case "wt": {
            // Prefer the App Execution Alias (`%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe`) because it matches
            // what the Start Menu uses and avoids accidentally invoking a different `wt.exe` on PATH
            // (e.g. Terminal Preview vs Stable) with different settings/default profile.
            const wtAlias = path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WindowsApps", "wt.exe")
            const wtCommand =
                process.env.LOCALAPPDATA && fs.existsSync(wtAlias)
                    ? wtAlias
                    : commandExistsOnPath("wt.exe") || commandExistsOnPath("wt")
                      ? "wt.exe"
                      : wtAlias

            const check = ensureCommandOrPath(wtCommand, "Windows Terminal (wt)")
            if (!check.ok) {
                return {
                    ok: false,
                    error: "Windows Terminal (wt) not found. Install Windows Terminal or switch the Terminal preference to PowerShell/cmd.",
                }
            }

            // Match common user expectations:
            // - Default: open a NEW window (`-w new`) so behavior matches Start Menu / typical hotkey scripts.
            // - Optional: open a new tab in an existing window (`-w 0`) when the preference is enabled.
            //
            // `-d/--startingDirectory` is an option on the `new-tab` subcommand. Use the explicit form so
            // the working directory is applied reliably across Windows Terminal versions.
            //
            // Use the user's Windows Terminal default profile, but pass it explicitly to avoid cases where
            // `wt new-tab` falls back to a different profile (e.g. cmd) despite Settings being configured.
            const windowArgs = prefs.terminalNewTab ? ["-w", "0"] : ["-w", "new"]
            const explicitProfile =
                prefs.wtProfileName?.trim() ||
                // Fall back to the configured default profile GUID when no preference is set.
                tryGetWindowsTerminalDefaultProfileGuid() ||
                ""
            const profileArgs = explicitProfile ? ["-p", explicitProfile] : []
            // `-p` is a `new-tab` option; place it after the subcommand so it is not ignored.
            const args = [...windowArgs, "new-tab", ...profileArgs, "-d", folderPath]

            // Launch Windows Terminal directly (not via `cmd.exe start`) to avoid inheriting legacy console behavior.
            return fireAndForget(wtCommand, args, folderPath)
        }
        case "pwsh":
            if (!commandExistsOnPath("pwsh.exe")) {
                return {
                    ok: false,
                    error: "PowerShell 7 (pwsh) not found on PATH. Install it or switch Terminal preference.",
                }
            }
            return fireAndForget("pwsh.exe", [
                "-NoExit",
                "-Command",
                `Set-Location -LiteralPath '${folderPath.replace(/'/g, "''")}'`,
            ])
        case "powershell":
            return fireAndForget("powershell.exe", [
                "-NoExit",
                "-Command",
                `Set-Location -LiteralPath '${folderPath.replace(/'/g, "''")}'`,
            ])
        case "cmd":
            return fireAndForget("cmd.exe", ["/K", "cd", "/d", folderPath])
        case "custom":
            return launchCustomExeOrLnk(prefs.terminalCustomPath, folderPath, "Terminal Custom Path")
    }
}

// ---------- IDE ----------

const KNOWN_IDE_LAUNCHERS: Record<Exclude<IdeChoice, "custom">, string[]> = {
    cursor: [
        "%LOCALAPPDATA%\\Programs\\Cursor\\Cursor.exe",
        "%LOCALAPPDATA%\\Programs\\cursor\\Cursor.exe",
        "%LOCALAPPDATA%\\Cursor\\Cursor.exe",
        "%LOCALAPPDATA%\\Programs\\cursor\\resources\\app\\bin\\cursor.cmd",
    ],
    code: [
        "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\bin\\code.cmd",
        "%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe",
        "%PROGRAMFILES%\\Microsoft VS Code\\bin\\code.cmd",
        "%PROGRAMFILES%\\Microsoft VS Code\\Code.exe",
    ],
    windsurf: [
        "%LOCALAPPDATA%\\Programs\\Windsurf\\Windsurf.exe",
        "%LOCALAPPDATA%\\Programs\\Windsurf\\bin\\windsurf.cmd",
    ],
    idea: [
        "%LOCALAPPDATA%\\Programs\\IntelliJ IDEA Ultimate\\bin\\idea64.exe",
        "%LOCALAPPDATA%\\Programs\\IntelliJ IDEA Community Edition\\bin\\idea64.exe",
        "%PROGRAMFILES%\\JetBrains\\IntelliJ IDEA\\bin\\idea64.exe",
    ],
    pycharm: [
        "%LOCALAPPDATA%\\Programs\\PyCharm Professional\\bin\\pycharm64.exe",
        "%LOCALAPPDATA%\\Programs\\PyCharm Community Edition\\bin\\pycharm64.exe",
        "%PROGRAMFILES%\\JetBrains\\PyCharm\\bin\\pycharm64.exe",
    ],
    webstorm: [
        "%LOCALAPPDATA%\\Programs\\WebStorm\\bin\\webstorm64.exe",
        "%PROGRAMFILES%\\JetBrains\\WebStorm\\bin\\webstorm64.exe",
    ],
    rider: ["%LOCALAPPDATA%\\Programs\\Rider\\bin\\rider64.exe", "%PROGRAMFILES%\\JetBrains\\Rider\\bin\\rider64.exe"],
    subl: ["%PROGRAMFILES%\\Sublime Text\\subl.exe", "%PROGRAMFILES%\\Sublime Text\\sublime_text.exe"],
    "notepad++": ["%PROGRAMFILES%\\Notepad++\\notepad++.exe", "%PROGRAMFILES(x86)%\\Notepad++\\notepad++.exe"],
}

// Path token shorthand for which command to try on PATH, in addition to install-location guesses.
const KNOWN_IDE_PATH_COMMANDS: Record<Exclude<IdeChoice, "custom">, string> = {
    cursor: "cursor",
    code: "code",
    windsurf: "windsurf",
    idea: "idea",
    pycharm: "pycharm",
    webstorm: "webstorm",
    rider: "rider",
    subl: "subl",
    "notepad++": "notepad++",
}

function expandEnvVars(p: string): string {
    return p.replace(/%([^%]+)%/g, (match, name) => {
        const value = process.env[name]
        return value ?? match
    })
}

function findExistingPath(candidates: string[]): string | null {
    for (const c of candidates) {
        const expanded = expandEnvVars(c)
        if (fs.existsSync(expanded)) return expanded
    }
    return null
}

function commandExistsOnPath(command: string): boolean {
    try {
        const result = spawnSync("where.exe", [command], { windowsHide: true, stdio: "ignore" })
        return result.status === 0
    } catch {
        return false
    }
}

export function openInIde(folderPath: string, prefs: LauncherPrefs): LauncherOutcome {
    const dir = ensureDirectory(folderPath)
    if (!dir.ok) return dir

    if (prefs.ideChoice === "custom") {
        return launchCustomExeOrLnk(prefs.ideCustomPath, folderPath, "IDE Custom Path")
    }

    // Prefer well-known install locations because we can verify the file actually exists.
    const candidates = KNOWN_IDE_LAUNCHERS[prefs.ideChoice] ?? []
    const resolved = findExistingPath(candidates)
    if (resolved) {
        return startViaCmd(resolved, [folderPath], folderPath)
    }

    // Fall back to the documented launcher command on PATH (e.g. `code`, `cursor`).
    const cmdName = KNOWN_IDE_PATH_COMMANDS[prefs.ideChoice]
    if (!commandExistsOnPath(cmdName)) {
        const label = prefs.ideChoice === "cursor" ? "Cursor" : cmdName
        return {
            ok: false,
            error: `Can't find ${label} launcher on PATH. Either install the ${label} CLI launcher, or set IDE to "Custom Path" in extension preferences.`,
        }
    }
    return startViaCmd(cmdName, [folderPath], folderPath)
}

// ---------- Custom .exe / .lnk ----------

function launchCustomExeOrLnk(customPath: string, folderPath: string, label: string): LauncherOutcome {
    const check = ensureFile(customPath, label)
    if (!check.ok) return check

    const ext = path.extname(customPath).toLowerCase()
    if (ext === ".lnk") {
        // Shortcuts can't reliably accept args; just invoke the shortcut and set its working dir to the folder.
        const psCmd = `Start-Process -FilePath '${customPath.replace(/'/g, "''")}' -WorkingDirectory '${folderPath.replace(/'/g, "''")}'`
        return fireAndForget("powershell.exe", ["-NoProfile", "-Command", psCmd])
    }
    return startViaCmd(customPath, [folderPath], folderPath)
}

// ---------- Open All ----------

export function openAll(folderPath: string, prefs: LauncherPrefs): LauncherOutcome {
    const dir = ensureDirectory(folderPath)
    if (!dir.ok) return dir

    const errors: string[] = []
    const explorer = openInExplorer(folderPath)
    if (!explorer.ok) errors.push(`Explorer: ${explorer.error}`)
    const terminal = openInTerminal(folderPath, prefs)
    if (!terminal.ok) errors.push(`Terminal: ${terminal.error}`)
    const ide = openInIde(folderPath, prefs)
    if (!ide.ok) errors.push(`IDE: ${ide.error}`)

    if (errors.length === 0) return { ok: true }
    return { ok: false, error: errors.join("; ") }
}
