/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Show Success Toasts - When enabled, shows a success toast after a rewrite operation. */
  "showSuccessToasts": boolean,
  /** Ensure AI Model Ready - When enabled, calls EnsureReadyAsync before AI operations to avoid 'NotReady' errors. */
  "ensureModelReady": boolean,
  /** Selection Copy Delay - Wait after simulated Ctrl+C before reading the clipboard. Increase if selection capture fails in slow apps. Used by selection capture (quick paste/review and helper fallback). */
  "selectionCopyDelayMs": "80" | "120" | "200" | "350",
  /** Focus Wait (Max) - Native helper polls up to this long until the foreground window is not Raycast, then sends Copy/Paste. Increase if capture still fails after reloading the extension. */
  "selectionFocusReleaseMs": "1000" | "2000" | "3500" | "5000"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `fix-grammar` command */
  export type FixGrammar = ExtensionPreferences & {
  /** Prefill From Clipboard - When enabled, this command's form pre-fills with clipboard text on launch. */
  "prefillFromClipboard": boolean
}
  /** Preferences accessible in the `make-formal` command */
  export type MakeFormal = ExtensionPreferences & {
  /** Prefill From Clipboard - When enabled, this command's form pre-fills with clipboard text on launch. */
  "prefillFromClipboard": boolean
}
  /** Preferences accessible in the `make-concise` command */
  export type MakeConcise = ExtensionPreferences & {
  /** Prefill From Clipboard - When enabled, this command's form pre-fills with clipboard text on launch. */
  "prefillFromClipboard": boolean
}
  /** Preferences accessible in the `bullet-points` command */
  export type BulletPoints = ExtensionPreferences & {
  /** Prefill From Clipboard - When enabled, this command's form pre-fills with clipboard text on launch. */
  "prefillFromClipboard": boolean
}
  /** Preferences accessible in the `simplify` command */
  export type Simplify = ExtensionPreferences & {
  /** Prefill From Clipboard - When enabled, this command's form pre-fills with clipboard text on launch. */
  "prefillFromClipboard": boolean
}
  /** Preferences accessible in the `custom-rewrite` command */
  export type CustomRewrite = ExtensionPreferences & {
  /** Prefill From Clipboard - When enabled, this command's form pre-fills with clipboard text on launch. */
  "prefillFromClipboard": boolean
}
  /** Preferences accessible in the `text-tools-diagnostics` command */
  export type TextToolsDiagnostics = ExtensionPreferences & {}
  /** Preferences accessible in the `paste-selection-quick` command */
  export type PasteSelectionQuick = ExtensionPreferences & {
  /** Quick Rewrite Mode - Phi rewrite mode for this command. Match **Review Selection (Quick)** → Quick rewrite mode for the same behavior. */
  "quickRewriteMode": "grammar" | "formal" | "concise" | "bullets" | "simplify" | "custom",
  /** Quick Custom Instruction - Used when Quick rewrite mode is Custom. Match **Review Selection (Quick)** → Quick custom instruction. */
  "quickCustomInstruction"?: string
}
  /** Preferences accessible in the `review-selection-quick` command */
  export type ReviewSelectionQuick = ExtensionPreferences & {
  /** Quick Rewrite Mode - Phi rewrite mode for this command. Match **Paste Selection (Quick)** → Quick rewrite mode for the same behavior. */
  "quickRewriteMode": "grammar" | "formal" | "concise" | "bullets" | "simplify" | "custom",
  /** Quick Custom Instruction - Used when Quick rewrite mode is Custom. Match **Paste Selection (Quick)** → Quick custom instruction. */
  "quickCustomInstruction"?: string
}
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
  /** Arguments passed to the `text-tools-diagnostics` command */
  export type TextToolsDiagnostics = {}
  /** Arguments passed to the `paste-selection-quick` command */
  export type PasteSelectionQuick = {}
  /** Arguments passed to the `review-selection-quick` command */
  export type ReviewSelectionQuick = {}
  /** Arguments passed to the `review-selection-pane` command */
  export type ReviewSelectionPane = {}
}

