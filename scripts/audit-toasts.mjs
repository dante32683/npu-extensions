#!/usr/bin/env node
// Audits Raycast toast strings across all *-ext extensions for the Suite UX
// conventions defined in FEATURE_PLAN.md (search for "Suite UX conventions").
//
// Usage (from repo root):
//   node scripts/audit-toasts.mjs            # report only, exit 0 if clean else 1
//   node scripts/audit-toasts.mjs --fix      # apply mechanical fixes in place, then re-audit
//   node scripts/audit-toasts.mjs --verbose  # also print clean toasts in the table
//
// Mechanical fixes (applied with --fix):
//   1. Replace U+2026 (…) with three ASCII dots (...) inside string literals
//      that belong to a toast title/message slot.
//   2. Replace curly quotes (“ ” ‘ ’) with ASCII (" ') inside the same slots.
//      When the resulting char would clash with the outer JS delimiter, the
//      replacement is escaped (\" or \') so the source stays valid.
//   3. Append "." to message string literals that lack terminal punctuation
//      (skips template literals — interpolations make the trailing char unknown).
//   4. Trim trailing whitespace inside title/message string literals.
//
// IMPORTANT: every fix is scoped to actual toast slots — either the body of a
// `showToast({...})` call or a `<var>.title|message|style = <expr>` assignment
// where `<var>` was bound from `await showToast(...)` earlier in the file.
// We never edit raw `title:` / `message:` keys in unrelated code (e.g. YAML
// frontmatter parsers, action panel labels).
//
// Reported but NOT auto-fixed (judgment required):
//   - Animated toast titles that don't end in "...".
//   - Success titles that contain "Failed" / "Error" (likely wrong style).
//   - Success titles ending in "." / "!" / "?".
//   - Failure toasts with no `message` field at all.
//   - Titles or messages containing emoji.
//
// Failure title shape is intentionally NOT enforced: `<Action> Failed` and
// `<Issue>` (e.g., "No Images Selected") are both permitted — see FEATURE_PLAN.md.
//
// This file is a developer tool. It is not bundled into any extension and is
// not required at install/run time. Per CONTRIBUTING.md "no shared runtime
// code between extensions", root-level scripts/ is allowed.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.dirname(__dirname)

const ARGS = new Set(process.argv.slice(2))
const FIX = ARGS.has("--fix")
const VERBOSE = ARGS.has("--verbose")
const REPORT_PATH = path.join(__dirname, "audit-toasts.report.json")

const EXT_DIR_SUFFIX = "-ext"
const SOURCE_EXTS = new Set([".ts", ".tsx"])
const ELLIPSIS_CHAR = "\u2026"
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u

const CURLY_DOUBLE = ["\u201C", "\u201D", "\u201E", "\u201F"]
const CURLY_SINGLE = ["\u2018", "\u2019", "\u201A", "\u201B"]
const CURLY_DOUBLE_RE = new RegExp(`[${CURLY_DOUBLE.join("")}]`, "g")
const CURLY_SINGLE_RE = new RegExp(`[${CURLY_SINGLE.join("")}]`, "g")
const ANY_CURLY_RE = new RegExp(`[${[...CURLY_DOUBLE, ...CURLY_SINGLE].join("")}]`)

// --- File discovery --------------------------------------------------------

function findExtensionDirs() {
    return fs
        .readdirSync(REPO_ROOT, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.endsWith(EXT_DIR_SUFFIX))
        .map(d => path.join(REPO_ROOT, d.name))
}

function walkSourceFiles(dir, out = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walkSourceFiles(full, out)
        else if (SOURCE_EXTS.has(path.extname(entry.name))) out.push(full)
    }
    return out
}

// --- Lexer-ish helpers (string/template/comment aware) ---------------------

function skipStringLiteral(src, startIdx, quote) {
    let i = startIdx + 1
    while (i < src.length) {
        if (src[i] === "\\") {
            i += 2
            continue
        }
        if (src[i] === quote) return i + 1
        if (src[i] === "\n") return i + 1
        i++
    }
    return src.length
}

function skipTemplateLiteral(src, startIdx) {
    let i = startIdx + 1
    while (i < src.length) {
        if (src[i] === "\\") {
            i += 2
            continue
        }
        if (src[i] === "`") return i + 1
        if (src[i] === "$" && src[i + 1] === "{") {
            const end = matchBalanced(src, i + 1, "{", "}")
            if (end === -1) return src.length
            i = end + 1
            continue
        }
        i++
    }
    return src.length
}

function matchBalanced(src, startIdx, openCh, closeCh) {
    let depth = 0
    let i = startIdx
    while (i < src.length) {
        const ch = src[i]
        if (ch === '"' || ch === "'") {
            i = skipStringLiteral(src, i, ch)
            continue
        }
        if (ch === "`") {
            i = skipTemplateLiteral(src, i)
            continue
        }
        if (ch === "/" && src[i + 1] === "/") {
            i = src.indexOf("\n", i)
            if (i === -1) return -1
            continue
        }
        if (ch === "/" && src[i + 1] === "*") {
            const end = src.indexOf("*/", i + 2)
            if (end === -1) return -1
            i = end + 2
            continue
        }
        if (ch === openCh) depth++
        else if (ch === closeCh) {
            depth--
            if (depth === 0) return i
        }
        i++
    }
    return -1
}

function lineOf(src, offset) {
    return src.slice(0, offset).split("\n").length
}

// --- Toast slot discovery --------------------------------------------------
//
// A "slot" is a span of source text that is known to be a toast field value:
// either a `style|title|message: <expr>` value inside `showToast({...})`, or
// the right-hand side of `<var>.style|title|message = <expr>` where `<var>`
// was bound from `showToast(...)` earlier in the file.
//
// All mechanical edits are confined to slots, so we never touch unrelated
// code that happens to use a `title:` key (YAML parser, ActionPanel item
// labels, etc.).

function readKeyValueRange(body, bodyStart, keyName) {
    // body: the inside of an object literal (no enclosing braces)
    // bodyStart: source-absolute offset of body[0]
    // Returns the [absoluteStart, absoluteEnd) of the value expression for `keyName`,
    // or null if not found / not at top level.
    let i = 0
    let depth = 0
    while (i < body.length) {
        const ch = body[i]
        if (ch === '"' || ch === "'") {
            i = skipStringLiteral(body, i, ch)
            continue
        }
        if (ch === "`") {
            i = skipTemplateLiteral(body, i)
            continue
        }
        if (ch === "(" || ch === "[" || ch === "{") {
            depth++
            i++
            continue
        }
        if (ch === ")" || ch === "]" || ch === "}") {
            depth--
            i++
            continue
        }
        if (depth === 0 && /[A-Za-z_$]/.test(ch)) {
            // Try to match `keyName \s* :`.
            let j = i
            while (j < body.length && /[\w$]/.test(body[j])) j++
            const ident = body.slice(i, j)
            if (ident === keyName) {
                let k = j
                while (k < body.length && /\s/.test(body[k])) k++
                if (body[k] === ":") {
                    let v = k + 1
                    while (v < body.length && /\s/.test(body[v])) v++
                    const valStart = v
                    let vd = 0
                    while (v < body.length) {
                        const c = body[v]
                        if (c === '"' || c === "'") {
                            v = skipStringLiteral(body, v, c)
                            continue
                        }
                        if (c === "`") {
                            v = skipTemplateLiteral(body, v)
                            continue
                        }
                        if (c === "(" || c === "[" || c === "{") vd++
                        else if (c === ")" || c === "]" || c === "}") vd--
                        else if (c === "," && vd === 0) break
                        else if (c === "\n" && vd === 0) {
                            // tolerate same-line value; for object-literal
                            // values the comma is what terminates.
                        }
                        v++
                    }
                    return { start: bodyStart + valStart, end: bodyStart + v }
                }
            }
            i = j
            continue
        }
        i++
    }
    return null
}

function findShowToastBodies(src) {
    // Returns [{ literalStart, literalEnd, bodyStart, bodyEnd }] — bodyStart/End
    // bracket the contents (no braces) of the showToast object literal.
    const out = []
    let i = 0
    while ((i = src.indexOf("showToast(", i)) !== -1) {
        const argsStart = i + "showToast(".length
        let j = argsStart
        while (j < src.length && /\s/.test(src[j])) j++
        if (src[j] !== "{") {
            i = argsStart
            continue
        }
        const literalStart = j
        const literalEnd = matchBalanced(src, literalStart, "{", "}")
        if (literalEnd === -1) {
            i = argsStart
            continue
        }
        out.push({
            literalStart,
            literalEnd,
            bodyStart: literalStart + 1,
            bodyEnd: literalEnd,
        })
        i = literalEnd + 1
    }
    return out
}

function findToastVarBindings(src) {
    const re = /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?showToast\s*\(/g
    const out = []
    let m
    while ((m = re.exec(src)) !== null) {
        out.push({ varName: m[1], offset: m.index })
    }
    return out
}

function findVarKeyAssignments(src, varNames) {
    // Returns [{ varName, key, valueStart, valueEnd, offset }].
    // Only matches var names we know were bound from showToast.
    if (varNames.size === 0) return []
    const out = []
    const re = /\b(\w+)\.(title|message|style)\s*=\s*/g
    let m
    while ((m = re.exec(src)) !== null) {
        if (!varNames.has(m[1])) continue
        const valueStart = re.lastIndex
        // Read RHS up to end of statement, honoring strings/templates/parens.
        let i = valueStart
        let depth = 0
        while (i < src.length) {
            const ch = src[i]
            if (ch === '"' || ch === "'") {
                i = skipStringLiteral(src, i, ch)
                continue
            }
            if (ch === "`") {
                i = skipTemplateLiteral(src, i)
                continue
            }
            if (ch === "(" || ch === "[" || ch === "{") depth++
            else if (ch === ")" || ch === "]" || ch === "}") depth--
            else if (depth === 0 && (ch === "\n" || ch === ";")) break
            i++
        }
        out.push({
            varName: m[1],
            key: m[2],
            valueStart,
            valueEnd: i,
            offset: m.index,
        })
    }
    return out
}

// --- Per-toast records (for auditing) --------------------------------------

function classifyStringValue(raw) {
    if (raw.length === 0) return { kind: "other", value: null }
    const first = raw[0]
    if (first === '"' || first === "'") {
        const last = raw[raw.length - 1]
        if (last !== first) return { kind: "other", value: null }
        return {
            kind: "string",
            value: unescapeJsString(raw.slice(1, -1)),
            quote: first,
            raw,
        }
    }
    if (first === "`") {
        const inner = raw.slice(1, -1)
        const hasInterpolation = /(?<!\\)\$\{/.test(inner)
        return {
            kind: "template",
            value: hasInterpolation ? null : inner,
            quote: "`",
            raw,
            hasInterpolation,
        }
    }
    return { kind: "other", value: null }
}

function unescapeJsString(s) {
    return s.replace(/\\(.)/g, (_, c) => {
        switch (c) {
            case "n":
                return "\n"
            case "t":
                return "\t"
            case "r":
                return "\r"
            case "\\":
                return "\\"
            case '"':
                return '"'
            case "'":
                return "'"
            default:
                return c
        }
    })
}

function extractStyleName(raw) {
    const m = raw.match(/Toast\.Style\.([A-Z][A-Za-z]+)/)
    if (!m) {
        if (/\?/.test(raw)) return { name: null, dynamic: true, raw }
        return { name: null, dynamic: false, raw }
    }
    return { name: m[1], dynamic: false, raw }
}

function buildRecords(filePath, src) {
    const calls = findShowToastBodies(src)
    const bindings = findToastVarBindings(src)
    const boundNames = new Set(bindings.map(b => b.varName))
    const assignments = findVarKeyAssignments(src, boundNames)

    const records = []

    for (const call of calls) {
        const body = src.slice(call.bodyStart, call.bodyEnd)
        const styleRange = readKeyValueRange(body, call.bodyStart, "style")
        const titleRange = readKeyValueRange(body, call.bodyStart, "title")
        const messageRange = readKeyValueRange(body, call.bodyStart, "message")

        const style = styleRange
            ? extractStyleName(src.slice(styleRange.start, styleRange.end).trim())
            : { name: null, dynamic: false, raw: null }
        const title = titleRange ? classifyStringValue(src.slice(titleRange.start, titleRange.end).trim()) : null
        const message = messageRange
            ? classifyStringValue(src.slice(messageRange.start, messageRange.end).trim())
            : null

        records.push({
            kind: "inline",
            file: path.relative(REPO_ROOT, filePath),
            line: lineOf(src, call.literalStart),
            offset: call.literalStart,
            style,
            title,
            message,
        })
    }

    for (const binding of bindings) {
        const sameVar = assignments.filter(a => a.varName === binding.varName && a.offset > binding.offset)
        if (sameVar.length === 0) continue

        const grouped = { style: null, title: null, message: null }
        for (const a of sameVar) {
            if (grouped[a.key] !== null) continue
            const raw = src.slice(a.valueStart, a.valueEnd).trim()
            grouped[a.key] = a.key === "style" ? extractStyleName(raw) : classifyStringValue(raw)
        }

        records.push({
            kind: "var-bound",
            file: path.relative(REPO_ROOT, filePath),
            line: lineOf(src, binding.offset),
            offset: binding.offset,
            varName: binding.varName,
            style: grouped.style ?? { name: null, dynamic: false, raw: null },
            title: grouped.title,
            message: grouped.message,
        })
    }

    return records
}

// --- Violation rules -------------------------------------------------------

function checkRecord(rec) {
    const violations = []
    const styleName = rec.style?.name ?? null
    const styleDynamic = rec.style?.dynamic ?? false

    const titleStatic = rec.title?.kind === "string" || (rec.title?.kind === "template" && !rec.title?.hasInterpolation)
    const messageStatic =
        rec.message?.kind === "string" || (rec.message?.kind === "template" && !rec.message?.hasInterpolation)
    const titleText = titleStatic ? rec.title.value : null
    const messageText = messageStatic ? rec.message.value : null

    if (rec.title && rec.title.kind === "string" && rec.title.value?.includes(ELLIPSIS_CHAR)) {
        violations.push("ellipsis-char-in-title")
    }
    if (rec.message && rec.message.kind === "string" && rec.message.value?.includes(ELLIPSIS_CHAR)) {
        violations.push("ellipsis-char-in-message")
    }
    if (titleText && ANY_CURLY_RE.test(titleText)) violations.push("curly-quote-in-title")
    if (messageText && ANY_CURLY_RE.test(messageText)) violations.push("curly-quote-in-message")
    if (titleText && EMOJI_RE.test(titleText)) violations.push("emoji-in-title")
    if (messageText && EMOJI_RE.test(messageText)) violations.push("emoji-in-message")

    if (!styleDynamic && styleName === "Animated") {
        if (titleText !== null && !titleText.endsWith("...")) {
            violations.push("animated-title-missing-ellipsis")
        }
    }
    if (!styleDynamic && styleName === "Success") {
        if (titleText !== null && /\b(Failed|Error)\b/i.test(titleText)) {
            violations.push("success-title-mentions-failure")
        }
        if (titleText !== null && /[.!?]$/.test(titleText)) {
            violations.push("success-title-trailing-punctuation")
        }
    }
    if (!styleDynamic && styleName === "Failure") {
        if (!rec.message) violations.push("failure-without-message")
    }

    if (rec.message && rec.message.kind === "string" && messageText !== null) {
        if (messageText.length > 0 && !/[.!?:]$/.test(messageText) && !messageText.endsWith("...")) {
            violations.push("message-no-terminal-punctuation")
        }
    }

    return violations
}

// --- Mechanical fixes (slot-scoped) ----------------------------------------

function escapeForOuterDelim(value, delim) {
    // Escape any unescaped occurrences of `delim` inside `value` so the
    // resulting source is still a valid JS string literal.
    let out = ""
    for (let i = 0; i < value.length; i++) {
        const ch = value[i]
        if (ch === "\\") {
            out += ch + (value[i + 1] ?? "")
            i++
            continue
        }
        if (ch === delim) {
            out += "\\" + delim
            continue
        }
        out += ch
    }
    return out
}

function fixStringLiteral(literalSource, opts) {
    // literalSource includes the surrounding quotes. Returns { text, changed }.
    if (literalSource.length < 2) return { text: literalSource, changed: false }
    const delim = literalSource[0]
    if (delim !== '"' && delim !== "'") return { text: literalSource, changed: false }
    if (literalSource[literalSource.length - 1] !== delim) return { text: literalSource, changed: false }
    const innerRaw = literalSource.slice(1, -1)

    // Decode escapes minimally just enough to test the trailing char.
    const decoded = unescapeJsString(innerRaw)
    let nextDecoded = decoded
    let changed = false

    if (opts.normalizeTypography) {
        if (nextDecoded.includes(ELLIPSIS_CHAR)) {
            nextDecoded = nextDecoded.replaceAll(ELLIPSIS_CHAR, "...")
        }
        if (CURLY_DOUBLE_RE.test(nextDecoded) || CURLY_SINGLE_RE.test(nextDecoded)) {
            nextDecoded = nextDecoded.replace(CURLY_DOUBLE_RE, '"').replace(CURLY_SINGLE_RE, "'")
        }
    }

    if (opts.trimTrailing) {
        const trimmed = nextDecoded.replace(/[ \t]+$/, "")
        if (trimmed !== nextDecoded) {
            nextDecoded = trimmed
        }
    }

    if (opts.appendPeriod) {
        if (
            nextDecoded.length > 0 &&
            !/[.!?:]$/.test(nextDecoded) &&
            !nextDecoded.endsWith("...")
        ) {
            nextDecoded = nextDecoded + "."
        }
    }

    if (nextDecoded === decoded) {
        return { text: literalSource, changed: false }
    }
    changed = true

    // Re-encode minimal escapes for the outer delimiter.
    const reEncoded = escapeForOuterDelim(nextDecoded, delim)
    return { text: delim + reEncoded + delim, changed }
}

function applyFixesScoped(src) {
    // Build the list of edit ranges: each is { start, end, slot } where slot
    // is "title" | "message" | "style". We only edit string-literal values
    // inside these ranges; template literals and other expressions are left
    // alone (they may contain interpolations or non-trivial logic).
    const calls = findShowToastBodies(src)
    const bindings = findToastVarBindings(src)
    const boundNames = new Set(bindings.map(b => b.varName))
    const assignments = findVarKeyAssignments(src, boundNames)

    const edits = []
    for (const call of calls) {
        const body = src.slice(call.bodyStart, call.bodyEnd)
        for (const slot of ["title", "message", "style"]) {
            const range = readKeyValueRange(body, call.bodyStart, slot)
            if (range) edits.push({ ...range, slot })
        }
    }
    for (const a of assignments) {
        edits.push({ start: a.valueStart, end: a.valueEnd, slot: a.key })
    }

    edits.sort((a, b) => a.start - b.start)

    let changed = false
    let cursor = 0
    let out = ""
    for (const edit of edits) {
        out += src.slice(cursor, edit.start)
        const valueText = src.slice(edit.start, edit.end)
        // Only touch a value if it's a string literal (single or double quotes).
        const trimmed = valueText.trim()
        if (
            (trimmed.startsWith('"') || trimmed.startsWith("'")) &&
            (trimmed.endsWith('"') || trimmed.endsWith("'")) &&
            trimmed[0] === trimmed[trimmed.length - 1]
        ) {
            // Preserve surrounding whitespace in valueText.
            const leadingWs = valueText.match(/^\s*/)?.[0] ?? ""
            const trailingWs = valueText.match(/\s*$/)?.[0] ?? ""
            const fix = fixStringLiteral(trimmed, {
                normalizeTypography: true,
                trimTrailing: edit.slot === "title" || edit.slot === "message",
                appendPeriod: edit.slot === "message",
            })
            if (fix.changed) {
                changed = true
                out += leadingWs + fix.text + trailingWs
            } else {
                out += valueText
            }
        } else {
            out += valueText
        }
        cursor = edit.end
    }
    out += src.slice(cursor)
    return { text: out, changed }
}

// --- Reporting -------------------------------------------------------------

function describeRecord(rec) {
    const styleName = rec.style?.dynamic ? "ternary" : (rec.style?.name ?? "?")
    return {
        styleName,
        title: describeValue(rec.title),
        message: describeValue(rec.message),
    }
}

function describeValue(v) {
    if (!v) return null
    if (v.kind === "string") return JSON.stringify(v.value)
    if (v.kind === "template") return v.hasInterpolation ? "<template w/ interpolation>" : JSON.stringify(v.value)
    return "<dynamic>"
}

function main() {
    const extDirs = findExtensionDirs()
    if (extDirs.length === 0) {
        console.error("No *-ext directories found in repo root:", REPO_ROOT)
        process.exit(2)
    }

    const reportRows = []
    let filesChanged = 0

    for (const extDir of extDirs) {
        const srcDir = path.join(extDir, "src")
        if (!fs.existsSync(srcDir)) continue
        const files = walkSourceFiles(srcDir)

        for (const file of files) {
            const original = fs.readFileSync(file, "utf8")
            let working = original

            if (FIX) {
                const { text, changed } = applyFixesScoped(working)
                if (changed) {
                    fs.writeFileSync(file, text, "utf8")
                    working = text
                    filesChanged++
                }
            }

            const records = buildRecords(file, working)
            for (const rec of records) {
                const violations = checkRecord(rec)
                reportRows.push({
                    file: rec.file,
                    line: rec.line,
                    kind: rec.kind,
                    ...describeRecord(rec),
                    violations,
                })
            }
        }
    }

    const totalToasts = reportRows.length
    const flagged = reportRows.filter(r => r.violations.length > 0)

    if (FIX) {
        console.log(`[audit-toasts] applied mechanical fixes to ${filesChanged} file(s)`)
    }

    console.log(`\n# Toast audit report`)
    console.log(`Scanned ${extDirs.length} extension(s), ${totalToasts} toast record(s) total.\n`)

    if (flagged.length === 0) {
        console.log("All toasts match Suite UX conventions.")
    } else {
        console.log(`${flagged.length} toast(s) need attention:\n`)
        const grouped = new Map()
        for (const row of flagged) {
            if (!grouped.has(row.file)) grouped.set(row.file, [])
            grouped.get(row.file).push(row)
        }
        for (const [file, rows] of grouped) {
            console.log(`## ${file}`)
            for (const row of rows) {
                console.log(
                    `  L${row.line} [${row.styleName}]  title=${row.title ?? "—"}  message=${row.message ?? "—"}`,
                )
                for (const v of row.violations) console.log(`    - ${v}`)
            }
            console.log("")
        }
    }

    if (VERBOSE) {
        console.log("\n## All toasts (verbose)")
        for (const row of reportRows) {
            console.log(
                `${row.file}:${row.line} [${row.styleName}] title=${row.title ?? "—"} message=${row.message ?? "—"}`,
            )
        }
    }

    fs.writeFileSync(
        REPORT_PATH,
        JSON.stringify(
            { generatedAt: new Date().toISOString(), totalToasts, flagged: flagged.length, rows: reportRows },
            null,
            2,
        ),
        "utf8",
    )
    console.log(`\nFull JSON report: ${path.relative(REPO_ROOT, REPORT_PATH)}`)

    process.exit(flagged.length === 0 ? 0 : 1)
}

main()
