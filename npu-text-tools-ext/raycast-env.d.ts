/// <reference types="@raycast/api">

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  export type RewriteText = ExtensionPreferences & {}
}

declare namespace Arguments {
  export type RewriteText = {}
}
