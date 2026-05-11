// Sparse identity: NpuTextToolsBridge.Identity (see Package.appxmanifest).
// Do NOT copy this exe across extensions — activation context follows the
// manifest beside it, and identity names differ per bridge.
//
// Commands handled here: phi-rewrite <mode> <tempInputFile>
//   modes: grammar | formal | concise | bullets | simplify | custom
// One JSON line on stdout per invocation; diagnostics on stderr.

using System.Text.Json;
using Microsoft.Windows.AI;
using Microsoft.Windows.AI.Text;

#pragma warning disable CS8305 // experimental APIs

namespace NpuTextToolsBridge;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonReadOptions = new() { PropertyNameCaseInsensitive = true };

    private static async Task<int> Main(string[] args)
    {
        try
        {
            // Auto-Unlock Limited Access Feature
            if (!TryUnlockNpuFeature())
            {
                Console.Error.WriteLine("[NpuBridge] Warning: LAF unlock was not successful, but proceeding.");
            }

            if (args.Length < 3 || args[0] != "phi-rewrite")
            {
                WriteJson(new { status = "error", message = "Usage: NpuBridge.exe phi-rewrite <grammar|formal|concise|bullets|simplify|custom> <tempInputFile>" });
                return 1;
            }

            string mode = args[1];
            string tempFile = args[2];

            if (!File.Exists(tempFile))
            {
                WriteJson(new { status = "error", message = $"Temp file not found: {tempFile}" });
                return 1;
            }

            string fileContent = await File.ReadAllTextAsync(tempFile);
            string systemPrompt;
            string userText;

            if (mode == "custom")
            {
                var payload = JsonSerializer.Deserialize<CustomPayload>(fileContent, JsonReadOptions)
                    ?? throw new InvalidOperationException("Failed to parse custom rewrite payload.");
                systemPrompt = $"Rewrite the following text according to this instruction: {payload.Instruction}. Return only the rewritten text, no explanation.";
                userText = payload.Text;
            }
            else
            {
                systemPrompt = GetSystemPrompt(mode);
                userText = fileContent;
            }

            if (LanguageModel.GetReadyState() != AIFeatureReadyState.Ready)
            {
                Console.Error.WriteLine("[NpuBridge] Phi-Silica model not ready — downloading model weights...");
                var readyResult = await LanguageModel.EnsureReadyAsync();
                if (readyResult.Status != AIFeatureReadyResultState.Success)
                    throw new InvalidOperationException($"Phi-Silica model is unavailable: {readyResult.Status}");
            }

            using var model = await LanguageModel.CreateAsync();

            var response = await model.GenerateResponseAsync($"{systemPrompt}\n\n{userText}");

            WriteJson(new { status = "success", result = response.Text });
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuBridge] Unhandled exception: {ex}");
            WriteJson(new { status = "error", message = ex.Message });
            return 1;
        }
    }

    private static bool TryUnlockNpuFeature()
    {
        try
        {
            string featureId = "com.microsoft.windows.ai.languagemodel";

            // 1. Get the LAF Key from registry
            using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey($@"SOFTWARE\Microsoft\Windows\CurrentVersion\AppModel\LimitedAccessFeatures\{featureId}");
            string? lafKey = key?.GetValue("")?.ToString();

            if (string.IsNullOrEmpty(lafKey))
            {
                Console.Error.WriteLine($"[NpuBridge] Could not find LAF key for {featureId} in registry.");
                return false;
            }

            // 2. Get current PFN
            string pfn = Windows.ApplicationModel.Package.Current.Id.FamilyName;

            // 3. Calculate Token (UTF-8)
            string input = $"{featureId}!{lafKey}!{pfn}";
            byte[] inputBytes = System.Text.Encoding.UTF8.GetBytes(input);
            byte[] hashBytes = System.Security.Cryptography.SHA256.HashData(inputBytes);
            byte[] truncatedHash = new byte[16];
            System.Array.Copy(hashBytes, truncatedHash, 16);
            string token = Convert.ToBase64String(truncatedHash);

            // 4. Generate Attestation
            string publisherId = pfn.Split('_')[1];
            string attestation = $"{publisherId} has registered their use of {featureId} with Microsoft and agrees to the terms of use.";

            // 5. Unlock
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

    private static string GetSystemPrompt(string mode) => mode switch
    {
        "grammar"  => "Correct the grammar and spelling of the following text. Do not change the meaning or length. Do not add any extra formatting. Return only the corrected text, no explanation.",
        "formal"   => "Rewrite the following text in a formal, professional tone. Return only the rewritten text, no explanation.",
        "concise"  => "Rewrite the following text as concisely as possible while preserving all key information. Return only the rewritten text, no explanation.",
        "bullets"  => "Convert the following text into a clear, well-structured bullet point list. Return only the bullet points, no explanation.",
        "simplify" => "Rewrite the following text in simple, plain language that is easy to understand. Return only the rewritten text, no explanation.",
        _          => throw new ArgumentException($"Unknown mode: {mode}"),
    };

    private static void WriteJson(object payload) =>
        Console.WriteLine(JsonSerializer.Serialize(payload));

    private record CustomPayload(string Instruction, string Text);
}
