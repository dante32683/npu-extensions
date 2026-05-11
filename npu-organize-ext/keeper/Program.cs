// OrganizeKeeper — Phase 2 of FORWARD_ROADMAP.md §6 (npu-organize-ext).
//
// Resident process that watches the configured Screenshots folder via
// FileSystemWatcher, debounces noisy Created/Changed bursts, optionally
// skips on battery, and spawns the sibling NpuBridge.exe (sparse-package
// identity NpuOrganizeBridge.Identity, beside this exe) per stable file to
// rename it according to the same slug rules the manual Raycast command uses
// (src/utils/slug.ts <-> SlugGenerator.cs). State lives in
// %LocalAppData%\NpuOrganize\state.json so the Raycast UI can read it
// without IPC.
//
// argv:
//   watch [--support-dir <path>]  (default — runs until killed or stop.flag appears)
//   process-one <imagePath>       (synchronous one-shot — useful for tests)
//   status                        (prints state.json contents to stdout, exits)
//   parity-check                  (runs SlugGenerator parity assertions; exits 0 on pass)

using OrganizeKeeper;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        string mode = args.Length > 0 ? args[0] : "watch";

        // parity-check is self-contained — no state store / support dir needed.
        if (mode == "parity-check")
        {
            return ParityCheck.Run();
        }

        string supportDir = StateStore.DefaultSupportDir();
        for (int i = 1; i < args.Length; i++)
        {
            if (args[i] == "--support-dir" && i + 1 < args.Length)
            {
                supportDir = args[++i];
            }
        }

        var store = new StateStore(supportDir);

        try
        {
            switch (mode)
            {
                case "watch":
                    return await RunWatchAsync(store).ConfigureAwait(false);
                case "status":
                    return RunStatus(store);
                case "process-one":
                    if (args.Length < 2)
                    {
                        Console.Error.WriteLine("Usage: OrganizeKeeper.exe process-one <imagePath>");
                        return 1;
                    }
                    return await RunProcessOneAsync(store, args[1]).ConfigureAwait(false);
                default:
                    Console.Error.WriteLine($"Unknown mode: {mode}");
                    Console.Error.WriteLine("Usage: OrganizeKeeper.exe <watch|status|process-one|parity-check> [args]");
                    return 1;
            }
        }
        catch (Exception ex)
        {
            store.AppendLog($"main  FATAL  {ex.Message}");
            Console.Error.WriteLine(ex);
            return 1;
        }
    }

    private static async Task<int> RunWatchAsync(StateStore store)
    {
        store.ClearStopFlag();

        var cfg = store.TryLoadConfig();
        if (cfg is null)
        {
            store.AppendLog("watch  ERROR  config.json missing — Raycast Start command must write it before launching the keeper");
            Console.Error.WriteLine($"config.json missing under {store.SupportDir}");
            return 1;
        }

        var startState = store.LoadState();
        startState.StartedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
        startState.LastHeartbeatAt = startState.StartedAt;
        startState.LastError = null;
        startState.WatchFolder = cfg.WatchFolder;
        store.SaveState(startState);

        DateTime lastConfigMtime = store.ConfigLastWriteUtc();
        var currentCfg = cfg;

        using var watcher = new ScreenshotWatcher(store, () => currentCfg);
        watcher.Start(currentCfg);

        try
        {
            while (true)
            {
                await Task.Delay(1000).ConfigureAwait(false);

                if (store.IsStopRequested())
                {
                    store.AppendLog("watch  stop-flag-detected");
                    store.ClearStopFlag();
                    break;
                }

                // Hot-reload config (debounce: only restart watcher if mtime changes).
                var mtime = store.ConfigLastWriteUtc();
                if (mtime > lastConfigMtime)
                {
                    var updated = store.TryLoadConfig();
                    if (updated is not null)
                    {
                        currentCfg = updated;
                        watcher.Start(currentCfg);
                        store.AppendLog("watch  config-reloaded");
                    }
                    lastConfigMtime = mtime;
                }

                // Heartbeat every ~5s so the Raycast Status view sees liveness.
                var st = store.LoadState();
                st.LastHeartbeatAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
                store.SaveState(st);
            }
        }
        finally
        {
            watcher.Stop();
            var finalState = store.LoadState();
            finalState.LastHeartbeatAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            store.SaveState(finalState);
        }

        return 0;
    }

    private static int RunStatus(StateStore store)
    {
        var state = store.LoadState();
        var cfg = store.TryLoadConfig();
        var payload = new
        {
            supportDir = store.SupportDir,
            configPath = store.ConfigPath,
            statePath = store.StatePath,
            logPath = store.LogPath,
            config = cfg,
            state,
        };
        Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(payload, new System.Text.Json.JsonSerializerOptions { WriteIndented = false }));
        return 0;
    }

    private static async Task<int> RunProcessOneAsync(StateStore store, string imagePath)
    {
        var cfg = store.TryLoadConfig();
        if (cfg is null)
        {
            Console.Error.WriteLine("config.json missing — run the Raycast Start command first to seed config.");
            return 1;
        }

        using var watcher = new ScreenshotWatcher(store, () => cfg);
        // No-op: we want a one-shot. Use the same logic by hand through the
        // BridgeClient + SlugGenerator to keep this orthogonal to the watcher
        // loop.

        var bridgeOutcome = await BridgeClient.ScreenshotTitleAsync(cfg.BridgePath, imagePath, cfg.EnsureModelReady, default)
            .ConfigureAwait(false);
        if (!bridgeOutcome.Ok)
        {
            Console.Error.WriteLine($"Bridge error: {bridgeOutcome.Error}");
            return 2;
        }

        var info = new FileInfo(imagePath);
        string slug = SlugGenerator.Slugify(bridgeOutcome.Result!.Description, cfg.MaxSlugTokens);
        if (slug.Length == 0 || bridgeOutcome.Result.Confidence == "low")
        {
            slug = SlugGenerator.BuildFallbackSlug($"{imagePath}:{info.CreationTimeUtc.Ticks}");
        }

        string baseFilename = SlugGenerator.BuildTargetFilename(slug, info.Extension, cfg.NamingPattern, info.CreationTime);
        var existing = new HashSet<string>(
            Directory.EnumerateFiles(info.DirectoryName!).Select(p => Path.GetFileName(p).ToLowerInvariant()),
            StringComparer.Ordinal);
        string finalBasename = SlugGenerator.ResolveCollision(baseFilename, n => existing.Contains(n.ToLowerInvariant()));
        Console.WriteLine($"{info.Name}  ->  {finalBasename}");
        return 0;
    }
}
