# Image Modification Extension

A Windows port of the popular macOS Image Modification extension, optimized for stability and Explorer integration.

**Repository**: [dante32683/ImgMod](https://github.com/dante32683/ImgMod)

## Technologies
- **Framework**: React with Raycast API
- **Image Engine**: `jimp` (Pure JavaScript / WASM)
- **Integration**: PowerShell COM (Shell.Application)

## Key Commands
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`

## Implementation Notes
- **Engine Choice**: Switched from `sharp` to `jimp` to avoid native binary loading issues (`.node` files) in the Raycast for Windows environment.
- **WebP Support**: Implemented via `@jimp/wasm-webp`, providing pure JS/WASM encoding/decoding.
- **File Selection**: The PowerShell script retrieves paths from all open Explorer windows via COM objects.
- **Output Strategy**: Files are saved in the source directory with suffixes (e.g., `_converted`, `_resized`) to prevent overwriting originals.
- **Metadata**: Jimp strips most metadata by default; the "Strip Metadata" action explicitly ensures a clean output.
- **Background Removal**: Attempted integration of AI-based removal, but deferred due to native binary (ONNX) bundling restrictions on Windows.
