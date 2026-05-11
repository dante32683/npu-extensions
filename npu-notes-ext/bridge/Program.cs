// Sparse identity: NpuNotesBridge.Identity (see Package.appxmanifest).
// Do NOT copy this exe across extensions — activation context follows the
// manifest beside it, and identity names differ per bridge.
//
// Commands handled here:
// - phi-note <tempInputFile>
// - phi-related <tempInputFile>
// - phi-search-relevance <tempInputFile>
// One JSON line on stdout per invocation; diagnostics on stderr.

using System.Text.Json;
using System.Text.Json.Serialization;
using System.Runtime.InteropServices;
using Microsoft.Windows.AI;
using Microsoft.Windows.AI.Text;

#pragma warning disable CS8305 // experimental APIs

namespace NpuNotesBridge;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static async Task<int> Main(string[] args)
    {
        if (args.Length < 2)
        {
            WriteJson(new { status = "error", message = "Usage: NpuBridge.exe <phi-note|phi-related|phi-search-relevance> <tempInputFile>" });
            return 1;
        }

        string command = args[0];
        string tempInputFile = args[1];
        if (!File.Exists(tempInputFile))
        {
            WriteJson(new { status = "error", message = $"Input file not found: {tempInputFile}" });
            return 1;
        }

        try
        {
            if (!TryUnlockNpuFeature())
            {
                Console.Error.WriteLine("[NpuBridge] Warning: LAF unlock was not successful, but proceeding.");
            }

            if (LanguageModel.GetReadyState() != AIFeatureReadyState.Ready)
            {
                Console.Error.WriteLine("[NpuBridge] Phi-Silica model not ready — downloading model weights...");
                var readyResult = await LanguageModel.EnsureReadyAsync();
                if (readyResult.Status != AIFeatureReadyResultState.Success)
                    throw new InvalidOperationException($"Phi-Silica model is unavailable: {readyResult.Status}");
            }

            switch (command)
            {
                case "phi-note":
                {
                    string rawNote = await File.ReadAllTextAsync(tempInputFile);
                    var result = await ProcessNoteWithPhi(rawNote);
                    WriteJson(new
                    {
                        status = "success",
                        category = result.Category,
                        title = result.Title,
                        formattedMarkdown = result.Content
                    });
                    return 0;
                }
                case "phi-related":
                {
                    string requestJson = await File.ReadAllTextAsync(tempInputFile);
                    var request = JsonSerializer.Deserialize<PhiRelatedRequest>(requestJson, JsonOptions);
                    if (request == null || request.NewNote == null || request.Candidates == null)
                        throw new InvalidOperationException("Invalid related request payload.");

                    var related = await FindRelatedNotesWithPhi(request);
                    WriteJson(new { status = "success", related });
                    return 0;
                }
                case "phi-search-relevance":
                {
                    string requestJson = await File.ReadAllTextAsync(tempInputFile);
                    var request = JsonSerializer.Deserialize<PhiSearchRelevanceRequest>(requestJson, JsonOptions);
                    if (request == null || string.IsNullOrWhiteSpace(request.Query) || request.Candidate == null)
                        throw new InvalidOperationException("Invalid search relevance request payload.");

                    bool relevant = await IsSearchRelevantWithPhi(request);
                    WriteJson(new { status = "success", relevant });
                    return 0;
                }
                default:
                    WriteJson(new { status = "error", message = "Usage: NpuBridge.exe <phi-note|phi-related|phi-search-relevance> <tempInputFile>" });
                    return 1;
            }
        }
        catch (Exception ex) when (IsPhiAccessDenied(ex))
        {
            string message =
                "Access is denied. Phi-Silica (LanguageModel) is not available.\n\n" +
                "Fixes to try:\n" +
                "- Ensure you're on a Copilot+ PC with supported hardware.\n" +
                "- Enable Windows Developer Mode.\n" +
                "- Run Windows Update so Copilot Runtime / on-device models are installed.\n" +
                "- Re-run the command once the model is available.";

            Console.Error.WriteLine($"[NpuBridge] Phi-Silica access denied: {ex}");
            WriteJson(new { status = "error", message });
            return 1;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuBridge] Unhandled exception: {ex}");
            WriteJson(new { status = "error", message = ex.Message });
            return 1;
        }
    }

    private static async Task<PhiNoteResponse> ProcessNoteWithPhi(string rawNote)
    {
        using var model = await LanguageModel.CreateAsync();

        string systemPrompt = @"You are a note-taking assistant. Given the raw note below, do two things:
1. Rewrite it as clean, readable markdown (fix grammar, add structure if helpful, keep it concise).
2. Classify it into exactly one of these categories: work, school, personal, tasks, ideas, health, finance, people, projects, misc.
3. Generate a short title: 3-5 words, lowercase, hyphen-separated (e.g. ""professor-office-hours"").

Respond with only valid JSON in this exact format:
{ ""category"": ""..."", ""title"": ""..."", ""content"": ""..."" }

Raw note:";

        var response = await model.GenerateResponseAsync($"{systemPrompt}\n\n{rawNote}");
        string jsonOutput = ExtractJsonObject(response.Text);

        try 
        {
            var result = JsonSerializer.Deserialize<PhiNoteResponse>(jsonOutput, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Category) || string.IsNullOrEmpty(result.Content))
            {
                throw new Exception("Phi-Silica returned an incomplete response.");
            }
            return result;
        }
        catch (JsonException)
        {
            throw new Exception($"Failed to parse Phi-Silica output as JSON. Output was: {jsonOutput}");
        }
    }

    private static async Task<string[]> FindRelatedNotesWithPhi(PhiRelatedRequest request)
    {
        using var model = await LanguageModel.CreateAsync();

        string systemPrompt = $@"You are a note-linking assistant. Given a new note and a list of candidate notes,
identify which candidates are semantically related to the new note (same topic, project, person, course, or task — not just shared keywords).

Output ONLY valid JSON in this EXACT shape: {{ ""related"": [""<path>"", ...] }}.
Rules:
- Each entry MUST be exactly one of the ""path"" strings from the candidates list.
  Do NOT invent paths.
- Return at most {request.MaxLinks} paths.
- If nothing is meaningfully related, return {{ ""related"": [] }}.
- DO NOT include explanations, prose, or code fences. JSON only.";

        string userPayload = JsonSerializer.Serialize(request, JsonOptions);
        var response = await model.GenerateResponseAsync($"{systemPrompt}\n\n{userPayload}");
        string jsonOutput = ExtractJsonObject(response.Text);

        try
        {
            var parsed = JsonSerializer.Deserialize<PhiRelatedResponse>(jsonOutput, JsonOptions);
            return parsed?.Related ?? Array.Empty<string>();
        }
        catch (JsonException)
        {
            throw new Exception($"Failed to parse Phi-Silica output as JSON. Output was: {jsonOutput}");
        }
    }

    private static async Task<bool> IsSearchRelevantWithPhi(PhiSearchRelevanceRequest request)
    {
        using var model = await LanguageModel.CreateAsync();

        string systemPrompt = @"You are a note-search assistant. Decide whether the candidate note is relevant to the user's query.

Output ONLY valid JSON in this EXACT shape: { ""relevant"": true|false }.
Rules:
- Answer true only if the candidate is meaningfully related to the query (same topic, entity, project, or intent).
- Prefer false when uncertain.
- Do NOT include any explanation, prose, or code fences. JSON only.";

        // Keep the user payload tiny for Phi-Silica context limits.
        var candidate = request.Candidate ?? throw new InvalidOperationException("Invalid candidate payload.");
        string userPayload =
            $"Query: {request.Query}\n\n" +
            $"Candidate:\n" +
            $"- path: {candidate.Path}\n" +
            $"- title: {candidate.Title}\n" +
            $"- category: {candidate.Category}\n" +
            $"- preview: {candidate.Preview}";

        var response = await model.GenerateResponseAsync($"{systemPrompt}\n\n{userPayload}");
        string jsonOutput = ExtractJsonObject(response.Text);

        try
        {
            var parsed = JsonSerializer.Deserialize<PhiSearchRelevanceResponse>(jsonOutput, JsonOptions);
            return parsed?.Relevant ?? false;
        }
        catch (JsonException)
        {
            throw new Exception($"Failed to parse Phi-Silica output as JSON. Output was: {jsonOutput}");
        }
    }

    private static string ExtractJsonObject(string text)
    {
        string trimmed = text.Trim();
        int start = trimmed.IndexOf("{", StringComparison.Ordinal);
        int end = trimmed.LastIndexOf("}", StringComparison.Ordinal);
        if (start == -1 || end == -1 || end <= start)
            return trimmed;

        return trimmed.Substring(start, end - start + 1);
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
                Console.Error.WriteLine($"[NpuBridge] Could not find LAF key for {featureId} in registry.");
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
            Console.Error.WriteLine($"[NpuBridge] LAF Unlock Result: {result.Status} (Feature: {featureId}, PFN: {pfn})");

            return result.Status == Windows.ApplicationModel.LimitedAccessFeatureStatus.Available ||
                   result.Status == Windows.ApplicationModel.LimitedAccessFeatureStatus.AvailableWithoutToken;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuBridge] LAF Unlock Error: {ex.Message}");
            return false;
        }
    }

    private static void WriteJson(object payload)
    {
        Console.WriteLine(JsonSerializer.Serialize(payload));
    }

    private static bool IsPhiAccessDenied(Exception ex)
    {
        // In some Windows builds, LanguageModel may be gated as a Limited Access Feature.
        // The underlying exception type/message is not stable, so use multiple signals.
        string message = ex.Message ?? "";
        if (message.Contains("Limited Access Feature", StringComparison.OrdinalIgnoreCase)) return true;
        if (message.Contains("com.microsoft.windows.ai.languagemodel", StringComparison.OrdinalIgnoreCase)) return true;

        if (ex is UnauthorizedAccessException) return true;
        if (ex is COMException comEx && (uint)comEx.HResult == 0x80070005) return true; // E_ACCESSDENIED

        return false;
    }
}

public class PhiNoteResponse
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = "misc";

    [JsonPropertyName("title")]
    public string Title { get; set; } = "untitled-note";

    [JsonPropertyName("content")]
    public string Content { get; set; } = "";
}

public sealed class PhiRelatedRequest
{
    [JsonPropertyName("newNote")]
    public PhiRelatedNote? NewNote { get; set; }

    [JsonPropertyName("candidates")]
    public List<PhiRelatedNote>? Candidates { get; set; }

    [JsonPropertyName("maxLinks")]
    public int MaxLinks { get; set; } = 5;
}

public sealed class PhiRelatedNote
{
    [JsonPropertyName("path")]
    public string Path { get; set; } = "";

    [JsonPropertyName("title")]
    public string Title { get; set; } = "";

    [JsonPropertyName("category")]
    public string Category { get; set; } = "";

    [JsonPropertyName("preview")]
    public string Preview { get; set; } = "";
}

public sealed class PhiRelatedResponse
{
    [JsonPropertyName("related")]
    public string[] Related { get; set; } = Array.Empty<string>();
}

public sealed class PhiSearchRelevanceRequest
{
    [JsonPropertyName("query")]
    public string Query { get; set; } = "";

    [JsonPropertyName("candidate")]
    public PhiRelatedNote? Candidate { get; set; }
}

public sealed class PhiSearchRelevanceResponse
{
    [JsonPropertyName("relevant")]
    public bool Relevant { get; set; }
}
