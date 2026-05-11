import type { PhiRewriteMode } from "./phi-rewrite-bridge"

const MODES: readonly PhiRewriteMode[] = ["grammar", "formal", "concise", "bullets", "simplify", "custom"]

export function parseQuickRewriteMode(raw: string | undefined): PhiRewriteMode {
    if (raw && (MODES as readonly string[]).includes(raw)) return raw as PhiRewriteMode
    return "grammar"
}

/** Short label for paste-back success toast (matches former per-mode paste commands). */
export function quickRewritePasteLabel(mode: PhiRewriteMode): string {
    switch (mode) {
        case "grammar":
            return "Fix Grammar"
        case "formal":
            return "Make Formal"
        case "concise":
            return "Make Concise"
        case "bullets":
            return "Bullet Points"
        case "simplify":
            return "Simplify"
        case "custom":
            return "Custom Rewrite"
    }
}

/** Title passed into the review pane (matches former `review-*` commands). */
export function quickRewriteReviewTitle(mode: PhiRewriteMode): string {
    return `${quickRewritePasteLabel(mode)} (Review Selection)`
}
