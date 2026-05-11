using System.Diagnostics;

namespace NpuTextToolsSelectionHelper;

/// <summary>Used by TextSelectionHelper and unit tests.</summary>
public static class RaycastDetector
{
    public static bool MatchesRaycast(string processName, string? executablePath)
    {
        if (processName.Contains("raycast", StringComparison.OrdinalIgnoreCase))
            return true;
        if (executablePath == null)
            return false;
        if (executablePath.Contains("Raycast", StringComparison.OrdinalIgnoreCase))
            return true;
        string norm = executablePath.Replace('\\', '/');
        if (norm.Contains("/raycast/", StringComparison.OrdinalIgnoreCase))
            return true;
        if (norm.EndsWith("/raycast.exe", StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    public static bool MatchesRaycast(Process p)
    {
        string? exe = null;
        try
        {
            exe = p.MainModule?.FileName;
        }
        catch
        {
            /* ignore */
        }

        return MatchesRaycast(p.ProcessName, exe);
    }
}
