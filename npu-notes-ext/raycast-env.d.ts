/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Notes Folder - Where your notes are saved. Defaults to Documents\RaycastNotes. */
  "notesFolder": string,
  /** Prefill From Clipboard - When enabled, the Add Note form pre-fills with clipboard text. */
  "prefillFromClipboard": boolean,
  /** Semantic Search Debounce (ms) - Wait time before starting a semantic fallback search while typing. */
  "semanticSearchDebounce": string,
  /** Max Semantic Candidate Checks - When keyword matches are scarce, at most this many notes are evaluated with Phi (caps NPU calls). */
  "maxSemanticChecks": string,
  /** Max Semantic Results - Maximum number of notes to return from a semantic search match. */
  "maxSemanticResults": string,
  /** Show Success Toasts - When enabled, shows a success toast after saving or deleting a note. */
  "showSuccessToasts": boolean,
  /** Ensure AI Model Ready - When enabled, calls EnsureReadyAsync before AI operations to avoid 'NotReady' errors. */
  "ensureModelReady": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `add-note` command */
  export type AddNote = ExtensionPreferences & {}
  /** Preferences accessible in the `browse-notes` command */
  export type BrowseNotes = ExtensionPreferences & {}
  /** Preferences accessible in the `find-related` command */
  export type FindRelated = ExtensionPreferences & {}
  /** Preferences accessible in the `search-notes` command */
  export type SearchNotes = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `add-note` command */
  export type AddNote = {}
  /** Arguments passed to the `browse-notes` command */
  export type BrowseNotes = {}
  /** Arguments passed to the `find-related` command */
  export type FindRelated = {}
  /** Arguments passed to the `search-notes` command */
  export type SearchNotes = {}
}

