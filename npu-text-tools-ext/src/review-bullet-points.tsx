import { runReviewSelectionFlow } from "./utils/review-selection-bootstrap"

export default async function Command() {
    await runReviewSelectionFlow({ mode: "bullets", title: "Bullet Points (Review Selection)" })
}
