import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

export interface SelectedFile {
  path: string;
  name: string;
  extension: string;
}

/**
 * PowerShell scripts for Windows integration.
 */
const SCRIPTS = {
  GET_SELECTED_FILES: `
    $shell = New-Object -ComObject Shell.Application
    $selected = $shell.Windows() | 
        Where-Object { $_.Name -eq "File Explorer" -or $_.Name -eq "Windows Explorer" } | 
        ForEach-Object { $_.Document.SelectedItems() } | 
        ForEach-Object { $_.Path }
    if ($selected) { $selected | ConvertTo-Json } else { "[]" }
  `,
  GET_CLIPBOARD_IMAGE: `
    Add-Type -AssemblyName System.Windows.Forms
    $img = [System.Windows.Forms.Clipboard]::GetImage()
    if ($img) {
        $tempPath = Join-Path $env:TEMP ("clipboard_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".png")
        $img.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $tempPath
    } else {
        ""
    }
  `,
};

/**
 * Fetches the currently selected files in Windows Explorer.
 * @param allowedExtensions Optional array of extensions to filter by (e.g., [".png", ".jpg"])
 */
export async function getSelectedExplorerFiles(allowedExtensions?: string[]): Promise<SelectedFile[]> {
  try {
    const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", SCRIPTS.GET_SELECTED_FILES]);
    const parsed: string | string[] = JSON.parse(stdout || "[]");
    const paths = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);

    return paths
      .filter((p) => {
        if (!allowedExtensions) return true;
        return allowedExtensions.includes(path.extname(p).toLowerCase());
      })
      .map((p) => ({
        path: p,
        name: path.basename(p),
        extension: path.extname(p).toLowerCase(),
      }));
  } catch (error) {
    console.error("Error fetching selected files from Explorer:", error);
    return [];
  }
}

/**
 * Saves the current clipboard image to a temporary file.
 * @returns The path to the temporary image file, or null if no image was found.
 */
export async function getClipboardImage(): Promise<SelectedFile | null> {
  try {
    const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", SCRIPTS.GET_CLIPBOARD_IMAGE]);
    const tempPath = stdout.trim();

    if (tempPath && fs.existsSync(tempPath)) {
      return {
        path: tempPath,
        name: path.basename(tempPath),
        extension: path.extname(tempPath).toLowerCase(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching image from clipboard:", error);
    return null;
  }
}
