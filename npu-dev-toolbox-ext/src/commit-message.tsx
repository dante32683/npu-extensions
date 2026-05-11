import {
    Action,
    ActionPanel,
    Detail,
    Icon,
    LaunchProps,
    Toast,
    getPreferenceValues,
    showToast,
    useNavigation,
} from "@raycast/api"
import { useCallback, useEffect, useState } from "react"
import fs from "fs"
import os from "os"
import path from "path"
import { detectActiveWorkspace, describeSource } from "./utils/foreground-context"
import { gatherGitContext, runGitCommit } from "./utils/git"
import { runDevBridge } from "./utils/run-bridge"
import { LauncherPrefs, openInExplorer, openInIde, openInTerminal } from "./utils/launchers"

type CommitResult = { subject: string; body: string }

type GeneratedState =
    | { kind: "no-changes"; repoRoot: string }
    | { kind: "error"; error: string }
    | { kind: "ready"; repoRoot: string; sourceLabel: string; result: CommitResult }

type LoadState = GeneratedState | { kind: "loading"; message: string }

function getLauncherPrefs(): LauncherPrefs {
    const prefs = getPreferenceValues<Preferences.CommitMessage>()
    return {
        terminalChoice: prefs.terminalChoice,
        terminalNewTab: Boolean(prefs.terminalNewTab),
        wtProfileName: prefs.wtProfileName ?? "",
        terminalCustomPath: prefs.terminalCustomPath ?? "",
        ideChoice: prefs.ideChoice,
        ideCustomPath: prefs.ideCustomPath ?? "",
    }
}

function renderMarkdown(result: CommitResult, repoRoot: string, sourceLabel: string): string {
    const body = result.body?.trim() ? `\n\n${result.body.trim()}` : ""
    return [
        `# Commit Message`,
        "",
        `**Repo:** \`${repoRoot}\`  `,
        `**Workspace source:** ${sourceLabel}`,
        "",
        "```",
        result.subject + body,
        "```",
    ].join("\n")
}

async function generateCommit(arg: string | undefined, style: "conventional" | "plain"): Promise<GeneratedState> {
    const detection = await detectActiveWorkspace(arg)
    if (!detection) {
        return {
            kind: "error",
            error: "Could not auto-detect a workspace. Pass a path argument, or open a terminal/IDE/Explorer at the repo first.",
        }
    }

    const sourceLabel = describeSource(detection.source)
    const ctx = await gatherGitContext(detection.cwd)
    if (!ctx.ok) {
        return { kind: "error", error: ctx.error }
    }

    if (ctx.value.diffEmpty) {
        return { kind: "no-changes", repoRoot: ctx.value.repoRoot }
    }

    const tempFile = path.join(os.tmpdir(), `phi-commit-${Date.now()}.json`)
    const payload = {
        branch: ctx.value.branch,
        recentCommits: ctx.value.recentCommits,
        diffStaged: ctx.value.diffStaged,
        diff: ctx.value.diff,
        style,
    }
    fs.writeFileSync(tempFile, JSON.stringify(payload), "utf8")

    try {
        const outcome = await runDevBridge("phi-commit", [tempFile])
        if (!outcome.ok) {
            return { kind: "error", error: outcome.error }
        }
        const subject = String(outcome.result.subject ?? "").trim()
        const body = String(outcome.result.body ?? "").trim()
        if (!subject) {
            return { kind: "error", error: "Bridge returned an empty commit subject." }
        }
        return {
            kind: "ready",
            repoRoot: ctx.value.repoRoot,
            sourceLabel,
            result: { subject, body },
        }
    } finally {
        try {
            fs.unlinkSync(tempFile)
        } catch {
            // ignore cleanup errors
        }
    }
}

export default function Command(props: LaunchProps<{ arguments: Arguments.CommitMessage }>) {
    const arg = props.arguments?.path?.trim() || undefined
    const prefs = getPreferenceValues<Preferences.CommitMessage>()
    const { commitStyle } = prefs
    const launcherPrefs = getLauncherPrefs()
    const { pop } = useNavigation()

    const [state, setState] = useState<LoadState>({ kind: "loading", message: "Detecting active workspace..." })

    const run = useCallback(async () => {
        setState({ kind: "loading", message: "Detecting active workspace..." })

        const detectingToast = await showToast({
            style: Toast.Style.Animated,
            title: "Detecting Active Workspace...",
        })

        const detection = await detectActiveWorkspace(arg)
        if (!detection) {
            detectingToast.style = Toast.Style.Failure
            detectingToast.title = "No Workspace Detected"
            detectingToast.message = "Pass a path argument or open a terminal/IDE/Explorer at the repo first."
            setState({
                kind: "error",
                error: "Could not auto-detect a workspace. Pass a path argument, or open a terminal/IDE/Explorer at the repo first.",
            })
            return
        }

        detectingToast.style = Toast.Style.Animated
        detectingToast.title = "Generating Commit Message with Phi-Silica..."
        detectingToast.message = describeSource(detection.source) + " - " + detection.cwd

        const next = await generateCommit(arg, commitStyle)
        if (next.kind === "ready") {
            if (prefs.showSuccessToasts !== false) {
                detectingToast.style = Toast.Style.Success
                detectingToast.title = "Commit Message Ready"
                detectingToast.message = next.result.subject
            } else {
                await detectingToast.hide()
            }
        } else if (next.kind === "no-changes") {
            if (prefs.showSuccessToasts !== false) {
                detectingToast.style = Toast.Style.Success
                detectingToast.title = "No Changes to Commit"
                detectingToast.message = next.repoRoot
            } else {
                await detectingToast.hide()
            }
        } else {
            detectingToast.style = Toast.Style.Failure
            detectingToast.title = "Commit Message Failed"
            detectingToast.message = next.error
        }
        setState(next)
    }, [arg, commitStyle])

    useEffect(() => {
        run()
    }, [run])

    if (state.kind === "loading") {
        return <Detail isLoading markdown={`# Commit Message\n\n${state.message}`} />
    }

    if (state.kind === "no-changes") {
        return (
            <Detail
                markdown={`# Commit Message\n\nNo changes to commit in \`${state.repoRoot}\`.`}
                actions={
                    <ActionPanel>
                        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={run} />
                        <Action
                            title="Open Repo in Explorer"
                            icon={Icon.Folder}
                            onAction={() => {
                                const r = openInExplorer(state.repoRoot)
                                if (!r.ok) {
                                    showToast({
                                        style: Toast.Style.Failure,
                                        title: "Open Failed",
                                        message: r.error,
                                    })
                                }
                            }}
                        />
                    </ActionPanel>
                }
            />
        )
    }

    if (state.kind === "error") {
        return (
            <Detail
                markdown={`# Commit Message Failed\n\n${state.error}`}
                actions={
                    <ActionPanel>
                        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={run} />
                    </ActionPanel>
                }
            />
        )
    }

    const { result, repoRoot, sourceLabel } = state
    const fullMessage = result.body?.trim() ? `${result.subject}\n\n${result.body}` : result.subject

    return (
        <Detail
            markdown={renderMarkdown(result, repoRoot, sourceLabel)}
            actions={
                <ActionPanel>
                    <Action.CopyToClipboard
                        title="Copy to Clipboard"
                        content={fullMessage}
                        shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                    <Action
                        title="Copy and Run Git Commit"
                        icon={Icon.Checkmark}
                        onAction={async () => {
                            const toast = await showToast({
                                style: Toast.Style.Animated,
                                title: "Running Git Commit...",
                            })
                            const outcome = await runGitCommit(repoRoot, result.subject, result.body)
                            if (outcome.ok) {
                                if (prefs.showSuccessToasts !== false) {
                                    toast.style = Toast.Style.Success
                                    toast.title = "Commit Created"
                                    toast.message = result.subject
                                } else {
                                    await toast.hide()
                                }
                                pop()
                            } else {
                                toast.style = Toast.Style.Failure
                                toast.title = "Git Commit Failed"
                                toast.message = outcome.error
                            }
                        }}
                    />
                    <Action title="Regenerate" icon={Icon.RotateClockwise} onAction={run} />
                    <ActionPanel.Section title="Workspace">
                        <Action
                            title="Open Repo in Explorer"
                            icon={Icon.Folder}
                            onAction={async () => {
                                const r = openInExplorer(repoRoot)
                                if (!r.ok)
                                    await showToast({
                                        style: Toast.Style.Failure,
                                        title: "Open in Explorer Failed",
                                        message: r.error,
                                    })
                            }}
                        />
                        <Action
                            title="Open Repo in Terminal"
                            icon={Icon.Terminal}
                            onAction={async () => {
                                const r = openInTerminal(repoRoot, launcherPrefs)
                                if (!r.ok)
                                    await showToast({
                                        style: Toast.Style.Failure,
                                        title: "Open in Terminal Failed",
                                        message: r.error,
                                    })
                            }}
                        />
                        <Action
                            title="Open Repo in IDE"
                            icon={Icon.Code}
                            onAction={async () => {
                                const r = openInIde(repoRoot, launcherPrefs)
                                if (!r.ok)
                                    await showToast({
                                        style: Toast.Style.Failure,
                                        title: "Open in IDE Failed",
                                        message: r.error,
                                    })
                            }}
                        />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    )
}
