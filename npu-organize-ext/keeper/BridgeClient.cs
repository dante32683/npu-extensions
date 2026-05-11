using System.Diagnostics;
using System.Text.Json;

namespace OrganizeKeeper;

/// <summary>
/// Spawns the sibling <c>NpuBridge.exe screenshot-title</c> verb and parses
/// its single-line JSON response. Mirrors the spawn rules used by the TS
/// helper (<c>cwd = dirname(exe)</c>, <c>windowsHide</c>).
/// </summary>
internal static class BridgeClient
{
    public sealed record TitleResponse(
        string Description,
        string Confidence,
        string? OcrExcerpt,
        long ElapsedMs);

    public sealed record BridgeOutcome(bool Ok, TitleResponse? Result, string? Error);

    public static async Task<BridgeOutcome> ScreenshotTitleAsync(
        string bridgePath,
        string imagePath,
        bool ensureModelReady,
        CancellationToken ct)
    {
        if (!File.Exists(bridgePath))
            return new BridgeOutcome(false, null, $"Bridge missing: {bridgePath}");

        var args = new List<string> { "screenshot-title", imagePath };
        if (ensureModelReady) args.Add("--ensure-ready");

        var psi = new ProcessStartInfo
        {
            FileName = bridgePath,
            WorkingDirectory = Path.GetDirectoryName(bridgePath)!,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        foreach (var a in args) psi.ArgumentList.Add(a);

        using var process = Process.Start(psi);
        if (process is null)
            return new BridgeOutcome(false, null, "Failed to start NpuBridge.exe");

        string stdout;
        string stderr;
        try
        {
            using var reg = ct.Register(() =>
            {
                try { if (!process.HasExited) process.Kill(true); } catch { /* ignore */ }
            });

            stdout = await process.StandardOutput.ReadToEndAsync(ct).ConfigureAwait(false);
            stderr = await process.StandardError.ReadToEndAsync(ct).ConfigureAwait(false);
            await process.WaitForExitAsync(ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            return new BridgeOutcome(false, null, "Bridge call cancelled");
        }

        if (!string.IsNullOrWhiteSpace(stderr))
        {
            // Bridge writes diagnostics to stderr — surfaced to the keeper log only.
            Console.Error.WriteLine($"[bridge stderr] {stderr.Trim()}");
        }

        try
        {
            using var doc = JsonDocument.Parse(stdout);
            var root = doc.RootElement;
            string status = root.GetProperty("status").GetString() ?? "";

            if (status == "success")
            {
                string description = root.TryGetProperty("description", out var d) ? (d.GetString() ?? "") : "";
                string confidence = root.TryGetProperty("confidence", out var c) ? (c.GetString() ?? "low") : "low";
                string? ocr = root.TryGetProperty("ocrExcerpt", out var oc)
                    ? (oc.ValueKind == JsonValueKind.Null ? null : oc.GetString())
                    : null;
                long elapsed = root.TryGetProperty("elapsedMs", out var em) && em.ValueKind == JsonValueKind.Number
                    ? em.GetInt64()
                    : 0;
                return new BridgeOutcome(true, new TitleResponse(description, confidence, ocr, elapsed), null);
            }

            string message = root.TryGetProperty("message", out var msg) ? (msg.GetString() ?? "") : "";
            return new BridgeOutcome(false, null, message);
        }
        catch (Exception ex)
        {
            return new BridgeOutcome(false, null, $"Malformed bridge JSON: {ex.Message}. Raw: {Truncate(stdout, 200)}");
        }
    }

    private static string Truncate(string s, int n) => s.Length > n ? s.Substring(0, n) + "..." : s;
}
