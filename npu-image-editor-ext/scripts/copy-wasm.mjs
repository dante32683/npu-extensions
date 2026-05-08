// Copies @jsquash/webp encoder wasm files into assets/webp/ so the runtime
// can load them via `path.join(environment.assetsPath, "webp", ...)` without
// going through Emscripten's URL-based wasm loader (which Raycast's bundler
// breaks). Wired into package.json as `prebuild` and `predev`.

import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const EXT_ROOT = dirname(SCRIPT_DIR)

const SRC_DIR = join(EXT_ROOT, "node_modules", "@jsquash", "webp", "codec", "enc")
const DEST_DIR = join(EXT_ROOT, "assets", "webp")
const FILES = ["webp_enc.wasm", "webp_enc_simd.wasm"]

if (!existsSync(SRC_DIR)) {
    console.warn(`[copy-wasm] source missing: ${SRC_DIR} (run \`npm install\` first)`)
    process.exit(0)
}

if (!existsSync(DEST_DIR)) {
    mkdirSync(DEST_DIR, { recursive: true })
}

let copied = 0
for (const file of FILES) {
    const src = join(SRC_DIR, file)
    if (!existsSync(src)) {
        console.warn(`[copy-wasm] missing: ${src}`)
        continue
    }
    copyFileSync(src, join(DEST_DIR, file))
    copied++
}

console.log(`[copy-wasm] copied ${copied}/${FILES.length} files to ${DEST_DIR}`)
