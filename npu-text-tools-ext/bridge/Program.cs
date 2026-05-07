using System.Text.Json;

namespace NpuTextToolsBridge;

internal static class Program
{
    private static int Main(string[] args)
    {
        if (args.Length < 3 || args[0] != "phi-rewrite")
        {
            WriteJson(new
            {
                status = "error",
                message = "Usage: NpuBridge.exe phi-rewrite <grammar|formal|concise|bullets|simplify|custom> <tempInputFile>"
            });
            return 1;
        }

        WriteJson(new
        {
            status = "error",
            mode = args[1],
            inputFile = args[2],
            message = "Phi-Silica rewrite bridge scaffolded but not implemented yet."
        });
        return 2;
    }

    private static void WriteJson(object payload)
    {
        Console.WriteLine(JsonSerializer.Serialize(payload));
    }
}
