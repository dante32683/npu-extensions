// Sparse identity: NpuDevToolboxBridge.Identity (see Package.appxmanifest).
// Do NOT copy this exe across extensions — activation context follows the
// manifest beside it, and identity names differ per bridge.
//
// Commands handled here:
//   cwd-of-pid <pid>           → { status, cwd } | { status, message }
//   phi-commit <tempInputFile> → { status, subject, body } | { status, message }
// One JSON line on stdout per invocation; diagnostics on stderr.

using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Windows.AI;
using Microsoft.Windows.AI.Text;

#pragma warning disable CS8305 // experimental APIs

namespace NpuDevToolboxBridge;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonReadOptions = new() { PropertyNameCaseInsensitive = true };

    private static async Task<int> Main(string[] args)
    {
        try
        {
            if (args.Length < 1)
            {
                WriteJson(new { status = "error", message = "Usage: NpuBridge.exe <cwd-of-pid|phi-commit> ..." });
                return 1;
            }

            string command = args[0];

            switch (command)
            {
                case "cwd-of-pid":
                    if (args.Length < 2)
                    {
                        WriteJson(new { status = "error", message = "Usage: NpuBridge.exe cwd-of-pid <pid>" });
                        return 1;
                    }
                    if (!int.TryParse(args[1], out int pid))
                    {
                        WriteJson(new { status = "error", message = $"Invalid PID: {args[1]}" });
                        return 1;
                    }
                    return CwdOfPid(pid);

                case "phi-commit":
                    if (args.Length < 2)
                    {
                        WriteJson(new { status = "error", message = "Usage: NpuBridge.exe phi-commit <tempInputFile>" });
                        return 1;
                    }
                    return await PhiCommit(args[1]);

                default:
                    WriteJson(new { status = "error", message = $"Unknown command: {command}" });
                    return 1;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuBridge] Unhandled exception: {ex}");
            WriteJson(new { status = "error", message = ex.Message });
            return 1;
        }
    }

    // ---------- cwd-of-pid (NtQueryInformationProcess + PEB read) ----------

    private static int CwdOfPid(int pid)
    {
        try
        {
            string cwd = ReadProcessCurrentDirectory(pid);
            WriteJson(new { status = "success", cwd });
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuBridge] cwd-of-pid failed for PID {pid}: {ex}");
            WriteJson(new { status = "error", message = $"Cannot read working directory of PID {pid}: {ex.Message}" });
            return 1;
        }
    }

    private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
    private const uint PROCESS_VM_READ = 0x0010;

    // PEB layout (x64):
    //   PEB->ProcessParameters at offset 0x20.
    // RTL_USER_PROCESS_PARAMETERS layout (x64):
    //   CurrentDirectory.DosPath (UNICODE_STRING) at offset 0x38.
    // UNICODE_STRING (x64): USHORT Length; USHORT MaximumLength; ULONG (padding); PWSTR Buffer.
    private const int OFFSET_PEB_PROCESS_PARAMETERS_X64 = 0x20;
    private const int OFFSET_PARAMS_CURRENT_DIRECTORY_X64 = 0x38;

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_BASIC_INFORMATION
    {
        public IntPtr ExitStatus;
        public IntPtr PebBaseAddress;
        public IntPtr AffinityMask;
        public IntPtr BasePriority;
        public UIntPtr UniqueProcessId;
        public IntPtr InheritedFromUniqueProcessId;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, IntPtr lpBuffer, int nSize, out IntPtr lpNumberOfBytesRead);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsWow64Process(IntPtr hProcess, out bool wow64Process);

    [DllImport("ntdll.dll")]
    private static extern int NtQueryInformationProcess(IntPtr hProcess, int processInformationClass, ref PROCESS_BASIC_INFORMATION processInformation, int processInformationLength, out int returnLength);

    private static string ReadProcessCurrentDirectory(int pid)
    {
        IntPtr handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, false, pid);
        if (handle == IntPtr.Zero)
        {
            int err = Marshal.GetLastWin32Error();
            throw new InvalidOperationException($"OpenProcess failed (Win32 error {err}). The process may be elevated or no longer running.");
        }

        try
        {
            // For v1, refuse 32-bit-on-64-bit targets. Reading their PEB requires NtWow64QueryInformationProcess64.
            if (IsWow64Process(handle, out bool isWow64) && isWow64 && Environment.Is64BitProcess)
            {
                throw new NotSupportedException("Reading the PEB of a 32-bit process from a 64-bit bridge is not supported in v1.");
            }

            var pbi = new PROCESS_BASIC_INFORMATION();
            int status = NtQueryInformationProcess(handle, 0 /* ProcessBasicInformation */, ref pbi, Marshal.SizeOf<PROCESS_BASIC_INFORMATION>(), out _);
            if (status != 0)
            {
                throw new InvalidOperationException($"NtQueryInformationProcess returned 0x{status:X}.");
            }

            // PEB->ProcessParameters
            IntPtr processParameters = ReadPointer(handle, IntPtr.Add(pbi.PebBaseAddress, OFFSET_PEB_PROCESS_PARAMETERS_X64));
            if (processParameters == IntPtr.Zero)
            {
                throw new InvalidOperationException("ProcessParameters pointer was null.");
            }

            // ProcessParameters.CurrentDirectory.DosPath (UNICODE_STRING)
            IntPtr unicodeStringAddr = IntPtr.Add(processParameters, OFFSET_PARAMS_CURRENT_DIRECTORY_X64);
            ushort length = ReadUInt16(handle, unicodeStringAddr);
            // Buffer pointer sits 8 bytes after Length on x64 (Length:2, MaxLen:2, padding:4, Buffer:8).
            IntPtr bufferPtr = ReadPointer(handle, IntPtr.Add(unicodeStringAddr, 8));
            if (bufferPtr == IntPtr.Zero || length == 0)
            {
                throw new InvalidOperationException("CurrentDirectory.DosPath is empty.");
            }

            byte[] buffer = new byte[length];
            ReadBytes(handle, bufferPtr, buffer);

            string raw = Encoding.Unicode.GetString(buffer);
            // Windows often stores CWDs with a trailing slash; trim it for ergonomics.
            return raw.TrimEnd('\\', '/');
        }
        finally
        {
            CloseHandle(handle);
        }
    }

    private static IntPtr ReadPointer(IntPtr hProcess, IntPtr addr)
    {
        byte[] buf = new byte[IntPtr.Size];
        ReadBytes(hProcess, addr, buf);
        return IntPtr.Size == 8 ? new IntPtr(BitConverter.ToInt64(buf, 0)) : new IntPtr(BitConverter.ToInt32(buf, 0));
    }

    private static ushort ReadUInt16(IntPtr hProcess, IntPtr addr)
    {
        byte[] buf = new byte[2];
        ReadBytes(hProcess, addr, buf);
        return BitConverter.ToUInt16(buf, 0);
    }

    private static void ReadBytes(IntPtr hProcess, IntPtr addr, byte[] buffer)
    {
        IntPtr unmanaged = Marshal.AllocHGlobal(buffer.Length);
        try
        {
            if (!ReadProcessMemory(hProcess, addr, unmanaged, buffer.Length, out IntPtr bytesRead) || bytesRead.ToInt64() != buffer.Length)
            {
                int err = Marshal.GetLastWin32Error();
                throw new InvalidOperationException($"ReadProcessMemory failed at 0x{addr.ToInt64():X} (Win32 error {err}).");
            }
            Marshal.Copy(unmanaged, buffer, 0, buffer.Length);
        }
        finally
        {
            Marshal.FreeHGlobal(unmanaged);
        }
    }

    // ---------- phi-commit (LanguageModel) ----------

    private static async Task<int> PhiCommit(string tempInputFile)
    {
        if (!File.Exists(tempInputFile))
        {
            WriteJson(new { status = "error", message = $"Input file not found: {tempInputFile}" });
            return 1;
        }

        try
        {
            string fileContent = await File.ReadAllTextAsync(tempInputFile);
            var payload = JsonSerializer.Deserialize<CommitPayload>(fileContent, JsonReadOptions)
                ?? throw new InvalidOperationException("Failed to parse commit payload.");

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

            using var model = await LanguageModel.CreateAsync();

            string systemPrompt = BuildSystemPrompt(payload.Style ?? "conventional");
            string userText = BuildUserText(payload);

            var response = await model.GenerateResponseAsync($"{systemPrompt}\n\n{userText}");

            string raw = response.Text.Trim();
            string jsonText = ExtractJsonObject(raw);

            CommitResponse parsed;
            try
            {
                parsed = JsonSerializer.Deserialize<CommitResponse>(jsonText, JsonReadOptions)
                    ?? throw new InvalidOperationException("Phi returned empty JSON.");
            }
            catch (JsonException jex)
            {
                throw new InvalidOperationException($"Failed to parse Phi-Silica output as JSON. Output was: {raw}", jex);
            }

            if (string.IsNullOrWhiteSpace(parsed.Subject))
            {
                throw new InvalidOperationException("Phi did not produce a commit subject.");
            }

            WriteJson(new { status = "success", subject = parsed.Subject.Trim(), body = (parsed.Body ?? string.Empty).Trim() });
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[NpuBridge] phi-commit failed: {ex}");
            WriteJson(new { status = "error", message = ex.Message });
            return 1;
        }
    }

    private static string BuildSystemPrompt(string style)
    {
        bool conventional = style.Equals("conventional", StringComparison.OrdinalIgnoreCase);

        var sb = new StringBuilder();
        sb.AppendLine("You are a senior engineer writing a Git commit message for the change below.");
        sb.AppendLine("Output ONLY valid JSON in this EXACT shape: { \"subject\": \"...\", \"body\": \"...\" }.");
        sb.AppendLine("Rules:");
        sb.AppendLine("- subject: <= 72 chars, imperative mood, no trailing period.");
        if (conventional)
        {
            sb.AppendLine("- subject MUST start with one of: feat | fix | docs | refactor | test | chore | perf | build | ci | style,");
            sb.AppendLine("  optionally followed by \"(scope)\", then \": \".");
        }
        sb.AppendLine("- body: 1-3 short paragraphs OR a bullet list explaining WHY (not what — the diff already shows what).");
        sb.AppendLine("  Use plain Markdown. Wrap at ~100 chars. Empty string is allowed.");
        sb.AppendLine("- DO NOT invent files, APIs, or behavior not visible in the diff.");
        sb.AppendLine("- DO NOT include code fences, prose around the JSON, or \"Here is the commit message:\".");
        return sb.ToString();
    }

    private static string BuildUserText(CommitPayload p)
    {
        var sb = new StringBuilder();
        sb.Append("Branch: ").AppendLine(p.Branch ?? "(unknown)");
        sb.Append("Recent commits (for tone reference): ");
        if (p.RecentCommits == null || p.RecentCommits.Count == 0)
        {
            sb.AppendLine("(none)");
        }
        else
        {
            sb.AppendLine();
            foreach (var c in p.RecentCommits)
            {
                sb.Append("  - ").AppendLine(c);
            }
        }
        sb.Append("Diff (staged=").Append(p.DiffStaged ? "true" : "false").AppendLine("):");
        sb.AppendLine(p.Diff ?? "(empty)");
        return sb.ToString();
    }

    // First '{' to last '}' fallback. Phi sometimes wraps JSON in fences or prose.
    private static string ExtractJsonObject(string text)
    {
        int start = text.IndexOf('{');
        int end = text.LastIndexOf('}');
        if (start == -1 || end == -1 || end <= start) return text;
        return text.Substring(start, end - start + 1);
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

    private static void WriteJson(object payload) =>
        Console.WriteLine(JsonSerializer.Serialize(payload));

    private sealed class CommitPayload
    {
        [JsonPropertyName("branch")] public string? Branch { get; set; }
        [JsonPropertyName("recentCommits")] public List<string>? RecentCommits { get; set; }
        [JsonPropertyName("diffStaged")] public bool DiffStaged { get; set; }
        [JsonPropertyName("diff")] public string? Diff { get; set; }
        [JsonPropertyName("style")] public string? Style { get; set; }
    }

    private sealed class CommitResponse
    {
        [JsonPropertyName("subject")] public string Subject { get; set; } = string.Empty;
        [JsonPropertyName("body")] public string? Body { get; set; }
    }
}
