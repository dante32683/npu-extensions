/* eslint-disable @typescript-eslint/no-explicit-any */
import { environment } from "@raycast/api"
import encode, { init as initWebpEncode } from "@jsquash/webp/encode"
import { simd } from "wasm-feature-detect"
import path from "path"
import fs from "fs"

const WASM_DIR = "webp"
const WASM_PLAIN = "webp_enc.wasm"
const WASM_SIMD = "webp_enc_simd.wasm"

let webpEncodeInit: Promise<void> | undefined

// Why this exists (do not inline back into commands):
// - Jimp 1.6.x's WebP path uses `new URL("*.wasm", import.meta.url)`, which Raycast's
//   bundler breaks. We load the wasm bytes ourselves, compile a `WebAssembly.Module`,
//   and pass `locateFile: filename => filename` so Emscripten glue stops trying to
//   resolve URLs at runtime.
// - The wasm files are NOT produced by `dotnet publish`. They are copied from
//   `node_modules/@jsquash/webp/codec/enc/` to `assets/webp/` by `scripts/copy-wasm.mjs`,
//   which runs as `prebuild` / `predev` in `package.json`.
async function ensureWebpEncodeInit(): Promise<void> {
    if (webpEncodeInit) return webpEncodeInit
    webpEncodeInit = (async () => {
        const useSimd = await simd().catch(() => false)
        const wasmFile = useSimd ? WASM_SIMD : WASM_PLAIN
        const wasmPath = path.join(environment.assetsPath, WASM_DIR, wasmFile)
        if (!fs.existsSync(wasmPath)) {
            throw new Error(
                `WebP encoder wasm missing: ${wasmPath}. Run "npm run prebuild" or rebuild the extension so assets/webp/*.wasm are included.`,
            )
        }

        const wasmBytes = await fs.promises.readFile(wasmPath)
        const wasmU8 = new Uint8Array(wasmBytes.buffer, wasmBytes.byteOffset, wasmBytes.byteLength)
        const wasmModule = await WebAssembly.compile(wasmU8 as any)

        await (initWebpEncode as any)(
            wasmModule as any,
            {
                locateFile: (filename: string) => filename,
            } as any,
        )
    })()
    return webpEncodeInit
}

export async function encodeRgbaToWebp(rgba: Uint8ClampedArray, width: number, height: number): Promise<Uint8Array> {
    await ensureWebpEncodeInit()
    const webpBytes = await encode({
        data: rgba,
        width,
        height,
        colorSpace: "srgb",
    } as any)
    return webpBytes instanceof ArrayBuffer ? new Uint8Array(webpBytes) : webpBytes
}
