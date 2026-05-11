using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace OrganizeKeeper;

/// <summary>
/// Per-path debounced file watcher. Coalesces noisy
/// <c>Created</c>/<c>Changed</c>/<c>Renamed</c> bursts from screenshot
/// writers (Snipping Tool / Xbox Game Bar write a temp file, write a final
/// file, sometimes touch the same path multiple times) into a single rename
/// attempt per stable path.
/// </summary>
internal sealed class ScreenshotWatcher : IDisposable
{
    private readonly StateStore _state;
    private readonly Func<KeeperConfig> _readConfig;
    private readonly ConcurrentDictionary<string, PendingFile> _pending = new(StringComparer.OrdinalIgnoreCase);
    private FileSystemWatcher? _fsw;
    private CancellationTokenSource? _cts;
    private Task? _processor;
    private Regex? _ignoreRegex;

    public ScreenshotWatcher(StateStore state, Func<KeeperConfig> readConfig)
    {
        _state = state;
        _readConfig = readConfig;
    }

    public void Start(KeeperConfig cfg)
    {
        StopInternal();

        string watchedDir = cfg.WatchFolder;
        if (string.IsNullOrWhiteSpace(watchedDir) || !Directory.Exists(watchedDir))
        {
            _state.AppendLog($"watch  ERROR  watchFolder not found: '{cfg.WatchFolder}'");
            return;
        }

        _ignoreRegex = null;
        if (!string.IsNullOrWhiteSpace(cfg.IgnorePattern))
        {
            try
            {
                _ignoreRegex = new Regex(cfg.IgnorePattern, RegexOptions.IgnoreCase | RegexOptions.Compiled);
            }
            catch (Exception ex)
            {
                _state.AppendLog($"watch  WARN   ignorePattern invalid, ignoring: {ex.Message}");
            }
        }

        _fsw = new FileSystemWatcher(watchedDir)
        {
            IncludeSubdirectories = false,
            EnableRaisingEvents = true,
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.Size | NotifyFilters.CreationTime,
        };
        _fsw.Created += (_, e) => Enqueue(e.FullPath);
        _fsw.Changed += (_, e) => Enqueue(e.FullPath);
        _fsw.Renamed += (_, e) => Enqueue(e.FullPath);

        _cts = new CancellationTokenSource();
        _processor = Task.Run(() => ProcessLoopAsync(_cts.Token));

        _state.AppendLog($"watch  start  folder={watchedDir}  debounce={cfg.DebounceMs}ms  battery-skip={cfg.SkipOnBattery}");
    }

    public void Stop()
    {
        StopInternal();
        _state.AppendLog("watch  stop");
    }

    private void StopInternal()
    {
        try { _cts?.Cancel(); } catch { /* ignore */ }
        try { if (_fsw is not null) { _fsw.EnableRaisingEvents = false; _fsw.Dispose(); _fsw = null; } } catch { /* ignore */ }
        try { _processor?.Wait(TimeSpan.FromSeconds(2)); } catch { /* ignore */ }
        _processor = null;
        _cts?.Dispose();
        _cts = null;
        _pending.Clear();
    }

    public void Dispose() => StopInternal();

    private void Enqueue(string fullPath)
    {
        var cfg = _readConfig();
        var basename = Path.GetFileName(fullPath);
        var ext = SlugGenerator.NormalizeExtension(Path.GetExtension(basename));

        if (cfg.FileExtensions.Count > 0 && !cfg.FileExtensions.Any(e =>
                string.Equals(SlugGenerator.NormalizeExtension(e), ext, StringComparison.Ordinal)))
        {
            return;
        }

        if (cfg.SkipAlreadyNamed && SlugGenerator.IsAlreadyDateNamed(basename)) return;
        if (_ignoreRegex is not null && _ignoreRegex.IsMatch(basename)) return;

        var now = DateTime.UtcNow;
        _pending.AddOrUpdate(
            fullPath,
            _ => new PendingFile(fullPath, now),
            (_, existing) => existing with { LastEventAt = now });

        // Record an "event" heartbeat so the status view can show liveness.
        TouchEvent();
    }

    private void TouchEvent()
    {
        var st = _state.LoadState();
        st.LastEventAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
        st.LastHeartbeatAt = st.LastEventAt;
        _state.SaveState(st);
    }

    private async Task ProcessLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(250, ct).ConfigureAwait(false);

                var cfg = _readConfig();
                var due = TakeDue(cfg.DebounceMs);
                foreach (var item in due)
                {
                    if (ct.IsCancellationRequested) break;
                    await TryProcessOneAsync(item.FullPath, cfg, ct).ConfigureAwait(false);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _state.AppendLog($"watch  ERROR  {ex.Message}");
                try { await Task.Delay(1000, ct).ConfigureAwait(false); } catch { /* ignore */ }
            }
        }
    }

    private List<PendingFile> TakeDue(int debounceMs)
    {
        var now = DateTime.UtcNow;
        var due = new List<PendingFile>();
        foreach (var kvp in _pending)
        {
            if ((now - kvp.Value.LastEventAt).TotalMilliseconds >= debounceMs)
            {
                if (_pending.TryRemove(kvp.Key, out var taken))
                {
                    due.Add(taken);
                }
            }
        }
        return due;
    }

    private async Task TryProcessOneAsync(string fullPath, KeeperConfig cfg, CancellationToken ct)
    {
        try
        {
            if (!File.Exists(fullPath)) return;

            // Re-apply size / ignore filters at process-time — a file that
            // started as a tiny temp can grow past the cap before we see it.
            var info = new FileInfo(fullPath);
            if (cfg.MaxFileSizeBytes.HasValue && info.Length > cfg.MaxFileSizeBytes.Value)
            {
                LogAndCount(cfg, "skip   ", $"{info.Name} (size {info.Length} > {cfg.MaxFileSizeBytes.Value})");
                return;
            }

            if (cfg.SkipOnBattery && !PowerStatus.IsOnAcPower())
            {
                LogAndCount(cfg, "skip   ", $"{info.Name} (on battery)");
                return;
            }

            // Ensure the writer is done — try opening the file exclusively
            // for read. Snipping Tool occasionally holds the handle for a
            // few hundred ms after the Created event.
            if (!await TryWaitForReadableAsync(fullPath, TimeSpan.FromSeconds(5), ct).ConfigureAwait(false))
            {
                LogAndCount(cfg, "skip   ", $"{info.Name} (file still locked after 5s)");
                return;
            }

            var outcome = await BridgeClient.ScreenshotTitleAsync(cfg.BridgePath, fullPath, cfg.EnsureModelReady, ct)
                .ConfigureAwait(false);

            string description = outcome.Ok ? outcome.Result!.Description : "";
            string confidence = outcome.Ok ? outcome.Result!.Confidence : "low";

            string slug = SlugGenerator.Slugify(description, cfg.MaxSlugTokens);
            string finalConfidence = confidence;
            if (slug.Length == 0 || string.Equals(confidence, "low", StringComparison.Ordinal))
            {
                long ticks = info.CreationTimeUtc.Ticks;
                slug = SlugGenerator.BuildFallbackSlug($"{fullPath}:{ticks}");
                finalConfidence = "fallback";
            }

            DateTime captureLocal = info.CreationTime > DateTime.MinValue ? info.CreationTime : info.LastWriteTime;
            string baseFilename = SlugGenerator.BuildTargetFilename(slug, info.Extension, cfg.NamingPattern, captureLocal);

            var existing = new HashSet<string>(
                Directory.EnumerateFiles(Path.GetDirectoryName(fullPath)!).Select(p => Path.GetFileName(p).ToLowerInvariant()),
                StringComparer.Ordinal);

            string finalBasename = SlugGenerator.ResolveCollision(baseFilename, n => existing.Contains(n.ToLowerInvariant()));
            string destPath = Path.Combine(Path.GetDirectoryName(fullPath)!, finalBasename);

            if (string.Equals(destPath, fullPath, StringComparison.OrdinalIgnoreCase))
            {
                LogAndCount(cfg, "skip   ", $"{info.Name} (already at target name)", isSkip: true);
                return;
            }

            if (File.Exists(destPath))
            {
                FailAndCount(cfg, $"rename {info.Name} -> {finalBasename} (target already exists)");
                return;
            }

            try
            {
                File.Move(fullPath, destPath);
            }
            catch (Exception ex)
            {
                FailAndCount(cfg, $"rename {info.Name} -> {finalBasename}  ERROR  {ex.Message}");
                return;
            }

            var st = _state.LoadState();
            st.Processed += 1;
            st.LastProcessedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            st.LastProcessedPath = destPath;
            st.LastHeartbeatAt = st.LastProcessedAt;
            st.LastError = null;
            _state.SaveState(st);

            _state.AppendLog($"rename  {info.Name}  ->  {finalBasename}  [{finalConfidence}]");
        }
        catch (OperationCanceledException) { }
        catch (Exception ex)
        {
            FailAndCount(cfg, $"process {Path.GetFileName(fullPath)} ERROR {ex.Message}");
        }
    }

    private async Task<bool> TryWaitForReadableAsync(string path, TimeSpan timeout, CancellationToken ct)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read | FileShare.Delete);
                return true;
            }
            catch (IOException)
            {
                try { await Task.Delay(150, ct).ConfigureAwait(false); } catch { return false; }
            }
            catch
            {
                return false;
            }
        }
        return false;
    }

    private void LogAndCount(KeeperConfig _, string verb, string message, bool isSkip = true)
    {
        var st = _state.LoadState();
        if (isSkip) st.Skipped += 1;
        st.LastHeartbeatAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
        _state.SaveState(st);
        _state.AppendLog($"{verb}{message}");
    }

    private void FailAndCount(KeeperConfig _, string message)
    {
        var st = _state.LoadState();
        st.Errors += 1;
        st.LastError = message;
        st.LastHeartbeatAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
        _state.SaveState(st);
        _state.AppendLog("ERROR  " + message);
    }

    private readonly record struct PendingFile(string FullPath, DateTime LastEventAt);
}
