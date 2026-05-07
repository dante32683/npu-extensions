/// <reference types="@raycast/api">

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  notesFolder: string
}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  export type AddNote = ExtensionPreferences & {}
  export type SearchNotes = ExtensionPreferences & {}
}

declare namespace Arguments {
  export type AddNote = {}
  export type SearchNotes = {}
}
