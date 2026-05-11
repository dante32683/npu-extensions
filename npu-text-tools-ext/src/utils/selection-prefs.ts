export type SelectionPrefs = {
    showSuccessToasts?: boolean
    ensureModelReady?: boolean
    selectionCopyDelayMs?: string
    selectionFocusReleaseMs?: string
}

export function parseCopyDelayMs(prefs: SelectionPrefs): number {
    const raw = prefs.selectionCopyDelayMs ?? "120"
    const n = parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 40 && n <= 2000) return n
    return 120
}

/** Max time the native helper polls until the foreground window is not Raycast (ms). */
export function parseFocusPollMaxMs(prefs: SelectionPrefs): number {
    const raw = prefs.selectionFocusReleaseMs ?? "2000"
    const n = parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 500 && n <= 8000) return n
    return 2000
}
