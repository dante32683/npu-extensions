using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace OrganizeKeeper;

/// <summary>
/// Verbatim port of <c>src/utils/slug.ts</c>. Both implementations MUST agree
/// on the slug for the same description so the keeper (C#) and the manual
/// Raycast command (TypeScript) produce identical filenames.
///
/// Parity is enforced by <c>SlugGeneratorTests</c> (xUnit) mirroring the
/// critical cases from <c>slug.test.ts</c>.
/// </summary>
internal static class SlugGenerator
{
    public const string FallbackSlugBase = "screenshot";
    private const int DefaultMaxTokens = 5;
    private const int DefaultMaxLength = 60;

    private static readonly HashSet<string> DefaultStopwords = new(StringComparer.Ordinal)
    {
        "a", "an", "the",
        "of", "is", "in", "on", "at",
        "and", "or", "to", "with",
        "this", "that", "it", "its",
        "for", "as", "by", "from", "into",
        "be", "are", "was", "were",
        "image", "picture", "photo", "photograph",
        "shows", "showing", "depicts", "displays",
        "screenshot",
    };

    private static readonly Regex NonAlnum = new("[^a-z0-9]+", RegexOptions.Compiled);
    private static readonly Regex WhitespaceRun = new("\\s+", RegexOptions.Compiled);
    private static readonly Regex HyphenRun = new("-+", RegexOptions.Compiled);
    private static readonly Regex TrailingHyphens = new("-+$", RegexOptions.Compiled);

    public static string Slugify(string description, int? maxTokens = null, int? maxLength = null)
    {
        int tokens = Clamp(maxTokens ?? DefaultMaxTokens, 1, 12);
        int length = Clamp(maxLength ?? DefaultMaxLength, 8, 200);

        string normalized = StripCombiningMarks(description.Normalize(NormalizationForm.FormKD))
            .ToLowerInvariant();
        normalized = NonAlnum.Replace(normalized, " ").Trim();
        if (normalized.Length == 0) return string.Empty;

        var rawTokens = WhitespaceRun.Split(normalized);
        var filtered = rawTokens.Where(t => t.Length > 0 && !DefaultStopwords.Contains(t)).ToArray();
        string[] source = filtered.Length > 0 ? filtered : rawTokens;
        var kept = source.Take(tokens).ToArray();
        if (kept.Length == 0) return string.Empty;

        string slug = string.Join("-", kept);
        slug = HyphenRun.Replace(slug, "-").Trim('-');
        if (slug.Length == 0) return string.Empty;

        if (slug.Length > length)
        {
            slug = TrailingHyphens.Replace(slug.Substring(0, length), string.Empty);
        }

        return slug;
    }

    public static string BuildFallbackSlug(string signature)
    {
        return $"{FallbackSlugBase}-{ShortHash(signature)}";
    }

    public static string BuildTargetFilename(string slug, string extension, string pattern, DateTime captureDateLocal)
    {
        string cleanSlug = slug.Trim('-');
        if (cleanSlug.Length == 0)
            throw new ArgumentException("buildTargetFilename requires a non-empty slug", nameof(slug));

        string ext = NormalizeExtension(extension);

        if (string.Equals(pattern, "slug-only", StringComparison.Ordinal))
            return cleanSlug + ext;

        string dateStr = captureDateLocal.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return $"{dateStr}_{cleanSlug}{ext}";
    }

    public static string ResolveCollision(string baseFilename, Func<string, bool> isTaken)
    {
        if (!isTaken(baseFilename)) return baseFilename;

        int dot = baseFilename.LastIndexOf('.');
        string stem = dot == -1 ? baseFilename : baseFilename.Substring(0, dot);
        string ext = dot == -1 ? string.Empty : baseFilename.Substring(dot);

        for (int i = 2; i < 10_000; i++)
        {
            string candidate = $"{stem}-{i}{ext}";
            if (!isTaken(candidate)) return candidate;
        }
        throw new InvalidOperationException(
            $"Could not resolve a unique filename for {baseFilename} after 10,000 attempts");
    }

    public static bool IsAlreadyDateNamed(string basename)
    {
        return basename.Length >= 11
            && char.IsDigit(basename[0]) && char.IsDigit(basename[1]) && char.IsDigit(basename[2]) && char.IsDigit(basename[3])
            && basename[4] == '-'
            && char.IsDigit(basename[5]) && char.IsDigit(basename[6])
            && basename[7] == '-'
            && char.IsDigit(basename[8]) && char.IsDigit(basename[9])
            && basename[10] == '_';
    }

    public static string NormalizeExtension(string ext)
    {
        string lower = ext.Trim().ToLowerInvariant();
        if (lower.Length == 0) return string.Empty;
        return lower.StartsWith('.') ? lower : "." + lower;
    }

    public static HashSet<string> ParseExtensionList(string raw)
    {
        var splitter = new Regex(@"[,;\s]+", RegexOptions.Compiled);
        var result = new HashSet<string>(StringComparer.Ordinal);
        foreach (var token in splitter.Split(raw))
        {
            var t = token.Trim();
            if (t.Length == 0) continue;
            result.Add(NormalizeExtension(t));
        }
        return result;
    }

    private static int Clamp(int value, int min, int max)
    {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    private static string StripCombiningMarks(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (char c in s)
        {
            if (c >= '\u0300' && c <= '\u036f') continue;
            sb.Append(c);
        }
        return sb.ToString();
    }

    /// <summary>
    /// 32-bit FNV-1a — must match <c>shortHash</c> in <c>slug.ts</c>.
    /// JavaScript <c>Math.imul</c> performs signed 32-bit multiplication;
    /// the C# port uses <c>unchecked</c> arithmetic on <c>uint</c> to get
    /// the same low-32-bit behavior.
    /// </summary>
    public static string ShortHash(string input)
    {
        unchecked
        {
            uint h = 0x811c9dc5;
            for (int i = 0; i < input.Length; i++)
            {
                h ^= input[i];
                h *= 0x01000193;
            }
            return h.ToString("x8", CultureInfo.InvariantCulture);
        }
    }
}
