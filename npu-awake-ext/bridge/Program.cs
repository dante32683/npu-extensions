// Sparse identity: NpuAwakeBridge.Identity (see Package.appxmanifest).
// Do NOT copy this exe across extensions — activation context follows the
// manifest beside it, and identity names differ per bridge.
//
// Commands handled here: awake-intent <tempInputFile>
// One JSON line on stdout per invocation; diagnostics on stderr.

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Windows.AI;
using Microsoft.Windows.AI.Text;

namespace NpuAwakeBridge;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    private static async Task<int> Main(string[] args)
    {
        if (args.Length < 2 || args[0] != "awake-intent")
        {
            WriteJson(new { status = "error", message = "Usage: NpuBridge.exe awake-intent <tempInputFile>" });
            return 1;
        }

        string tempInputFile = args[1];
        if (!File.Exists(tempInputFile))
        {
            WriteJson(new { status = "error", message = $"Input file not found: {tempInputFile}" });
            return 1;
        }

        try
        {
            string userText = (await File.ReadAllTextAsync(tempInputFile)).Trim();
            if (string.IsNullOrWhiteSpace(userText))
            {
                WriteJson(new { status = "error", message = "Empty input" });
                return 1;
            }

            if (!TryUnlockNpuFeature())
            {
                Console.Error.WriteLine("[NpuAwakeBridge] Warning: LAF unlock was not successful, but proceeding.");
            }

            if (LanguageModel.GetReadyState() != AIFeatureReadyState.Ready)
            {
                Console.Error.WriteLine("[NpuAwakeBridge] Phi-Silica model not ready — downloading model weights...");
                var readyResult = await LanguageModel.EnsureReadyAsync();
                if (readyResult.Status != AIFeatureReadyResultState.Success)
                    throw new InvalidOperationException($"Phi-Silica model is unavailable: {readyResult.Status}");
            }

            var intent = await ExtractIntent(userText);
            WriteJson(new { status = "success", intent });
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuAwakeBridge] Unhandled exception: {ex}");
            WriteJson(new { status = "error", message = ex.Message });
            return 1;
        }
    }

    private static async Task<AwakeIntent> ExtractIntent(string userText)
    {
        using var model = await LanguageModel.CreateAsync();

        // IMPORTANT: Do not ask Phi to do arithmetic. We only extract raw fields.
        var now = DateTimeOffset.Now;
        string systemPrompt = $@"You are a routing assistant for a Windows ""keep awake"" tool.

Current local time: {now:yyyy-MM-dd HH:mm:ss}
Current day of week: {now:dddd}
Timezone offset (minutes): {(int)TimeZoneInfo.Local.GetUtcOffset(now).TotalMinutes}

Your job: infer what the user wants and output ONLY valid JSON that matches EXACTLY this schema:
{{
  ""action"": ""status"" | ""start"" | ""stop"" | ""schedule"" | ""unschedule"" | ""help"",
  ""mode"": ""indefinite"" | ""timed"" | ""until"" | ""screen-off"" | null,
  ""unit"": ""minutes"" | ""hours"" | null,
  ""value"": number | null,
  ""time"": ""HH:mm"" | null,
  ""days"": [""sun"",""mon"",""tue"",""wed"",""thu"",""fri"",""sat""] | null,
  ""start"": ""HH:mm"" | null,
  ""end"": ""HH:mm"" | null
}}

Rules:
- DO NOT compute timestamps or do time arithmetic.
- If the user asks ""for 90 minutes"": action=start, mode=timed, unit=minutes, value=90
- If the user asks ""until 5pm"": action=start, mode=until, time=""17:00""
- If the user asks to ""keep awake"": action=start, mode=indefinite
- If the user asks ""screen off mode"": action=start, mode=screen-off
- If the user asks about schedules like ""weekdays 09:00 to 17:00"": action=schedule, days=[""mon"",""tue"",""wed"",""thu"",""fri""], start=""09:00"", end=""17:00""
- If the user asks to stop schedules: action=unschedule
- If unclear, action=help

Return JSON only. No markdown fences. No explanation.";

        var response = await model.GenerateResponseAsync($"{systemPrompt}\n\nUser request: {userText}");

        string raw = response.Text ?? "";
        string json = ExtractJsonObject(raw);
        var intent = JsonSerializer.Deserialize<AwakeIntent>(json, JsonOptions);
        if (intent == null || string.IsNullOrWhiteSpace(intent.Action))
            throw new Exception("Phi-Silica returned an incomplete intent.");

        intent.Normalize();
        return intent;
    }

    private static string ExtractJsonObject(string text)
    {
        // "Surgical JSON extraction": take the first '{'..last '}' block.
        int start = text.IndexOf('{');
        int end = text.LastIndexOf('}');
        if (start == -1 || end == -1 || end <= start)
            throw new Exception($"Failed to extract JSON object from model output: {text}");
        return text.Substring(start, end - start + 1).Trim();
    }

    private static bool TryUnlockNpuFeature()
    {
        try
        {
            string featureId = "com.microsoft.windows.ai.languagemodel";

            using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey($@"SOFTWARE\Microsoft\Windows\CurrentVersion\AppModel\LimitedAccessFeatures\{featureId}");
            string? lafKey = key?.GetValue("")?.ToString();

            if (string.IsNullOrEmpty(lafKey))
            {
                Console.Error.WriteLine($"[NpuAwakeBridge] Could not find LAF key for {featureId} in registry.");
                return false;
            }

            string pfn = Windows.ApplicationModel.Package.Current.Id.FamilyName;

            string input = $"{featureId}!{lafKey}!{pfn}";
            byte[] inputBytes = System.Text.Encoding.UTF8.GetBytes(input);
            byte[] hashBytes = System.Security.Cryptography.SHA256.HashData(inputBytes);
            byte[] truncatedHash = new byte[16];
            System.Array.Copy(hashBytes, truncatedHash, 16);
            string token = Convert.ToBase64String(truncatedHash);

            string publisherId = pfn.Split('_')[1];
            string attestation = $"{publisherId} has registered their use of {featureId} with Microsoft and agrees to the terms of use.";

            var result = Windows.ApplicationModel.LimitedAccessFeatures.TryUnlockFeature(featureId, token, attestation);
            Console.Error.WriteLine($"[NpuAwakeBridge] LAF Unlock Result: {result.Status} (Feature: {featureId}, PFN: {pfn})");

            return result.Status == Windows.ApplicationModel.LimitedAccessFeatureStatus.Available ||
                   result.Status == Windows.ApplicationModel.LimitedAccessFeatureStatus.AvailableWithoutToken;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuAwakeBridge] LAF Unlock Error: {ex.Message}");
            return false;
        }
    }

    private static void WriteJson(object payload)
    {
        Console.WriteLine(JsonSerializer.Serialize(payload, JsonOptions));
    }
}

public sealed class AwakeIntent
{
    [JsonPropertyName("action")]
    public string? Action { get; set; }

    [JsonPropertyName("mode")]
    public string? Mode { get; set; }

    [JsonPropertyName("unit")]
    public string? Unit { get; set; }

    [JsonPropertyName("value")]
    public double? Value { get; set; }

    [JsonPropertyName("time")]
    public string? Time { get; set; }

    [JsonPropertyName("days")]
    public string[]? Days { get; set; }

    [JsonPropertyName("start")]
    public string? Start { get; set; }

    [JsonPropertyName("end")]
    public string? End { get; set; }

    public void Normalize()
    {
        Action = Action?.Trim().ToLowerInvariant();
        Mode = Mode?.Trim().ToLowerInvariant();
        Unit = Unit?.Trim().ToLowerInvariant();
        Time = NormalizeHm(Time);
        Start = NormalizeHm(Start);
        End = NormalizeHm(End);
        Days = Days?.Select(d => d.Trim().ToLowerInvariant()).Where(d => d.Length > 0).Distinct().ToArray();
    }

    private static string? NormalizeHm(string? hm)
    {
        if (string.IsNullOrWhiteSpace(hm))
            return null;
        var parts = hm.Trim().Split(':', StringSplitOptions.TrimEntries);
        if (parts.Length < 2)
            return null;
        if (!int.TryParse(parts[0], out int h) || !int.TryParse(parts[1], out int m))
            return null;
        if (h is < 0 or > 23 || m is < 0 or > 59)
            return null;
        return $"{h:00}:{m:00}";
    }
}

