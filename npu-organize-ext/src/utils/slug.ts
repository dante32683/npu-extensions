// Pure, deterministic title -> filename helpers. No Raycast / Node fs imports
// here so the Vitest suite can exercise every branch without touching disk.

export type NamingPattern = "date-slug" | "slug-only"

export interface SlugifyOptions {
    maxTokens?: number
    maxLength?: number
    stopwords?: ReadonlySet<string>
}

/**
 * Fallback slug used when the description is empty or unusable. Matches the
 * spirit of FORWARD_ROADMAP §6.2 "fallback slug, not raw model text on disk"
 * — we still want a unique-ish name, but the suffix comes from the file path
 * (handled by the caller via {@link buildFallbackSlug}).
 */
export const FALLBACK_SLUG_BASE = "screenshot"

const DEFAULT_STOPWORDS: ReadonlySet<string> = new Set([
    "a",
    "an",
    "the",
    "of",
    "is",
    "in",
    "on",
    "at",
    "and",
    "or",
    "to",
    "with",
    "this",
    "that",
    "it",
    "its",
    "for",
    "as",
    "by",
    "from",
    "into",
    "be",
    "are",
    "was",
    "were",
    "image",
    "picture",
    "photo",
    "photograph",
    "shows",
    "showing",
    "depicts",
    "displays",
    "screenshot",
])

const DEFAULT_MAX_TOKENS = 5
const DEFAULT_MAX_LENGTH = 60

/**
 * Convert an arbitrary description (e.g. an ImageDescriptionGenerator caption)
 * into a kebab-case slug. Returns the empty string if the description is
 * unusable — callers must combine that with {@link buildFallbackSlug}.
 *
 * Rules:
 * - Lowercase.
 * - Strip diacritics.
 * - Reject everything that is not `[a-z0-9-]`.
 * - Collapse repeated hyphens.
 * - Drop stopwords *after* tokenizing (so "a screenshot of a settings panel"
 *   collapses to "settings-panel").
 * - Keep at most `maxTokens` meaningful tokens.
 * - Enforce `maxLength` characters before extension.
 */
export function slugify(description: string, opts: SlugifyOptions = {}): string {
    const maxTokens = clampInt(opts.maxTokens ?? DEFAULT_MAX_TOKENS, 1, 12)
    const maxLength = clampInt(opts.maxLength ?? DEFAULT_MAX_LENGTH, 8, 200)
    const stopwords = opts.stopwords ?? DEFAULT_STOPWORDS

    const normalized = description
        .normalize("NFKD")
        // Drop combining marks (accents) — JavaScript's "Combining" Unicode
        // category isn't directly supported, so use the explicit U+0300..U+036F range.
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()

    if (normalized.length === 0) return ""

    const rawTokens = normalized.split(/\s+/)
    const filtered = rawTokens.filter(t => t.length > 0 && !stopwords.has(t))
    const tokensSource = filtered.length > 0 ? filtered : rawTokens
    const tokens = tokensSource.slice(0, maxTokens)
    if (tokens.length === 0) return ""

    let slug = tokens.join("-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    if (slug.length === 0) return ""

    if (slug.length > maxLength) {
        slug = slug.slice(0, maxLength).replace(/-+$/g, "")
    }

    return slug
}

/**
 * Deterministic unique-ish fallback derived from a stable signature (e.g.
 * `${filePath}:${birthtimeMs}`). 8 hex chars from a non-cryptographic hash —
 * we just need stable disambiguation, not security.
 */
export function buildFallbackSlug(signature: string): string {
    return `${FALLBACK_SLUG_BASE}-${shortHash(signature)}`
}

/**
 * Compose the on-disk filename from pattern + slug + capture date + extension.
 * Always returns a clean basename (no path components).
 */
export function buildTargetFilename(args: {
    slug: string
    extension: string
    pattern: NamingPattern
    captureDate?: Date
}): string {
    const slug = args.slug.replace(/^-+|-+$/g, "")
    const ext = normalizeExtension(args.extension)
    if (slug.length === 0) {
        throw new Error("buildTargetFilename requires a non-empty slug")
    }

    if (args.pattern === "slug-only") {
        return `${slug}${ext}`
    }

    const dateStr = formatYmd(args.captureDate ?? new Date())
    return `${dateStr}_${slug}${ext}`
}

/**
 * Append `-2`, `-3`, ... to the base name (before extension) until the
 * proposed full path doesn't appear in `taken`. Pure function — the caller
 * supplies the existence predicate so Vitest can fake it.
 */
export function resolveCollision(args: { baseFilename: string; isTaken: (filename: string) => boolean }): string {
    if (!args.isTaken(args.baseFilename)) return args.baseFilename

    const dot = args.baseFilename.lastIndexOf(".")
    const stem = dot === -1 ? args.baseFilename : args.baseFilename.slice(0, dot)
    const ext = dot === -1 ? "" : args.baseFilename.slice(dot)

    for (let i = 2; i < 10_000; i++) {
        const candidate = `${stem}-${i}${ext}`
        if (!args.isTaken(candidate)) return candidate
    }
    throw new Error(`Could not resolve a unique filename for ${args.baseFilename} after 10,000 attempts`)
}

/** Returns true iff the basename already matches the `YYYY-MM-DD_` prefix shape. */
export function isAlreadyDateNamed(basename: string): boolean {
    return /^\d{4}-\d{2}-\d{2}_/.test(basename)
}

export function formatYmd(date: Date): string {
    const y = date.getFullYear().toString().padStart(4, "0")
    const m = (date.getMonth() + 1).toString().padStart(2, "0")
    const d = date.getDate().toString().padStart(2, "0")
    return `${y}-${m}-${d}`
}

export function normalizeExtension(ext: string): string {
    const lower = ext.toLowerCase().trim()
    if (lower.length === 0) return ""
    return lower.startsWith(".") ? lower : `.${lower}`
}

/** Parse the comma-separated `fileExtensions` preference into a normalized set. */
export function parseExtensionList(raw: string): Set<string> {
    return new Set(
        raw
            .split(/[,;\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(normalizeExtension),
    )
}

function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min
    return Math.min(Math.max(Math.trunc(value), min), max)
}

// Tiny non-cryptographic hash (FNV-1a 32-bit) — enough for filename disambiguation.
function shortHash(input: string): string {
    let h = 0x811c9dc5
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return (h >>> 0).toString(16).padStart(8, "0")
}
