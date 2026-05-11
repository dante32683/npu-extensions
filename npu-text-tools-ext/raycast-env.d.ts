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
  "ensureModelReady": boolean
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
}

