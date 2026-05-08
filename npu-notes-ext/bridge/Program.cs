// Sparse identity: NpuNotesBridge.Identity (see Package.appxmanifest).
// Do NOT copy this exe across extensions — activation context follows the
// manifest beside it, and identity names differ per bridge.
//
// Commands handled here: phi-note <tempInputFile>
// One JSON line on stdout per invocation; diagnostics on stderr.

using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Windows.AI;
using Microsoft.Windows.AI.Text;

#pragma warning disable CS8305 // experimental APIs

namespace NpuNotesBridge;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static async Task<int> Main(string[] args)
    {
        if (args.Length < 2 || args[0] != "phi-note")
        {
            WriteJson(new { status = "error", message = "Usage: NpuBridge.exe phi-note <tempInputFile>" });
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
            string rawNote = await File.ReadAllTextAsync(tempInputFile);
            
            if (LanguageModel.GetReadyState() != AIFeatureReadyState.Ready)
            {
                Console.Error.WriteLine("[NpuBridge] Phi-Silica model not ready — downloading model weights...");
                var readyResult = await LanguageModel.EnsureReadyAsync();
                if (readyResult.Status != AIFeatureReadyResultState.Success)
                    throw new InvalidOperationException($"Phi-Silica model is unavailable: {readyResult.Status}");
            }

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

        using var ctx = model.CreateContext(systemPrompt);
        var response = await model.GenerateResponseAsync(ctx, rawNote, new LanguageModelOptions());
        string jsonOutput = response.Text.Trim();

        // Sometimes the model wraps JSON in markdown blocks
        if (jsonOutput.Contains("```"))
        {
            int start = jsonOutput.IndexOf("{");
            int end = jsonOutput.LastIndexOf("}");
            if (start != -1 && end != -1 && end > start)
            {
                jsonOutput = jsonOutput.Substring(start, end - start + 1);
            }
        }

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

    private static void WriteJson(object payload)
    {
        Console.WriteLine(JsonSerializer.Serialize(payload));
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
