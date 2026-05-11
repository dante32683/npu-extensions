import { describe, expect, it } from "vitest"
import { parseQuickRewriteMode, quickRewritePasteLabel, quickRewriteReviewTitle } from "./quick-rewrite-mode"

describe("parseQuickRewriteMode", () => {
    it("defaults to grammar", () => {
        expect(parseQuickRewriteMode(undefined)).toBe("grammar")
        expect(parseQuickRewriteMode("")).toBe("grammar")
        expect(parseQuickRewriteMode("not-a-mode")).toBe("grammar")
    })

    it("accepts each bridge mode", () => {
        expect(parseQuickRewriteMode("formal")).toBe("formal")
        expect(parseQuickRewriteMode("bullets")).toBe("bullets")
        expect(parseQuickRewriteMode("custom")).toBe("custom")
    })
})

describe("quickRewrite labels", () => {
    it("builds review title from paste label", () => {
        expect(quickRewritePasteLabel("grammar")).toBe("Fix Grammar")
        expect(quickRewriteReviewTitle("grammar")).toBe("Fix Grammar (Review Selection)")
    })
})
