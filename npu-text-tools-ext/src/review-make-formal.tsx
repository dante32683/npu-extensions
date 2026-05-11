import { runReviewSelectionFlow } from "./utils/review-selection-bootstrap"

export default async function Command() {
    await runReviewSelectionFlow({ mode: "formal", title: "Make Formal (Review Selection)" })
}
