import { runReviewSelectionFlow } from "./utils/review-selection-bootstrap"

export default async function Command() {
    await runReviewSelectionFlow({ mode: "grammar", title: "Fix Grammar (Review Selection)" })
}
