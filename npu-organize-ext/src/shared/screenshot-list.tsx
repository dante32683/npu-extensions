import { Action, ActionPanel, Color, Icon, List, showToast, Toast, confirmAlert, Alert, open } from "@raycast/api"
import { useCallback, useEffect, useMemo, useState } from "react"
import path from "path"
import { applyProposal, planRename, RenameProposal, snapshotExistingNames } from "../utils/rename-pipeline"
import { listScreenshotCandidates, resolvePreferences, ResolvedPreferences } from "../utils/screenshots"

export type Mode = "rename" | "dry-run"

interface Props {
    mode: Mode
}

export function ScreenshotList({ mode }: Props) {
    const [prefs, setPrefs] = useState<ResolvedPreferences | null>(null)
    const [proposals, setProposals] = useState<RenameProposal[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusMessage, setStatusMessage] = useState<string>("Scanning...")

    const runScan = useCallback(async () => {
        setIsLoading(true)
        setProposals([])

        const resolved = resolvePreferences()
        setPrefs(resolved)

        const candidates = listScreenshotCandidates(resolved)
        if (candidates.length === 0) {
            setStatusMessage(
                `No renameable screenshots in ${resolved.watchFolder}. Drop a .png/.jpg/.webp in there, or adjust the Screenshots Folder preference.`,
            )
            setIsLoading(false)
            return
        }

        setStatusMessage(`Describing ${candidates.length} screenshot${candidates.length === 1 ? "" : "s"} on-device...`)

        const existing = snapshotExistingNames(resolved.watchFolder)
        // Process sequentially: ImageDescriptionGenerator is single-threaded
        // per process anyway and serializing keeps the toast meaningful.
        const next: RenameProposal[] = []
        for (let i = 0; i < candidates.length; i++) {
            setStatusMessage(`Describing ${i + 1} of ${candidates.length} (${candidates[i].basename})...`)
            const proposal = await planRename(candidates[i], resolved, existing)
            next.push(proposal)
            setProposals([...next])
        }

        setStatusMessage("")
        setIsLoading(false)
    }, [])

    useEffect(() => {
        void runScan()
    }, [runScan])

    const summary = useMemo(() => summarize(proposals), [proposals])

    const applyAll = useCallback(async () => {
        const pending = proposals.filter(p => p.status === "ready")
        if (pending.length === 0) {
            await showToast({ style: Toast.Style.Failure, title: "Nothing to rename" })
            return
        }
        const confirmed = await confirmAlert({
            title: `Rename ${pending.length} file${pending.length === 1 ? "" : "s"}?`,
            message: pending.map(p => `${p.candidate.basename}  →  ${p.targetBasename}`).join("\n"),
            primaryAction: { title: "Rename", style: Alert.ActionStyle.Default },
        })
        if (!confirmed) return

        const toast = await showToast({ style: Toast.Style.Animated, title: "Renaming screenshots..." })
        const updated = proposals.map(p => (p.status === "ready" ? applyProposal(p) : p))
        setProposals(updated)
        const renamed = updated.filter(p => p.status === "renamed").length
        const failed = updated.filter(p => p.status === "error").length
        toast.style = failed === 0 ? Toast.Style.Success : Toast.Style.Failure
        toast.title =
            failed === 0
                ? `Renamed ${renamed} screenshot${renamed === 1 ? "" : "s"}`
                : `Renamed ${renamed}, ${failed} failed`
        if (prefs && !prefs.showSuccessToasts && failed === 0) await toast.hide()
    }, [proposals, prefs])

    const applyOne = useCallback(
        async (idx: number) => {
            const proposal = proposals[idx]
            if (proposal.status !== "ready") return
            const next = [...proposals]
            next[idx] = applyProposal(proposal)
            setProposals(next)
            if (next[idx].status === "renamed") {
                await showToast({
                    style: Toast.Style.Success,
                    title: `Renamed to ${next[idx].targetBasename}`,
                })
            } else if (next[idx].status === "error") {
                await showToast({
                    style: Toast.Style.Failure,
                    title: "Rename failed",
                    message: next[idx].error,
                })
            }
        },
        [proposals],
    )

    const title = mode === "rename" ? "Rename New Screenshots" : "Dry Run Screenshot Rename"
    const navigationSubtitle = prefs ? prefs.watchFolder : ""

    return (
        <List
            isLoading={isLoading}
            isShowingDetail
            navigationTitle={title}
            searchBarPlaceholder={navigationSubtitle ? `Watching ${navigationSubtitle}` : "Loading preferences..."}
        >
            {statusMessage && proposals.length === 0 ? (
                <List.EmptyView
                    icon={Icon.Image}
                    title={isLoading ? "Working..." : "No screenshots to rename"}
                    description={statusMessage}
                    actions={
                        <ActionPanel>
                            <Action title="Rescan" icon={Icon.ArrowClockwise} onAction={runScan} />
                        </ActionPanel>
                    }
                />
            ) : (
                <List.Section title="Summary" subtitle={summary}>
                    {proposals.map((p, idx) => (
                        <List.Item
                            key={p.candidate.fullPath}
                            title={p.candidate.basename}
                            subtitle={p.targetBasename}
                            icon={iconForProposal(p)}
                            accessories={accessoriesForProposal(p)}
                            detail={renderDetail(p)}
                            actions={
                                <ActionPanel>
                                    {mode === "rename" && p.status === "ready" && (
                                        <Action
                                            title="Rename This File"
                                            icon={Icon.CheckCircle}
                                            onAction={() => applyOne(idx)}
                                        />
                                    )}
                                    {mode === "rename" && (
                                        <Action
                                            title={`Rename All Ready (${proposals.filter(x => x.status === "ready").length})`}
                                            icon={Icon.Wand}
                                            shortcut={{ modifiers: ["cmd"], key: "return" }}
                                            onAction={applyAll}
                                        />
                                    )}
                                    <Action.ShowInFinder
                                        title="Reveal in Explorer"
                                        path={p.candidate.fullPath}
                                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                                    />
                                    <Action
                                        title="Open Watched Folder"
                                        icon={Icon.Folder}
                                        onAction={() => prefs && open(prefs.watchFolder)}
                                    />
                                    <Action
                                        title="Rescan"
                                        icon={Icon.ArrowClockwise}
                                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                                        onAction={runScan}
                                    />
                                    <Action.CopyToClipboard title="Copy Proposed Name" content={p.targetBasename} />
                                </ActionPanel>
                            }
                        />
                    ))}
                </List.Section>
            )}
        </List>
    )
}

function summarize(proposals: RenameProposal[]): string {
    if (proposals.length === 0) return ""
    const ready = proposals.filter(p => p.status === "ready").length
    const renamed = proposals.filter(p => p.status === "renamed").length
    const failed = proposals.filter(p => p.status === "error").length
    const parts: string[] = []
    if (ready > 0) parts.push(`${ready} ready`)
    if (renamed > 0) parts.push(`${renamed} renamed`)
    if (failed > 0) parts.push(`${failed} failed`)
    return parts.join(" · ") || `${proposals.length} item${proposals.length === 1 ? "" : "s"}`
}

function iconForProposal(p: RenameProposal) {
    switch (p.status) {
        case "renamed":
            return { source: Icon.CheckCircle, tintColor: Color.Green }
        case "ready":
            return p.confidence === "fallback"
                ? { source: Icon.QuestionMarkCircle, tintColor: Color.Orange }
                : { source: Icon.Wand, tintColor: Color.Blue }
        case "skipped":
            return { source: Icon.Circle, tintColor: Color.SecondaryText }
        case "error":
            return { source: Icon.XMarkCircle, tintColor: Color.Red }
        default:
            return { source: Icon.Circle }
    }
}

function accessoriesForProposal(p: RenameProposal): List.Item.Accessory[] {
    const acc: List.Item.Accessory[] = []
    if (p.confidence === "fallback") acc.push({ tag: { value: "fallback", color: Color.Orange } })
    else if (p.confidence === "low") acc.push({ tag: { value: "low confidence", color: Color.Yellow } })
    if (p.status === "renamed") acc.push({ tag: { value: "renamed", color: Color.Green } })
    if (p.status === "error") acc.push({ tag: { value: "error", color: Color.Red } })
    return acc
}

function renderDetail(p: RenameProposal) {
    const lines: string[] = []
    lines.push(`**Original:** \`${p.candidate.basename}\``)
    lines.push(`**Proposed:** \`${p.targetBasename}\``)
    lines.push(`**Folder:** \`${path.dirname(p.candidate.fullPath)}\``)
    lines.push("")
    if (p.description) {
        lines.push("**Description (ImageDescriptionGenerator):**")
        lines.push("")
        lines.push(`> ${p.description}`)
        lines.push("")
    }
    if (p.ocrExcerpt) {
        lines.push("**OCR excerpt:**")
        lines.push("")
        lines.push("```")
        lines.push(p.ocrExcerpt)
        lines.push("```")
        lines.push("")
    }
    if (p.error) {
        lines.push(`**Error:** ${p.error}`)
        lines.push("")
    }
    return (
        <List.Item.Detail
            markdown={lines.join("\n")}
            metadata={
                <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Status" text={p.status} />
                    <List.Item.Detail.Metadata.Label title="Confidence" text={p.confidence} />
                    <List.Item.Detail.Metadata.Label title="Captured" text={p.candidate.captureDate.toLocaleString()} />
                    <List.Item.Detail.Metadata.Label
                        title="Size"
                        text={`${(p.candidate.sizeBytes / 1024).toFixed(1)} KB`}
                    />
                    {p.elapsedMs > 0 && (
                        <List.Item.Detail.Metadata.Label title="Bridge time" text={`${p.elapsedMs} ms`} />
                    )}
                </List.Item.Detail.Metadata>
            }
        />
    )
}
