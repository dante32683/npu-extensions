/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `awake` command */
  export type Awake = ExtensionPreferences & {}
  /** Preferences accessible in the `awake-for` command */
  export type AwakeFor = ExtensionPreferences & {}
  /** Preferences accessible in the `awake-until` command */
  export type AwakeUntil = ExtensionPreferences & {}
  /** Preferences accessible in the `let-sleep` command */
  export type LetSleep = ExtensionPreferences & {}
  /** Preferences accessible in the `awake-status` command */
  export type AwakeStatus = ExtensionPreferences & {}
  /** Preferences accessible in the `screen-off-mode` command */
  export type ScreenOffMode = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `awake` command */
  export type Awake = {}
  /** Arguments passed to the `awake-for` command */
  export type AwakeFor = {
  /** minutes */
  "duration": string
}
  /** Arguments passed to the `awake-until` command */
  export type AwakeUntil = {
  /** e.g. 17:30 */
  "time": string
}
  /** Arguments passed to the `let-sleep` command */
  export type LetSleep = {}
  /** Arguments passed to the `awake-status` command */
  export type AwakeStatus = {}
  /** Arguments passed to the `screen-off-mode` command */
  export type ScreenOffMode = {}
}

