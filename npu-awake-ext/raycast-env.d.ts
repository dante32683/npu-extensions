/// <reference types="@raycast/api">

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  export type Awake = ExtensionPreferences & {}
}

declare namespace Arguments {
  export type Awake = {
    duration?: string
  }
}
