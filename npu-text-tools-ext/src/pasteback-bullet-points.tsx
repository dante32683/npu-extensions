import { runPastebackRewrite } from "./utils/selection-rewrite"

export default async function Command() {
    await runPastebackRewrite({ mode: "bullets", label: "Bullet Points" })
}
