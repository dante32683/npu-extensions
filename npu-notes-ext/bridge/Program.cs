using System.Text.Json;

namespace NpuNotesBridge;

internal static class Program
{
    private static int Main(string[] args)
    {
        if (args.Length < 2 || args[0] != "phi-note")
        {
            WriteJson(new { status = "error", message = "Usage: NpuBridge.exe phi-note <tempInputFile>" });
            return 1;
        }

        WriteJson(new
        {
            status = "error",
            inputFile = args[1],
            message = "Phi-Silica note bridge scaffolded but not implemented yet."
        });
        return 2;
    }

    private static void WriteJson(object payload)
    {
        Console.WriteLine(JsonSerializer.Serialize(payload));
    }
}
