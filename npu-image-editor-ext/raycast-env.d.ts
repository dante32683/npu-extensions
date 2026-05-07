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
  /** Preferences accessible in the `modify-image` command */
  export type ModifyImage = ExtensionPreferences & {}
  /** Preferences accessible in the `remove-background` command */
  export type RemoveBackground = ExtensionPreferences & {}
  /** Preferences accessible in the `super-resolution` command */
  export type SuperResolution = ExtensionPreferences & {}
  /** Preferences accessible in the `make-sticker` command */
  export type MakeSticker = ExtensionPreferences & {}
  /** Preferences accessible in the `extract-text` command */
  export type ExtractText = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `modify-image` command */
  export type ModifyImage = {}
  /** Arguments passed to the `remove-background` command */
  export type RemoveBackground = {}
  /** Arguments passed to the `super-resolution` command */
  export type SuperResolution = {}
  /** Arguments passed to the `make-sticker` command */
  export type MakeSticker = {}
  /** Arguments passed to the `extract-text` command */
  export type ExtractText = {}
}

