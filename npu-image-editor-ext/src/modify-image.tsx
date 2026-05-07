import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation, environment, Form } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import { Jimp } from "jimp";
import { getSelectedExplorerFiles, getClipboardImage, SelectedFile } from "./utils/powershell-utils";

const execFileAsync = promisify(execFile);

// Path to the NPU Bridge executable
const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe");

export default function Command() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const fetchSelectedFiles = useCallback(async () => {
    setIsLoading(true);
    const images = await getSelectedExplorerFiles([".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".gif", ".webp"]);
    setSelectedFiles(images);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSelectedFiles();
  }, [fetchSelectedFiles]);

  const handleClipboardImage = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Getting image from clipboard..." });
    const clipboardFile = await getClipboardImage();
    
    if (clipboardFile) {
      setSelectedFiles([clipboardFile]);
      toast.style = Toast.Style.Success;
      toast.title = "Clipboard image loaded";
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "No image in clipboard";
    }
  };

  const runNpuCommand = async (command: string, file: SelectedFile) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Running NPU ${command}...` });

    if (!fs.existsSync(BRIDGE_PATH)) {
        toast.style = Toast.Style.Failure;
        toast.title = "Bridge Not Found";
        toast.message = `NpuBridge.exe missing. Run: dotnet publish -c Release -r win-x64 --self-contained true`;
        return;
    }

    try {
      const { stdout, stderr } = await execFileAsync(BRIDGE_PATH, [command, file.path], {
          // Bridge must run from its own directory to find its bundled DLLs
          cwd: path.dirname(BRIDGE_PATH),
          windowsHide: true,
      });

      if (stderr) console.error("[NpuBridge]", stderr);

      const result = JSON.parse(stdout);

      if (result.status === "success") {
        toast.style = Toast.Style.Success;
        toast.title = "Success";
        toast.message = result.message;
        fetchSelectedFiles();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "NPU Processing Failed";
      // spawn UNKNOWN on Windows typically means the exe couldn't start — rebuild with self-contained flag
      const msg = error?.code === "UNKNOWN"
          ? `Bridge failed to start. Rebuild: cd bridge && dotnet publish -c Release -r win-x64 --self-contained true`
          : String(error);
      toast.message = msg;
    }
  };

  const handleJimpProcess = async (
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

        let image = await (Jimp as any).read(file.path);
        const processed = await processor(image);
        if (processed) image = processed;
        
        await image.write(outputPath);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Success";
      toast.message = `Processed ${selectedFiles.length} images`;
      fetchSelectedFiles();
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
                <ActionPanel.Section title="NPU Actions (AI)">
                  <Action 
                    title="Remove Background" 
                    icon={Icon.Person}
                    onAction={() => runNpuCommand("remove-background", file)} 
                  />
                  <Action title="Super Resolution (Coming Soon)" icon={Icon.MagnifyingGlass} onAction={() => {}} />
                </ActionPanel.Section>
                
                <ActionPanel.Section title="Standard Actions (CPU)">
                  <ActionPanel.Submenu title="Convert..." icon={Icon.Repeat}>
                    <Action title="To PNG" onAction={() => handleJimpProcess(() => {}, "_converted", { format: "png" })} />
                    <Action title="To JPEG" onAction={() => handleJimpProcess(() => {}, "_converted", { format: "jpeg" })} />
                    <Action title="To WebP" onAction={() => handleJimpProcess(() => {}, "_converted", { format: "webp" })} />
                    <Action title="To BMP" onAction={() => handleJimpProcess(() => {}, "_converted", { format: "bmp" })} />
                  </ActionPanel.Submenu>
                  
                  <Action 
                    title="Rotate..." 
                    icon={Icon.RotateClockwise} 
                    onAction={() => push(<RotateForm onProcess={handleJimpProcess} />)} 
                  />
                  <Action 
                    title="Scale..." 
                    icon={Icon.MagnifyingGlass} 
                    onAction={() => push(<ScaleForm onProcess={handleJimpProcess} />)} 
                  />
                  <Action 
                    title="Resize..." 
                    icon={Icon.Maximize} 
                    onAction={() => push(<ResizeForm onProcess={handleJimpProcess} />)} 
                  />
                   <Action title="Flip Horizontal" icon={Icon.ArrowsExpand} onAction={() => handleJimpProcess((img) => img.flip(true, false), "_flipped")} />
                   <Action title="Flip Vertical" icon={Icon.ArrowsExpand} onAction={() => handleJimpProcess((img) => img.flip(false, true), "_flipped")} />
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

// Form Components (Restored from Legacy)

function RotateForm({ onProcess }: { onProcess: any }) {
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
                    }} />
                </ActionPanel>
            }
        >
            <Form.TextField id="angle" title="Angle" placeholder="e.g. 45" defaultValue="90" />
            <Form.Dropdown id="unit" title="Unit" defaultValue="deg">
                <Form.Dropdown.Item value="deg" title="Degrees" />
                <Form.Dropdown.Item value="rad" title="Radians" />
            </Form.Dropdown>
        </Form>
    );
}

function ScaleForm({ onProcess }: { onProcess: any }) {
    const { pop } = useNavigation();
    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Scale Images" onSubmit={async (values) => {
                        const factor = parseFloat(values.factor) / 100;
                        await onProcess((img: any) => img.scale(factor), "_scaled");
                        pop();
                    }} />
                </ActionPanel>
            }
        >
            <Form.TextField id="factor" title="Scale Factor (%)" placeholder="e.g. 50 or 200" defaultValue="50" />
        </Form>
    );
}

function ResizeForm({ onProcess }: { onProcess: any }) {
    const { pop } = useNavigation();
    const handleSubmit = async (values: { width: string, height: string }) => {
        await onProcess((img: any) => {
            img.resize(
                values.width ? parseInt(values.width) : (Jimp as any).AUTO, 
                values.height ? parseInt(values.height) : (Jimp as any).AUTO
            );
        }, "_resized");
        pop();
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Resize Images" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextField id="width" title="Width (px)" placeholder="Leave empty for auto" />
            <Form.TextField id="height" title="Height (px)" placeholder="Leave empty for auto" />
        </Form>
    );
}
