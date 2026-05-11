/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Lid Close Note - Show a note about lid-close / power-button behavior on success toasts. */
  "showLidNote": boolean,
  /** Show Success Toasts - When enabled, shows a success toast after an awake operation. */
  "showSuccessToasts": boolean,
  /** Ensure AI Model Ready - When enabled, calls EnsureReadyAsync before AI operations to avoid 'NotReady' errors. */
  "ensureModelReady": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `awake` command */
  export type Awake = ExtensionPreferences & {
  /** Default Awake Mode - Mode activated by the Awake toggle command. */
  "defaultAwakeMode": "indefinite" | "screen-off"
}
  /** Preferences accessible in the `awake-natural` command */
  export type AwakeNatural = ExtensionPreferences & {
  /** Default Schedule Start - When Smart Awake parses a schedule without a start time, use this HH:mm. */
  "defaultScheduleStart": string,
  /** Default Schedule End - When Smart Awake parses a schedule without an end time, use this HH:mm. */
  "defaultScheduleEnd": string,
  /** Default Schedule Days - Comma-separated weekdays when the model omits days: mon,tue,wed,thu,fri,sat,sun. */
  "defaultScheduleDays": string
}
  /** Preferences accessible in the `awake-for` command */
  export type AwakeFor = ExtensionPreferences & {
  /** Default Duration (minutes) - Pre-filled value for the Awake For command when opened without an argument. */
  "defaultDuration": string
}
  /** Preferences accessible in the `awake-until` command */
  export type AwakeUntil = ExtensionPreferences & {
  /** Default Until Time - Pre-filled time for Awake Until (HH:mm) when opened without an argument. */
  "defaultUntilTime": string
}
  /** Preferences accessible in the `let-sleep` command */
  export type LetSleep = ExtensionPreferences & {}
  /** Preferences accessible in the `awake-status` command */
  export type AwakeStatus = ExtensionPreferences & {}
  /** Preferences accessible in the `awake-schedules` command */
  export type AwakeSchedules = ExtensionPreferences & {}
  /** Preferences accessible in the `stop-awake-daemon` command */
  export type StopAwakeDaemon = ExtensionPreferences & {}
  /** Preferences accessible in the `screen-off-mode` command */
  export type ScreenOffMode = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `awake` command */
  export type Awake = {}
  /** Arguments passed to the `awake-natural` command */
  export type AwakeNatural = {
  /** e.g. keep awake for 90 minutes */
  "text": string
}
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
  /** Arguments passed to the `awake-schedules` command */
  export type AwakeSchedules = {}
  /** Arguments passed to the `stop-awake-daemon` command */
  export type StopAwakeDaemon = {}
  /** Arguments passed to the `screen-off-mode` command */
  export type ScreenOffMode = {}
}

