// Short-lived helper: ensure foreground is not Raycast, then Ctrl+C / Ctrl+V (SendKeys).
// STA required for System.Windows.Forms.SendKeys.

using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace NpuTextToolsSelectionHelper;

internal static class Program
{
    private const uint GW_HWNDNEXT = 2;

    [DllImport("user32.dll")]
    private static extern nint GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(nint hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    private static extern nint GetWindow(nint hWnd, uint uCmd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetForegroundWindow(nint hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.Error.WriteLine(
                "Usage: TextSelectionHelper.exe noop | send-copy <maxWaitMs> | send-paste <maxWaitMs>\n"
                    + "  noop — print ok and exit.\n"
                    + "  maxWaitMs = poll budget until foreground is not Raycast (default 2500)."
            );
            return 1;
        }

        if (args[0] == "noop")
        {
            Console.WriteLine("ok");
            return 0;
        }

        int maxWaitMs = 2500;
        if (args.Length >= 2 && int.TryParse(args[1], out int parsed) && parsed is >= 200 and <= 8000)
            maxWaitMs = parsed;

        try
        {
            switch (args[0])
            {
                case "send-copy":
                    if (!EnsureForegroundNotRaycastBeforeSend(maxWaitMs))
                    {
                        Console.Error.WriteLine(
                            "npu-text-tools-selection-helper: Raycast stayed in the foreground — cannot send Copy to your editor. "
                                + "Click the app that has the selection, or increase “Focus wait (max)” in extension preferences."
                        );
                        return 2;
                    }
                    SendKeys.SendWait("^c");
                    return 0;
                case "send-paste":
                    if (!EnsureForegroundNotRaycastBeforeSend(maxWaitMs))
                    {
                        Console.Error.WriteLine(
                            "npu-text-tools-selection-helper: Raycast stayed in the foreground — cannot send Paste to your editor."
                        );
                        return 2;
                    }
                    SendKeys.SendWait("^v");
                    return 0;
                default:
                    Console.Error.WriteLine("Unknown command. Use send-copy or send-paste.");
                    return 1;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    /// <summary>
    /// Poll until foreground is not Raycast, then optionally activate the window below in z-order (AttachThreadInput).
    /// </summary>
    private static bool EnsureForegroundNotRaycastBeforeSend(int maxWaitMs)
    {
        if (WaitUntilNotRaycast(maxWaitMs))
            return true;

        for (int i = 0; i < 6; i++)
        {
            _ = TryActivateWindowBelowForeground();
            Thread.Sleep(90);
            if (!IsForegroundRaycast())
                return true;
        }

        return !IsForegroundRaycast();
    }

    private static bool WaitUntilNotRaycast(int maxWaitMs)
    {
        const int step = 25;
        for (int waited = 0; waited < maxWaitMs; waited += step)
        {
            if (!IsForegroundRaycast())
                return true;
            Thread.Sleep(step);
        }
        return !IsForegroundRaycast();
    }

    private static bool TryActivateWindowBelowForeground()
    {
        nint fg = GetForegroundWindow();
        if (fg == 0)
            return false;

        nint next = GetWindow(fg, GW_HWNDNEXT);
        if (next == 0 || next == fg)
            return false;

        uint fgThread = GetWindowThreadProcessId(fg, out _);
        uint cur = GetCurrentThreadId();
        _ = AttachThreadInput(cur, fgThread, true);
        _ = SetForegroundWindow(next);
        _ = AttachThreadInput(cur, fgThread, false);
        return true;
    }

    private static bool IsForegroundRaycast()
    {
        nint hwnd = GetForegroundWindow();
        if (hwnd == 0)
            return false;

        _ = GetWindowThreadProcessId(hwnd, out uint pid);
        if (pid == 0)
            return false;

        try
        {
            using var p = Process.GetProcessById((int)pid);
            return IsRaycastProcess(p);
        }
        catch
        {
            return false;
        }
    }

    private static bool IsRaycastProcess(Process p) => RaycastDetector.MatchesRaycast(p);
}
