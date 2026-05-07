import { Action, ActionPanel, Icon, List, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import { Jimp } from "jimp";

const execFileAsync = promisify(execFile);

interface ImageFile {
  path: string;
  name: string;
  extension: string;
}

// PowerShell scripts
const GET_SELECTED_FILES_SCRIPT = `
$shell = New-Object -ComObject Shell.Application
$selected = $shell.Windows() | Where-Object { $_.Name -eq "File Explorer" -or $_.Name -eq "Windows Explorer" } | ForEach-Object { $_.Document.SelectedItems() } | ForEach-Object { $_.Path }
if ($selected) { $selected | ConvertTo-Json } else { "[]" }
`;

const GET_CLIPBOARD_IMAGE_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img) {
    $tempPath = Join-Path $env:TEMP ("clipboard_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".png")
    $img.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $tempPath
} else {
    ""
}
`;

export default function Command() {
  const [selectedFiles, setSelectedFiles] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const fetchSelectedFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", GET_SELECTED_FILES_SCRIPT]);
      const filePaths: string | string[] = JSON.parse(stdout || "[]");
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths].filter(Boolean);
      
      const imageExtensions = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif", ".webp"];
      const images = paths
        .filter(p => imageExtensions.includes(path.extname(p).toLowerCase()))
        .map(p => ({
          path: p,
          name: path.basename(p),
          extension: path.extname(p).toLowerCase()
        }));

      setSelectedFiles(images);
    } catch (error) {
      console.error("Error fetching selected files:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSelectedFiles();
  }, [fetchSelectedFiles]);

  const handleClipboardImage = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Getting image from clipboard..." });
    try {
        const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-NonInteractive", "-Command", GET_CLIPBOARD_IMAGE_SCRIPT]);
        const tempPath = stdout.trim();
        if (!tempPath || !fs.existsSync(tempPath)) {
            toast.style = Toast.Style.Failure;
            toast.title = "No image in clipboard";
            return;
        }

        const clipboardFile = {
            path: tempPath,
            name: path.basename(tempPath),
            extension: ".png"
        };
        
        setSelectedFiles([clipboardFile]);
        toast.style = Toast.Style.Success;
        toast.title = "Clipboard image loaded";
    } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to get clipboard image";
        toast.message = String(error);
    }
  };

  const handleProcess = async (
    processor: (image: any) => Promise<any> | any, 
    suffix: string, 
    options: { format?: string; quality?: number } = {}
  ) => {
    if (selectedFiles.length === 0) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Processing ${selectedFiles.length} images...` });

    try {
      for (const file of selectedFiles) {
        const dir = path.dirname(file.path);
        const targetExt = options.format ? `.${options.format}` : file.extension;
        const newName = `${path.basename(file.name, file.extension)}${suffix}${targetExt}`;
        
        const finalDir = file.name.startsWith("clipboard_") ? path.join(os.homedir(), "Desktop") : dir;
        const outputPath = path.join(finalDir, newName);

        let image = await Jimp.read(file.path);
        const processed = await processor(image);
        if (processed) image = processed;
        
        await image.write(outputPath as any);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = `Processed ${selectedFiles.length} images`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Processing failed";
      toast.message = String(error);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Selected images in Explorer...">
      {selectedFiles.length > 0 ? (
        selectedFiles.map((file) => (
          <List.Item
            key={file.path}
            title={file.name}
            subtitle={file.path}
            icon={Icon.Image}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Conversions">
                  <Action title="Convert to PNG" onAction={() => handleProcess(() => {}, "_converted", { format: "png" })} />
                  <Action title="Convert to JPEG" onAction={() => handleProcess(() => {}, "_converted", { format: "jpeg" })} />
                  <Action title="Convert to WebP" onAction={() => handleProcess(() => {}, "_converted", { format: "webp" })} />
                  <Action title="Convert to BMP" onAction={() => handleProcess(() => {}, "_converted", { format: "bmp" })} />
                  <Action title="Convert to TIFF" onAction={() => handleProcess(() => {}, "_converted", { format: "tiff" })} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Transformations">
                  <Action 
                    title="Rotate..." 
                    icon={Icon.RotateClockwise} 
                    onAction={() => push(<RotateForm files={selectedFiles} onProcessed={fetchSelectedFiles} onProcess={handleProcess} />)} 
                  />
                  <Action 
                    title="Scale..." 
                    icon={Icon.MagnifyingGlass} 
                    onAction={() => push(<ScaleForm files={selectedFiles} onProcessed={fetchSelectedFiles} onProcess={handleProcess} />)} 
                  />
                  <Action 
                    title="Resize..." 
                    icon={Icon.Maximize} 
                    onAction={() => push(<ResizeForm files={selectedFiles} onProcessed={fetchSelectedFiles} onProcess={handleProcess} />)} 
                  />
                  <Action 
                    title="Pad with Borders..." 
                    icon={Icon.Box} 
                    onAction={() => push(<PadForm files={selectedFiles} onProcessed={fetchSelectedFiles} onProcess={handleProcess} />)} 
                  />
                  <Action title="Flip Horizontal" icon={Icon.ArrowsExpand} onAction={() => handleProcess((img) => img.flip({ horizontal: true, vertical: false }), "_flipped")} />
                  <Action title="Flip Vertical" icon={Icon.ArrowsExpand} onAction={() => handleProcess((img) => img.flip({ horizontal: false, vertical: true }), "_flipped")} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Filters & Effects">
                  <Action 
                    title="Apply Filter..." 
                    icon={Icon.Pencil} 
                    onAction={() => push(<FilterForm files={selectedFiles} onProcessed={fetchSelectedFiles} onProcess={handleProcess} />)} 
                  />
                  <Action title="Optimize (JPEG)" icon={Icon.ChevronUp} onAction={() => handleProcess(() => {}, "_optimized", { format: "jpeg" })} />
                  <Action title="Strip Metadata" icon={Icon.EyeDisabled} onAction={() => handleProcess(() => {}, "_stripped")} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Source">
                    <Action title="Paste from Clipboard" icon={Icon.Clipboard} onAction={handleClipboardImage} shortcut={{ modifiers: ["cmd"], key: "v" }} />
                    <Action title="Refresh Selection" icon={Icon.ArrowClockwise} onAction={fetchSelectedFiles} shortcut={{ modifiers: ["cmd"], key: "r" }} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView 
            title="No images selected" 
            description="Select images in Explorer or press Cmd+V to paste from clipboard." 
            icon={Icon.Image} 
            actions={
                <ActionPanel>
                    <Action title="Paste from Clipboard" icon={Icon.Clipboard} onAction={handleClipboardImage} />
                    <Action title="Refresh Selection" icon={Icon.ArrowClockwise} onAction={fetchSelectedFiles} />
                </ActionPanel>
            }
        />
      )}
    </List>
  );
}

function RotateForm({ files, onProcessed, onProcess }: { files: ImageFile[], onProcessed: () => void, onProcess: any }) {
    const { pop } = useNavigation();
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Rotate Images" onSubmit={async (values) => {
                        let angle = parseFloat(values.angle);
                        if (values.unit === "rad") angle = angle * (180 / Math.PI);
                        await onProcess((img: any) => img.rotate(angle), "_rotated");
                        pop();
                        onProcessed();
                    }} />
                </ActionPanel>
            }
        >
            <Form.TextField id="angle" title="Angle" placeholder="e.g. 45" defaultValue="90" />
            <Form.Separator />
            <Form.Dropdown id="unit" title="Unit" defaultValue="deg">
                <Form.Dropdown.Item value="deg" title="Degrees" />
                <Form.Dropdown.Item value="rad" title="Radians" />
            </Form.Dropdown>
        </Form>
    );
}

function ScaleForm({ files, onProcessed, onProcess }: { files: ImageFile[], onProcessed: () => void, onProcess: any }) {
    const { pop } = useNavigation();
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Scale Images" onSubmit={async (values) => {
                        const factor = parseFloat(values.factor) / 100;
                        await onProcess((img: any) => img.scale(factor), "_scaled");
                        pop();
                        onProcessed();
                    }} />
                </ActionPanel>
            }
        >
            <Form.TextField id="factor" title="Scale Factor (%)" placeholder="e.g. 50 or 200" defaultValue="50" />
        </Form>
    );
}

function PadForm({ files, onProcessed, onProcess }: { files: ImageFile[], onProcessed: () => void, onProcess: any }) {
    const { pop } = useNavigation();
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Pad Images" onSubmit={async (values) => {
                        const padding = parseInt(values.padding);
                        const color = values.color || "#ffffff";
                        await onProcess(async (img: any) => {
                            const newWidth = img.bitmap.width + padding * 2;
                            const newHeight = img.bitmap.height + padding * 2;
                            const canvas = new Jimp({ width: newWidth, height: newHeight, color: color as any });
                            canvas.composite(img, padding, padding);
                            return canvas;
                        }, "_padded");
                        pop();
                        onProcessed();
                    }} />
                </ActionPanel>
            }
        >
            <Form.TextField id="padding" title="Padding (px)" placeholder="e.g. 20" defaultValue="20" />
            <Form.TextField id="color" title="Background Color" placeholder="Hex e.g. #ffffff" defaultValue="#ffffff" />
        </Form>
    );
}

function FilterForm({ files, onProcessed, onProcess }: { files: ImageFile[], onProcessed: () => void, onProcess: any }) {
    const { pop } = useNavigation();
    const filters = [
        { id: "blur", title: "Blur", default: "5" },
        { id: "grayscale", title: "Grayscale" },
        { id: "sepia", title: "Sepia" },
        { id: "invert", title: "Invert" },
        { id: "brightness", title: "Brightness", default: "0.5" },
        { id: "contrast", title: "Contrast", default: "0.5" },
        { id: "posterize", title: "Posterize", default: "5" },
        { id: "pixelate", title: "Pixelate", default: "10" },
    ];

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Apply Filter" onSubmit={async (values) => {
                        await onProcess((img: any) => {
                            const val = parseFloat(values.value);
                            switch (values.filter) {
                                case "blur": img.blur(val || 5); break;
                                case "grayscale": img.greyscale(); break;
                                case "sepia": img.sepia(); break;
                                case "invert": img.invert(); break;
                                case "brightness": img.brightness(val || 0.5); break;
                                case "contrast": img.contrast(val || 0.5); break;
                                case "posterize": img.posterize(val || 5); break;
                                case "pixelate": img.pixelate(val || 10); break;
                            }
                        }, `_${values.filter}`);
                        pop();
                        onProcessed();
                    }} />
                </ActionPanel>
            }
        >
            <Form.Dropdown id="filter" title="Filter">
                {filters.map(f => <Form.Dropdown.Item key={f.id} value={f.id} title={f.title} />)}
            </Form.Dropdown>
            <Form.TextField id="value" title="Intensity / Value" placeholder="Depends on filter" />
        </Form>
    );
}

function ResizeForm({ files, onProcessed, onProcess }: { files: ImageFile[], onProcessed: () => void, onProcess: any }) {
    const { pop } = useNavigation();
    
    const handleSubmit = async (values: { width: string, height: string }) => {
        await onProcess((img: any) => {
            img.resize({
                w: values.width ? parseInt(values.width) : undefined, 
                h: values.height ? parseInt(values.height) : undefined
            });
        }, "_resized");
        pop();
        onProcessed();
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Resize Images" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.Description text={`Resizing ${files.length} images. Leave one field empty to maintain aspect ratio.`} />
            <Form.TextField id="width" title="Width (px)" placeholder="e.g. 1920" />
            <Form.TextField id="height" title="Height (px)" placeholder="e.g. 1080" />
        </Form>
    );
}
