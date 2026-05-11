// Sparse identity: NpuOrganizeBridge.Identity (see Package.appxmanifest).
// Do NOT copy this exe across extensions — activation context follows the
// manifest beside it, and identity names differ per bridge.
//
// Commands handled here:
// - screenshot-title <imagePath> [--ensure-ready] [--no-ocr]
//
// Stdout: exactly one JSON line per invocation.
// Diagnostics on stderr only.
//
// The "screenshot-title" verb runs Microsoft's Image Description API
// (Microsoft.Windows.AI.Imaging.ImageDescriptionGenerator) — the same API
// the AI Dev Gallery "Describe Image WCR" sample uses — and optionally
// augments the result with WinRT OCR text (Windows.Media.Ocr.OcrEngine).
//
// Output shape (success):
// {
//   "status": "success",
//   "description": "<full sentence from ImageDescriptionGenerator>",
//   "confidence": "high" | "low",
//   "ocrExcerpt": "<first ~200 chars of OCR text, or null>",
//   "elapsedMs": 1234
// }
//
// The TypeScript side is responsible for turning `description` into a
// hyphen-separated slug. Keeping that step in TS makes it pure-functionally
// testable with Vitest (no Windows runtime needed).

using System.Diagnostics;
using System.Text.Json;
using Microsoft.Graphics.Imaging;
using Microsoft.Windows.AI;
using Microsoft.Windows.AI.ContentSafety;
using Microsoft.Windows.AI.Imaging;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;

namespace NpuOrganizeBridge;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        var positional = new List<string>();
        bool ensureReady = false;
        bool skipOcr = false;
        foreach (var a in args)
        {
            switch (a)
            {
                case "--ensure-ready":
                    ensureReady = true;
                    break;
                case "--no-ocr":
                    skipOcr = true;
                    break;
                default:
                    positional.Add(a);
                    break;
            }
        }

        if (positional.Count < 1)
        {
            WriteJson(new { status = "error", message = "Usage: NpuBridge.exe <screenshot-title> <imagePath> [--ensure-ready] [--no-ocr]" });
            return 1;
        }

        string command = positional[0];

        try
        {
            switch (command)
            {
                case "screenshot-title":
                    if (positional.Count < 2)
                    {
                        WriteJson(new { status = "error", message = "Usage: NpuBridge.exe screenshot-title <imagePath> [--ensure-ready] [--no-ocr]" });
                        return 1;
                    }
                    await ScreenshotTitleAsync(positional[1], ensureReady, skipOcr);
                    return 0;
                default:
                    WriteJson(new { status = "error", message = $"Unknown command: {command}" });
                    return 1;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuOrganizeBridge] {ex}");
            WriteJson(new { status = "error", message = ex.Message });
            return 1;
        }
    }

    private static async Task ScreenshotTitleAsync(string imagePath, bool ensureReady, bool skipOcr)
    {
        if (!File.Exists(imagePath))
            throw new FileNotFoundException("Image not found.", imagePath);

        string fullPath = Path.GetFullPath(imagePath);
        var sw = Stopwatch.StartNew();

        // Ensure Image Description model is available before doing any heavy I/O.
        await EnsureImageDescriptionReadyAsync(ensureReady);

        // Load image -> SoftwareBitmap (Bgra8 / Premultiplied — required by both
        // ImageBuffer.CreateForSoftwareBitmap and OcrEngine.RecognizeAsync).
        var inputFile = await StorageFile.GetFileFromPathAsync(fullPath);
        SoftwareBitmap bitmap;
        using (var stream = await inputFile.OpenAsync(FileAccessMode.Read))
        {
            var decoder = await BitmapDecoder.CreateAsync(stream);
            bitmap = await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
        }

        string? ocrExcerpt = null;
        if (!skipOcr)
        {
            try
            {
                ocrExcerpt = await TryRunOcrAsync(bitmap);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[NpuOrganizeBridge] OCR failed (non-fatal): {ex.Message}");
            }
        }

        string description;
        try
        {
            description = await DescribeImageAsync(bitmap);
        }
        finally
        {
            bitmap.Dispose();
        }

        // Confidence heuristic — kept simple intentionally; the TS sanitizer
        // is the deterministic guard. We only flag "low" when there's
        // essentially nothing to slug from.
        string trimmed = (description ?? "").Trim();
        int wordCount = trimmed.Length == 0
            ? 0
            : trimmed.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries).Length;
        string confidence = wordCount >= 2 ? "high" : "low";

        sw.Stop();

        WriteJson(new
        {
            status = "success",
            description = trimmed,
            confidence,
            ocrExcerpt,
            elapsedMs = sw.ElapsedMilliseconds,
        });
    }

    private static async Task EnsureImageDescriptionReadyAsync(bool ensureReady)
    {
        var state = ImageDescriptionGenerator.GetReadyState();
        switch (state)
        {
            case AIFeatureReadyState.Ready:
                return;
            case AIFeatureReadyState.NotReady:
                if (!ensureReady)
                {
                    // Mirror image-editor bridge convention: always try to load
                    // when not ready, so first run "just works".
                    Console.Error.WriteLine("[NpuOrganizeBridge] ImageDescription not ready — calling EnsureReadyAsync (may take a moment on first run)...");
                }

                var result = await ImageDescriptionGenerator.EnsureReadyAsync();
                if (result.Status != AIFeatureReadyResultState.Success)
                    throw new InvalidOperationException($"ImageDescriptionGenerator is unavailable: {result.Status}");
                return;
            case AIFeatureReadyState.DisabledByUser:
                throw new InvalidOperationException("Image Description is disabled by user policy.");
            default:
                throw new InvalidOperationException("Image Description is not supported on this system.");
        }
    }

    private static async Task<string> DescribeImageAsync(SoftwareBitmap bitmap)
    {
        // BriefDescription is the "caption" scenario — short, suitable for a
        // filename slug after sanitization. The AI Dev Gallery sample uses the
        // same kind for its default scenario.
        using var imageBuffer = ImageBuffer.CreateForSoftwareBitmap(bitmap);
        var generator = await ImageDescriptionGenerator.CreateAsync();
        var response = await generator.DescribeAsync(imageBuffer, ImageDescriptionKind.BriefDescription, new ContentFilterOptions());
        return response?.Description ?? string.Empty;
    }

    private static async Task<string?> TryRunOcrAsync(SoftwareBitmap bitmap)
    {
        var engine = OcrEngine.TryCreateFromUserProfileLanguages();
        if (engine is null) return null;

        var ocr = await engine.RecognizeAsync(bitmap);
        string text = (ocr?.Text ?? string.Empty).Trim();
        if (text.Length == 0) return null;

        const int maxLen = 200;
        if (text.Length > maxLen)
            text = text.Substring(0, maxLen);
        return text;
    }

    private static void WriteJson(object payload)
    {
        Console.WriteLine(JsonSerializer.Serialize(payload));
    }
}
