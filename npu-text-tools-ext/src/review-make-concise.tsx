import { runReviewSelectionFlow } from "./utils/review-selection-bootstrap"

export default async function Command() {
    await runReviewSelectionFlow({ mode: "concise", title: "Make Concise (Review Selection)" })
}
