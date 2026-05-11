import { Clipboard, Toast, showToast } from "@raycast/api"

function fullMessage(err: unknown): string {
    const raw = (err as { stdout?: string }).stdout ?? ""
    if (raw) {
        try {
            const j = JSON.parse(raw.trim()) as { message?: string }
            if (j.message) return j.message
        } catch {
            // not JSON, fall through
        }
    }
    return err instanceof Error ? err.message : String(err)
}

const clipboardHint =
    "The full error from Windows / the bridge is on the clipboard. Paste into Notepad — Raycast shortens text in this popup, which can make it look wrong."

/** Update an existing toast: full error copied to clipboard (never echo a long/truncated preview here). */
export async function applyPhiFailureToToast(toast: Toast, err: unknown, options?: { title?: string }): Promise<void> {
    const full = fullMessage(err)
    await Clipboard.copy(full)
    toast.style = Toast.Style.Failure
    toast.title = options?.title ?? "Phi-Silica Error"
    toast.message = clipboardHint
    toast.primaryAction = {
        title: "Copy Again",
        onAction: () => {
            void Clipboard.copy(full)
        },
    }
}

/** New failure toast with clipboard copy. */
export async function showPhiFailureToast(title: string, err: unknown): Promise<void> {
    const full = fullMessage(err)
    await Clipboard.copy(full)
    await showToast({
        style: Toast.Style.Failure,
        title,
        message: clipboardHint,
        primaryAction: {
            title: "Copy Again",
            onAction: () => {
                void Clipboard.copy(full)
            },
        },
    })
}
