/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Notes Folder - Where your notes are saved. Defaults to Documents\RaycastNotes. */
  "notesFolder": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `add-note` command */
  export type AddNote = ExtensionPreferences & {}
  /** Preferences accessible in the `browse-notes` command */
  export type BrowseNotes = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `add-note` command */
  export type AddNote = {}
  /** Arguments passed to the `browse-notes` command */
  export type BrowseNotes = {}
}

