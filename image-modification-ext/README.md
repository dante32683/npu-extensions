# Image Modification - Raycast Extension for Windows

A powerful Raycast extension for Windows that brings the core functionality of the macOS "Image Modification" extension to your PC. Perform bulk conversions, resizing, and transformations directly from File Explorer or your Clipboard.

## Features

### Bulk Processing & Transformations
- **Format Conversion**: Convert images between PNG, JPEG, WebP, BMP, and TIFF.
- **Clipboard Support**: Paste an image directly from your clipboard (`Cmd+V`) to process it and save the result to your Desktop.
- **Custom Rotation**: Rotate by any degree or radian.
- **Scaling**: Percentage-based scaling (e.g., 50% or 200%).
- **Resizing**: Resize images to specific dimensions while maintaining aspect ratio.
- **Padding**: Add colored borders (Hex/RGB) around your images.
- **Flipping**: Horizontal and vertical mirroring.

### Filters & Effects
- **Visual Filters**: Apply Blur, Gaussian Blur, Grayscale, Sepia, and Inversion.
- **Adjustments**: Modify Brightness and Contrast.
- **Artistic Effects**: Posterize and Pixelate your images.

### Optimization & Privacy
- **Optimization**: Compress JPEG files for web use.
- **Strip Metadata**: Remove EXIF and IPTC data from your photos before sharing.

### Explorer Integration
- **Selected Files**: Automatically detects images currently selected in File Explorer.
- **Surgical Output**: Saves processed images in the same directory (or Desktop for clipboard items) with descriptive suffixes (e.g., `_rotated`, `_resized`, `_padded`) to keep your originals safe.

## Installation

1. Navigate to the extension directory:
   ```bash
   cd image-modification-ext
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

## Usage

1. **File Explorer**: Select one or more image files in Explorer, then run "Modify Selected Images".
2. **Clipboard**: Copy an image to your clipboard, run "Modify Selected Images", and press `Cmd+V` (or "Paste from Clipboard").
3. **Actions**: Use the Action Panel (`Ctrl+K`) to choose your desired transformation or filter.
4. **Refresh**: Press `Cmd+R` to update the list if you change your selection in Explorer.

## Technical Details

- **Engine**: Powered by [Jimp](https://github.com/jimp-dev/jimp), a pure JavaScript image processing library. This ensures 100% compatibility on Windows without native binary loading issues.
- **WebP Support**: Implemented using WASM-based encoders for high-quality, stable performance.
- **Integration**: Uses specialized PowerShell COM scripts to detect selected files and grab clipboard image data natively.

## License

MIT
