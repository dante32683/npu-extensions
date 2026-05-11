import { describe, expect, it } from "vitest"
import {
    buildFallbackSlug,
    buildTargetFilename,
    formatYmd,
    isAlreadyDateNamed,
    normalizeExtension,
    parseExtensionList,
    resolveCollision,
    slugify,
    FALLBACK_SLUG_BASE,
} from "./slug"

describe("slugify", () => {
    it("collapses a typical ImageDescriptionGenerator caption into a 3-5 word slug", () => {
        const out = slugify("A screenshot of a Windows Settings dialog showing display options")
        expect(out).toBe("windows-settings-dialog-display-options")
    })

    it("removes diacritics and special punctuation", () => {
        const out = slugify("Café — Menu (2025)")
        expect(out).toBe("cafe-menu-2025")
    })

    it("respects the maxTokens cap", () => {
        const out = slugify("one two three four five six seven", { maxTokens: 3 })
        expect(out.split("-")).toHaveLength(3)
    })

    it("respects the maxLength cap and avoids trailing hyphens", () => {
        const out = slugify("alpha bravo charlie delta echo foxtrot golf hotel india", { maxLength: 12 })
        expect(out.length).toBeLessThanOrEqual(12)
        expect(out.endsWith("-")).toBe(false)
    })

    it("returns empty string when no usable tokens remain", () => {
        expect(slugify("")).toBe("")
        expect(slugify("    ")).toBe("")
        expect(slugify("!!! ??? ###")).toBe("")
    })

    it("falls back to stopwords when filtering would empty the slug", () => {
        const out = slugify("a the of", { maxTokens: 2 })
        expect(out).toBe("a-the")
    })

    it("keeps numeric tokens", () => {
        expect(slugify("Error 404 page not found")).toBe("error-404-page-not-found")
    })
})

describe("buildFallbackSlug", () => {
    it("starts with the canonical fallback base and appends a stable 8-char hash", () => {
        const a = buildFallbackSlug("C:/foo/bar.png:1700000000000")
        const b = buildFallbackSlug("C:/foo/bar.png:1700000000000")
        expect(a).toBe(b)
        expect(a.startsWith(`${FALLBACK_SLUG_BASE}-`)).toBe(true)
        expect(a.length).toBe(FALLBACK_SLUG_BASE.length + 1 + 8)
    })

    it("produces different hashes for different signatures", () => {
        expect(buildFallbackSlug("a")).not.toBe(buildFallbackSlug("b"))
    })
})

describe("buildTargetFilename", () => {
    const captureDate = new Date(2026, 4, 10) // May 10, 2026

    it("uses {YYYY-MM-DD}_{slug}.{ext} for the date-slug pattern (matches notes convention)", () => {
        expect(
            buildTargetFilename({
                slug: "settings-dialog",
                extension: ".png",
                pattern: "date-slug",
                captureDate,
            }),
        ).toBe("2026-05-10_settings-dialog.png")
    })

    it("supports the slug-only pattern", () => {
        expect(
            buildTargetFilename({
                slug: "settings-dialog",
                extension: "png",
                pattern: "slug-only",
            }),
        ).toBe("settings-dialog.png")
    })

    it("normalizes the extension (case, leading dot)", () => {
        expect(
            buildTargetFilename({
                slug: "x",
                extension: "PNG",
                pattern: "slug-only",
            }),
        ).toBe("x.png")
    })

    it("rejects empty slugs", () => {
        expect(() =>
            buildTargetFilename({
                slug: "",
                extension: ".png",
                pattern: "slug-only",
            }),
        ).toThrow()
    })
})

describe("resolveCollision", () => {
    it("returns the original filename when no collision", () => {
        expect(
            resolveCollision({
                baseFilename: "2026-05-10_foo.png",
                isTaken: () => false,
            }),
        ).toBe("2026-05-10_foo.png")
    })

    it("appends -2, -3, ... until free", () => {
        const taken = new Set(["2026-05-10_foo.png", "2026-05-10_foo-2.png", "2026-05-10_foo-3.png"])
        expect(
            resolveCollision({
                baseFilename: "2026-05-10_foo.png",
                isTaken: name => taken.has(name),
            }),
        ).toBe("2026-05-10_foo-4.png")
    })

    it("handles extension-less filenames", () => {
        const taken = new Set(["foo"])
        expect(
            resolveCollision({
                baseFilename: "foo",
                isTaken: name => taken.has(name),
            }),
        ).toBe("foo-2")
    })
})

describe("isAlreadyDateNamed", () => {
    it.each([
        ["2026-05-10_foo.png", true],
        ["2026-05-10_already-renamed.jpg", true],
        ["Screenshot 2026-05-10 123456.png", false],
        ["random.png", false],
        ["202-05-10_foo.png", false],
    ])("%s -> %s", (name, expected) => {
        expect(isAlreadyDateNamed(name)).toBe(expected)
    })
})

describe("formatYmd", () => {
    it("zero-pads month and day", () => {
        expect(formatYmd(new Date(2026, 0, 1))).toBe("2026-01-01")
    })
})

describe("normalizeExtension", () => {
    it.each([
        [".PNG", ".png"],
        ["jpg", ".jpg"],
        ["  .Webp  ", ".webp"],
        ["", ""],
    ])("%s -> %s", (input, expected) => {
        expect(normalizeExtension(input)).toBe(expected)
    })
})

describe("parseExtensionList", () => {
    it("parses a comma-separated list with mixed casing and missing dots", () => {
        const out = parseExtensionList(".png, JPG ; .webp")
        expect(out.has(".png")).toBe(true)
        expect(out.has(".jpg")).toBe(true)
        expect(out.has(".webp")).toBe(true)
        expect(out.size).toBe(3)
    })

    it("returns an empty set for empty input", () => {
        expect(parseExtensionList("").size).toBe(0)
    })
})
