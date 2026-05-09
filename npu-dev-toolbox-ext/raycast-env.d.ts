/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default Open Action - Which action to run for the primary 'Open (Default)' action. */
  "defaultOpenTarget": "ide" | "terminal" | "explorer" | "all",
  /** Terminal - Which terminal to launch when 'Open in Terminal' is run. */
  "terminalChoice": "wt" | "pwsh" | "powershell" | "cmd" | "custom",
  /** Windows Terminal - When enabled, Windows Terminal opens a new tab in an existing window instead of a new window. */
  "terminalNewTab": boolean,
  /** Windows Terminal Profile Name - Optional profile name to open when Terminal is set to Windows Terminal (wt). Leave empty to use your Windows Terminal default profile. */
  "wtProfileName": string,
  /** Terminal Custom Path - Full path to a .exe or .lnk to use when 'Terminal' is set to 'Custom Path'. */
  "terminalCustomPath": string,
  /** IDE - Which IDE/editor to launch when 'Open in IDE' is run. */
  "ideChoice": "cursor" | "code" | "windsurf" | "idea" | "pycharm" | "webstorm" | "rider" | "subl" | "notepad++" | "custom",
  /** IDE Custom Path - Full path to a .exe or .lnk to use when 'IDE' is set to 'Custom Path'. */
  "ideCustomPath": string,
  /** Commit Style - Default commit message style for the Commit Message command. */
  "commitStyle": "conventional" | "plain"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `open-workspace` command */
  export type OpenWorkspace = ExtensionPreferences & {}
  /** Preferences accessible in the `workspace-history` command */
  export type WorkspaceHistory = ExtensionPreferences & {}
  /** Preferences accessible in the `commit-message` command */
  export type CommitMessage = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `open-workspace` command */
  export type OpenWorkspace = {}
  /** Arguments passed to the `workspace-history` command */
  export type WorkspaceHistory = {}
  /** Arguments passed to the `commit-message` command */
  export type CommitMessage = {
  /** optional repo path */
  "path": string
}
}

