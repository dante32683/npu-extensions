using System.Runtime.InteropServices;

namespace AwakeKeeper;

internal static class Program
{
    private const uint ES_CONTINUOUS = 0x80000000;
    private const uint ES_SYSTEM_REQUIRED = 0x00000001;
    private const uint ES_DISPLAY_REQUIRED = 0x00000002;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint SetThreadExecutionState(uint esFlags);

    private static int Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.Error.WriteLine("Usage: AwakeKeeper.exe <indefinite|timed|until|screen-off> [durationSeconds|targetEpochSeconds]");
            return 1;
        }

        try
        {
            Run(args);
            return 0;
        }
        finally
        {
            SetThreadExecutionState(ES_CONTINUOUS);
        }
    }

    private static void Run(string[] args)
    {
        string mode = args[0];
        DateTimeOffset? expiry = mode switch
        {
            "timed" when args.Length >= 2 => DateTimeOffset.UtcNow.AddSeconds(ParseSeconds(args[1])),
            "until" when args.Length >= 2 => DateTimeOffset.FromUnixTimeSeconds(ParseSeconds(args[1])),
            "indefinite" or "screen-off" => null,
            _ => throw new ArgumentException($"Unknown or incomplete mode: {mode}")
        };

        uint flags = mode == "screen-off"
            ? ES_CONTINUOUS | ES_SYSTEM_REQUIRED
            : ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED;

        while (expiry is null || DateTimeOffset.UtcNow < expiry.Value)
        {
            SetThreadExecutionState(flags);
            Thread.Sleep(TimeSpan.FromSeconds(30));
        }
    }

    private static long ParseSeconds(string value)
    {
        return long.TryParse(value, out long seconds) && seconds > 0
            ? seconds
            : throw new ArgumentException($"Invalid seconds value: {value}");
    }
}
