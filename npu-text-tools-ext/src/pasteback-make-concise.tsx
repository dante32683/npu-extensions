import { runPastebackRewrite } from "./utils/selection-rewrite"

export default async function Command() {
    await runPastebackRewrite({ mode: "concise", label: "Make Concise" })
}
