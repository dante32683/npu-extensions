import { describe, expect, it } from "vitest"
import { parseCopyDelayMs, parseFocusPollMaxMs, type SelectionPrefs } from "./selection-prefs"

describe("parseCopyDelayMs", () => {
    it("uses defaults", () => {
        expect(parseCopyDelayMs({} as SelectionPrefs)).toBe(120)
    })
    it("clamps valid dropdown values", () => {
        expect(parseCopyDelayMs({ selectionCopyDelayMs: "350" } as SelectionPrefs)).toBe(350)
    })
})

describe("parseFocusPollMaxMs", () => {
    it("defaults to 2000", () => {
        expect(parseFocusPollMaxMs({} as SelectionPrefs)).toBe(2000)
    })
    it("accepts 5000", () => {
        expect(parseFocusPollMaxMs({ selectionFocusReleaseMs: "5000" } as SelectionPrefs)).toBe(5000)
    })
    it("falls back when saved pref is legacy short value", () => {
        expect(parseFocusPollMaxMs({ selectionFocusReleaseMs: "220" } as SelectionPrefs)).toBe(2000)
    })
})
