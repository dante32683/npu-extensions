using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;

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
            Console.Error.WriteLine("Usage:");
            Console.Error.WriteLine("  AwakeKeeper.exe <indefinite|timed|until|screen-off> [durationSeconds|targetEpochSeconds]");
            Console.Error.WriteLine("  AwakeKeeper.exe daemon <supportDir>");
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
        if (mode == "daemon")
        {
            if (args.Length < 2)
                throw new ArgumentException("daemon mode requires <supportDir>");

            RunDaemon(args[1]);
            return;
        }

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

        Console.WriteLine($"MODE: {mode}");
        if (expiry.HasValue)
        {
            Console.WriteLine($"EXPIRY: {expiry.Value.ToUnixTimeSeconds()}");
        }

        while (expiry is null || DateTimeOffset.UtcNow < expiry.Value)
        {
            SetThreadExecutionState(flags);
            Thread.Sleep(TimeSpan.FromSeconds(30));
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    private static void RunDaemon(string supportDir)
    {
        Directory.CreateDirectory(supportDir);
        string schedulesPath = Path.Combine(supportDir, "schedules.json");
        string statePath = Path.Combine(supportDir, "state.json");

        var daemon = new DaemonState(schedulesPath, statePath);
        daemon.StartWatching();

        Console.WriteLine("MODE: daemon");
        Console.WriteLine($"SUPPORT_DIR: {supportDir}");
        Console.WriteLine($"SCHEDULES: {schedulesPath}");
        Console.WriteLine($"STATE: {statePath}");

        while (true)
        {
            daemon.MaybeReload();

            var now = DateTimeOffset.Now;
            var decision = daemon.Decide(now);

            if (decision.IsActive)
            {
                SetThreadExecutionState(decision.Flags);
            }
            else
            {
                // Clear any previous requirement.
                SetThreadExecutionState(ES_CONTINUOUS);
            }

            Thread.Sleep(TimeSpan.FromSeconds(15));
        }
    }

    private sealed class DaemonState
    {
        private readonly string _schedulesPath;
        private readonly string _statePath;
        private FileSystemWatcher? _watcher;
        private volatile int _reloadRequested;
        private List<AwakeSchedule> _schedules = [];
        private AwakeStateFile _state = new();
        private DateTimeOffset _lastStateLoad = DateTimeOffset.MinValue;
        private DateTimeOffset _lastSchedulesLoad = DateTimeOffset.MinValue;

        public DaemonState(string schedulesPath, string statePath)
        {
            _schedulesPath = schedulesPath;
            _statePath = statePath;
        }

        public void StartWatching()
        {
            string dir = Path.GetDirectoryName(_schedulesPath)!;
            _watcher = new FileSystemWatcher(dir)
            {
                IncludeSubdirectories = false,
                EnableRaisingEvents = true,
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.CreationTime | NotifyFilters.Size
            };
            _watcher.Changed += (_, e) => OnWatchedFile(e.FullPath);
            _watcher.Created += (_, e) => OnWatchedFile(e.FullPath);
            _watcher.Renamed += (_, e) => OnWatchedFile(e.FullPath);
        }

        private void OnWatchedFile(string fullPath)
        {
            string p = Path.GetFullPath(fullPath);
            if (string.Equals(p, Path.GetFullPath(_schedulesPath), StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p, Path.GetFullPath(_statePath), StringComparison.OrdinalIgnoreCase))
            {
                Interlocked.Exchange(ref _reloadRequested, 1);
            }
        }

        public void MaybeReload()
        {
            // Always reload state periodically even if watcher misses an event.
            var now = DateTimeOffset.Now;
            bool periodic = (now - _lastStateLoad) > TimeSpan.FromSeconds(30) || (now - _lastSchedulesLoad) > TimeSpan.FromSeconds(30);

            if (periodic || Interlocked.Exchange(ref _reloadRequested, 0) == 1)
            {
                _schedules = LoadSchedules(_schedulesPath);
                _state = LoadState(_statePath);
                _lastSchedulesLoad = now;
                _lastStateLoad = now;
            }
        }

        public AwakeDecision Decide(DateTimeOffset nowLocal)
        {
            // 1) Manual override, if present and not expired.
            var ov = _state.Override;
            if (ov != null)
            {
                if (ov.ExpiryEpochSeconds is long exp && DateTimeOffset.UtcNow.ToUnixTimeSeconds() >= exp)
                {
                    // override expired; daemon will stop holding once state file is updated by orchestrator.
                }
                else
                {
                    uint flags = ov.Mode == "screen-off"
                        ? ES_CONTINUOUS | ES_SYSTEM_REQUIRED
                        : ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED;
                    return new AwakeDecision(true, flags);
                }
            }

            // 2) Any active schedule window.
            bool activeSchedule = _schedules.Any(s => s.Enabled && IsScheduleActiveNow(s, nowLocal));
            if (activeSchedule)
            {
                uint flags = ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED;
                return new AwakeDecision(true, flags);
            }

            return new AwakeDecision(false, ES_CONTINUOUS);
        }

        private static bool IsScheduleActiveNow(AwakeSchedule s, DateTimeOffset nowLocal)
        {
            // Days use 0=Sun..6=Sat (matches .NET DayOfWeek).
            int dow = (int)nowLocal.DayOfWeek;
            if (s.Days == null || s.Days.Length == 0 || !s.Days.Contains(dow))
                return false;

            if (!TryParseHm(s.Start, out var start) || !TryParseHm(s.End, out var end))
                return false;

            var t = nowLocal.TimeOfDay;

            if (start == end)
                return true; // treat as "all day" if equal

            if (start < end)
            {
                return t >= start && t < end;
            }

            // Cross-midnight window (e.g. 22:00-02:00): active if >= start OR < end.
            return t >= start || t < end;
        }

        private static bool TryParseHm(string? value, out TimeSpan hm)
        {
            hm = default;
            if (string.IsNullOrWhiteSpace(value))
                return false;
            var parts = value.Split(':', StringSplitOptions.TrimEntries);
            if (parts.Length < 2)
                return false;
            if (!int.TryParse(parts[0], out int h) || !int.TryParse(parts[1], out int m))
                return false;
            if (h is < 0 or > 23 || m is < 0 or > 59)
                return false;
            hm = new TimeSpan(h, m, 0);
            return true;
        }

        private static List<AwakeSchedule> LoadSchedules(string path)
        {
            try
            {
                if (!File.Exists(path))
                    return [];
                string json = ReadAllTextStable(path);
                var schedules = JsonSerializer.Deserialize<List<AwakeSchedule>>(json, JsonOptions) ?? [];
                return schedules.Where(s => !string.IsNullOrWhiteSpace(s.Id)).ToList();
            }
            catch
            {
                // If file is mid-write or invalid, treat as no schedules to avoid holding unexpectedly.
                return [];
            }
        }

        private static AwakeStateFile LoadState(string path)
        {
            try
            {
                if (!File.Exists(path))
                    return new AwakeStateFile();
                string json = ReadAllTextStable(path);
                return JsonSerializer.Deserialize<AwakeStateFile>(json, JsonOptions) ?? new AwakeStateFile();
            }
            catch
            {
                return new AwakeStateFile();
            }
        }

        private static string ReadAllTextStable(string path)
        {
            // Basic retry for the common "atomic write via rename" pattern.
            for (int i = 0; i < 5; i++)
            {
                try
                {
                    return File.ReadAllText(path);
                }
                catch (IOException)
                {
                    Thread.Sleep(30);
                }
            }
            return File.ReadAllText(path);
        }
    }

    private readonly record struct AwakeDecision(bool IsActive, uint Flags);

    private sealed class AwakeSchedule
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("enabled")]
        public bool Enabled { get; set; } = true;

        [JsonPropertyName("days")]
        public int[]? Days { get; set; }

        [JsonPropertyName("start")]
        public string? Start { get; set; }

        [JsonPropertyName("end")]
        public string? End { get; set; }
    }

    private sealed class AwakeStateFile
    {
        [JsonPropertyName("override")]
        public AwakeOverride? Override { get; set; }
    }

    private sealed class AwakeOverride
    {
        // "indefinite" | "screen-off" | "timed" | "until"
        [JsonPropertyName("mode")]
        public string Mode { get; set; } = "indefinite";

        // For timed/until, orchestrator writes a concrete UTC epoch seconds.
        [JsonPropertyName("expiryEpochSeconds")]
        public long? ExpiryEpochSeconds { get; set; }
    }

    private static long ParseSeconds(string value)
    {
        return long.TryParse(value, out long seconds) && seconds > 0
            ? seconds
            : throw new ArgumentException($"Invalid seconds value: {value}");
    }
}
