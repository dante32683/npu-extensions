/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Screenshots Folder - Folder to scan for new screenshots. Defaults to %UserProfile%\Pictures\Screenshots. */
  "watchFolder"?: string,
  /** Naming Pattern - How renamed files are constructed. date-slug uses {YYYY-MM-DD}_{slug}.{ext} (matches notes). slug-only drops the date prefix. */
  "namingPattern": "date-slug" | "slug-only",
  /** File Extensions - Comma-separated list of file extensions to rename (case-insensitive, leading dot optional). */
  "fileExtensions": string,
  /** Skip Already-Named Files - Skip files whose name already starts with a YYYY-MM-DD_ prefix, to avoid infinite re-rename loops. */
  "skipAlreadyNamed": boolean,
  /** Max File Size (MB) - Skip files larger than this (in megabytes) to protect the NPU. Empty = no limit. */
  "maxFileSizeMb": string,
  /** Max Slug Tokens - How many hyphen-separated words to keep in the slug. Recommended 3–5. */
  "maxSlugTokens": string,
  /** Show Success Toasts - When enabled, shows a toast summary after the batch completes. */
  "showSuccessToasts": boolean,
  /** Ensure AI Model Ready - When enabled, the bridge calls EnsureReadyAsync on ImageDescriptionGenerator before generating, avoiding 'NotReady' errors on first run. */
  "ensureModelReady": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `rename-new-screenshots` command */
  export type RenameNewScreenshots = ExtensionPreferences & {}
  /** Preferences accessible in the `dry-run-screenshot-rename` command */
  export type DryRunScreenshotRename = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `rename-new-screenshots` command */
  export type RenameNewScreenshots = {}
  /** Arguments passed to the `dry-run-screenshot-rename` command */
  export type DryRunScreenshotRename = {}
}

