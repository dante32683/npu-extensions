/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Prefill From Clipboard - When enabled, text tools pre-fill with clipboard text on launch. */
  "prefillFromClipboard": boolean,
  /** Show Success Toasts - When enabled, shows a success toast after a rewrite operation. */
  "showSuccessToasts": boolean,
  /** Ensure AI Model Ready - When enabled, calls EnsureReadyAsync before AI operations to avoid 'NotReady' errors. */
  "ensureModelReady": boolean,
  /** Quick Custom Instruction - Used by Custom … (Paste/Review Selection) commands when there is no form to type an instruction. */
  "quickCustomInstruction"?: string,
  /** Selection Copy Delay - Wait after simulated Ctrl+C before reading the clipboard. Increase if selection capture fails in slow apps. */
  "selectionCopyDelayMs": "80" | "120" | "200" | "350",
  /** Focus Wait (Max) - Native helper polls up to this long until the foreground window is not Raycast, then sends Copy/Paste. Increase if capture still fails after reloading the extension. */
  "selectionFocusReleaseMs": "1000" | "2000" | "3500" | "5000"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `fix-grammar` command */
  export type FixGrammar = ExtensionPreferences & {}
  /** Preferences accessible in the `make-formal` command */
  export type MakeFormal = ExtensionPreferences & {}
  /** Preferences accessible in the `make-concise` command */
  export type MakeConcise = ExtensionPreferences & {}
  /** Preferences accessible in the `bullet-points` command */
  export type BulletPoints = ExtensionPreferences & {}
  /** Preferences accessible in the `simplify` command */
  export type Simplify = ExtensionPreferences & {}
  /** Preferences accessible in the `custom-rewrite` command */
  export type CustomRewrite = ExtensionPreferences & {}
  /** Preferences accessible in the `verify-selection-helper` command */
  export type VerifySelectionHelper = ExtensionPreferences & {}
  /** Preferences accessible in the `pasteback-fix-grammar` command */
  export type PastebackFixGrammar = ExtensionPreferences & {}
  /** Preferences accessible in the `pasteback-make-formal` command */
  export type PastebackMakeFormal = ExtensionPreferences & {}
  /** Preferences accessible in the `pasteback-make-concise` command */
  export type PastebackMakeConcise = ExtensionPreferences & {}
  /** Preferences accessible in the `pasteback-bullet-points` command */
  export type PastebackBulletPoints = ExtensionPreferences & {}
  /** Preferences accessible in the `pasteback-simplify` command */
  export type PastebackSimplify = ExtensionPreferences & {}
  /** Preferences accessible in the `pasteback-custom-rewrite` command */
  export type PastebackCustomRewrite = ExtensionPreferences & {}
  /** Preferences accessible in the `review-fix-grammar` command */
  export type ReviewFixGrammar = ExtensionPreferences & {}
  /** Preferences accessible in the `review-make-formal` command */
  export type ReviewMakeFormal = ExtensionPreferences & {}
  /** Preferences accessible in the `review-make-concise` command */
  export type ReviewMakeConcise = ExtensionPreferences & {}
  /** Preferences accessible in the `review-bullet-points` command */
  export type ReviewBulletPoints = ExtensionPreferences & {}
  /** Preferences accessible in the `review-simplify` command */
  export type ReviewSimplify = ExtensionPreferences & {}
  /** Preferences accessible in the `review-custom-rewrite` command */
  export type ReviewCustomRewrite = ExtensionPreferences & {}
  /** Preferences accessible in the `review-selection-pane` command */
  export type ReviewSelectionPane = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `fix-grammar` command */
  export type FixGrammar = {}
  /** Arguments passed to the `make-formal` command */
  export type MakeFormal = {}
  /** Arguments passed to the `make-concise` command */
  export type MakeConcise = {}
  /** Arguments passed to the `bullet-points` command */
  export type BulletPoints = {}
  /** Arguments passed to the `simplify` command */
  export type Simplify = {}
  /** Arguments passed to the `custom-rewrite` command */
  export type CustomRewrite = {}
  /** Arguments passed to the `verify-selection-helper` command */
  export type VerifySelectionHelper = {}
  /** Arguments passed to the `pasteback-fix-grammar` command */
  export type PastebackFixGrammar = {}
  /** Arguments passed to the `pasteback-make-formal` command */
  export type PastebackMakeFormal = {}
  /** Arguments passed to the `pasteback-make-concise` command */
  export type PastebackMakeConcise = {}
  /** Arguments passed to the `pasteback-bullet-points` command */
  export type PastebackBulletPoints = {}
  /** Arguments passed to the `pasteback-simplify` command */
  export type PastebackSimplify = {}
  /** Arguments passed to the `pasteback-custom-rewrite` command */
  export type PastebackCustomRewrite = {}
  /** Arguments passed to the `review-fix-grammar` command */
  export type ReviewFixGrammar = {}
  /** Arguments passed to the `review-make-formal` command */
  export type ReviewMakeFormal = {}
  /** Arguments passed to the `review-make-concise` command */
  export type ReviewMakeConcise = {}
  /** Arguments passed to the `review-bullet-points` command */
  export type ReviewBulletPoints = {}
  /** Arguments passed to the `review-simplify` command */
  export type ReviewSimplify = {}
  /** Arguments passed to the `review-custom-rewrite` command */
  export type ReviewCustomRewrite = {}
  /** Arguments passed to the `review-selection-pane` command */
  export type ReviewSelectionPane = {}
}

