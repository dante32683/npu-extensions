import { runReviewSelectionFlow } from "./utils/review-selection-bootstrap"

export default async function Command() {
    await runReviewSelectionFlow({ mode: "simplify", title: "Simplify (Review Selection)" })
}
