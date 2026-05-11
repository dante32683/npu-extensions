namespace OrganizeKeeper;

/// <summary>
/// Self-contained parity check for <see cref="SlugGenerator"/>. Each
/// assertion mirrors a case in <c>src/utils/slug.test.ts</c>; if the keeper
/// (C#) and the manual Raycast command (TS) ever produce a different
/// filename for the same description, one of these assertions must fail and
/// the duplicate implementation must be re-aligned before shipping.
///
/// Invoked via <c>OrganizeKeeper.exe parity-check</c>. Exits 0 on success,
/// 1 on any failure (with a non-zero count printed to stderr).
///
/// We intentionally avoid xUnit/NUnit here so the test surface has no
/// NuGet dependencies — the bridge / keeper publish output is enough to
/// run it.
/// </summary>
internal static class ParityCheck
{
    public static int Run()
    {
        var failures = new List<string>();

        Check("slugify caption", failures,
            () => SlugGenerator.Slugify("A screenshot of a Windows Settings dialog showing display options") == "windows-settings-dialog-display-options");

        Check("slugify strips diacritics", failures,
            () => SlugGenerator.Slugify("Café — Menu (2025)") == "cafe-menu-2025");

        Check("slugify respects maxTokens=3", failures,
            () => SlugGenerator.Slugify("one two three four five six seven", maxTokens: 3).Split('-').Length == 3);

        Check("slugify length cap + no trailing hyphen", failures, () =>
        {
            var s = SlugGenerator.Slugify("alpha bravo charlie delta echo foxtrot golf hotel india", maxLength: 12);
            return s.Length <= 12 && !s.EndsWith("-", StringComparison.Ordinal);
        });

        Check("slugify empty input -> empty", failures,
            () => SlugGenerator.Slugify("") == "" && SlugGenerator.Slugify("    ") == "" && SlugGenerator.Slugify("!!! ??? ###") == "");

        Check("slugify falls back to stopwords when filter empties", failures,
            () => SlugGenerator.Slugify("a the of", maxTokens: 2) == "a-the");

        Check("slugify keeps numeric tokens", failures,
            () => SlugGenerator.Slugify("Error 404 page not found") == "error-404-page-not-found");

        Check("fallback slug is deterministic + starts with base + 8-hex tail", failures, () =>
        {
            var a = SlugGenerator.BuildFallbackSlug("C:/foo/bar.png:1700000000000");
            var b = SlugGenerator.BuildFallbackSlug("C:/foo/bar.png:1700000000000");
            return a == b
                && a.StartsWith(SlugGenerator.FallbackSlugBase + "-", StringComparison.Ordinal)
                && a.Length == SlugGenerator.FallbackSlugBase.Length + 1 + 8;
        });

        Check("fallback slug differs for different signatures", failures,
            () => SlugGenerator.BuildFallbackSlug("a") != SlugGenerator.BuildFallbackSlug("b"));

        Check("buildTargetFilename date-slug matches notes underscore convention", failures, () =>
            SlugGenerator.BuildTargetFilename("settings-dialog", ".png", "date-slug", new DateTime(2026, 5, 10))
                == "2026-05-10_settings-dialog.png");

        Check("buildTargetFilename slug-only drops date prefix", failures, () =>
            SlugGenerator.BuildTargetFilename("settings-dialog", "png", "slug-only", DateTime.Now) == "settings-dialog.png");

        Check("buildTargetFilename normalizes extension", failures, () =>
            SlugGenerator.BuildTargetFilename("x", "PNG", "slug-only", DateTime.Now) == "x.png");

        Check("buildTargetFilename rejects empty slug", failures, () =>
        {
            try { SlugGenerator.BuildTargetFilename("", ".png", "slug-only", DateTime.Now); return false; }
            catch (ArgumentException) { return true; }
        });

        Check("resolveCollision passthrough", failures,
            () => SlugGenerator.ResolveCollision("2026-05-10_foo.png", _ => false) == "2026-05-10_foo.png");

        Check("resolveCollision increments until free", failures, () =>
        {
            var taken = new HashSet<string>(StringComparer.Ordinal)
            {
                "2026-05-10_foo.png", "2026-05-10_foo-2.png", "2026-05-10_foo-3.png",
            };
            return SlugGenerator.ResolveCollision("2026-05-10_foo.png", n => taken.Contains(n)) == "2026-05-10_foo-4.png";
        });

        Check("resolveCollision handles extensionless filename", failures, () =>
        {
            var taken = new HashSet<string>(StringComparer.Ordinal) { "foo" };
            return SlugGenerator.ResolveCollision("foo", n => taken.Contains(n)) == "foo-2";
        });

        CheckDateNamed("2026-05-10_foo.png", true, failures);
        CheckDateNamed("2026-05-10_already-renamed.jpg", true, failures);
        CheckDateNamed("Screenshot 2026-05-10 123456.png", false, failures);
        CheckDateNamed("random.png", false, failures);
        CheckDateNamed("202-05-10_foo.png", false, failures);

        CheckExt(".PNG", ".png", failures);
        CheckExt("jpg", ".jpg", failures);
        CheckExt("  .Webp  ", ".webp", failures);
        CheckExt("", "", failures);

        Check("parseExtensionList accepts comma/semicolon/space", failures, () =>
        {
            var s = SlugGenerator.ParseExtensionList(".png, JPG ; .webp");
            return s.Contains(".png") && s.Contains(".jpg") && s.Contains(".webp") && s.Count == 3;
        });

        Check("shortHash is 8 lowercase hex chars", failures, () =>
        {
            var h = SlugGenerator.ShortHash("anything");
            return h.Length == 8 && System.Text.RegularExpressions.Regex.IsMatch(h, "^[0-9a-f]{8}$");
        });

        // Canonical FNV-1a 32-bit reference values — these MUST also match the
        // JS `shortHash` in src/utils/slug.ts (proven by the matching Vitest
        // cases). If either side changes the algorithm, this check fails.
        Check("shortHash('') == 811c9dc5", failures, () => SlugGenerator.ShortHash("") == "811c9dc5");
        Check("shortHash('a') == e40c292c", failures, () => SlugGenerator.ShortHash("a") == "e40c292c");
        Check("shortHash('foobar') == bf9cf968", failures, () => SlugGenerator.ShortHash("foobar") == "bf9cf968");

        if (failures.Count > 0)
        {
            Console.Error.WriteLine($"PARITY FAILED: {failures.Count} assertion(s) failed:");
            foreach (var f in failures) Console.Error.WriteLine($"  - {f}");
            return 1;
        }

        Console.WriteLine("Parity OK: all slug + collision + hash assertions passed.");
        return 0;
    }

    private static void Check(string name, List<string> failures, Func<bool> assertion)
    {
        try
        {
            if (!assertion()) failures.Add(name);
        }
        catch (Exception ex)
        {
            failures.Add($"{name} (threw {ex.GetType().Name}: {ex.Message})");
        }
    }

    private static void CheckDateNamed(string input, bool expected, List<string> failures)
    {
        var actual = SlugGenerator.IsAlreadyDateNamed(input);
        if (actual != expected)
            failures.Add($"isAlreadyDateNamed('{input}') expected {expected} got {actual}");
    }

    private static void CheckExt(string input, string expected, List<string> failures)
    {
        var actual = SlugGenerator.NormalizeExtension(input);
        if (actual != expected)
            failures.Add($"normalizeExtension('{input}') expected '{expected}' got '{actual}'");
    }
}
