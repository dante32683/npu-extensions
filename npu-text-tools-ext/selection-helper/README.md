# TextSelectionHelper

Small WinForms **`SendKeys`** helper: `send-copy <maxWaitMs>` and `send-paste <maxWaitMs>`. Each polls until the foreground process is **not** `Raycast`, then sends **Ctrl+C** or **Ctrl+V** (so Copy/Paste hit your editor after Raycast closes).

## How it runs (important)

Raycast **does not** keep this program running in the background. Each **Copy** or **Paste** step runs **`TextSelectionHelper.exe` once** via `child_process.execFile` — the process appears for a fraction of a second and exits. You will **not** see a long-lived “TextSelectionHelper” task like `AwakeKeeper.exe`.

If Raycast is **still** the foreground window after the wait budget, the helper **exits with code 2** and does **not** send keys (sending Copy then would only hit Raycast and produce bogus “no selection” behavior). It first tries **AttachThreadInput** + **SetForegroundWindow** on the window **below** the current foreground in z-order.

If selection commands misbehave, run the Raycast command **Verify Text Selection Helper** (or from PowerShell: `.\TextSelectionHelper.exe noop` in `assets\bin\selection-helper\`).

## Publish (from repo root)

```powershell
dotnet publish npu-text-tools-ext/selection-helper/TextSelectionHelper.csproj -c Release -r win-x64 --self-contained false -o npu-text-tools-ext/assets/bin/selection-helper
```

Requires the **.NET 8 Desktop Runtime (x64)** on the PC. If `TextSelectionHelper.exe` fails to start, install: https://dotnet.microsoft.com/download/dotnet/8.0

To avoid the runtime dependency, you can publish **self-contained** to the same output folder instead (larger):

```powershell
dotnet publish npu-text-tools-ext/selection-helper/TextSelectionHelper.csproj -c Release -r win-x64 --self-contained true -o npu-text-tools-ext/assets/bin/selection-helper
```
