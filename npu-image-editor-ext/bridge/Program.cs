// Sparse identity: NpuBridge.Identity (see Package.appxmanifest).
// Do NOT copy this exe across extensions — activation context follows the
// manifest beside it, and identity names differ per bridge.
//
// Commands handled here: remove-background, super-resolution, ocr, make-sticker.
// One JSON line on stdout per invocation; diagnostics on stderr.

using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.Windows.AI;
using Microsoft.Windows.AI.Imaging;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;
using Windows.Storage.Streams;
using WinRT;

namespace NpuBridge
{
    class Program
    {
        const byte STICKER_MASK_ALPHA_THRESHOLD = 16;
        const double STICKER_FALLBACK_BOX_RATIO = 0.80;
        const double STICKER_PADDING_RATIO = 0.10;
        const int STICKER_MAX_LONG_EDGE_FOR_NPU = 2048;

        static async Task Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine(JsonSerializer.Serialize(new { status = "error", message = "Usage: NpuBridge.exe <command> <inputPath> [options]" }));
                return;
            }

            string command = args[0];
            string inputPath = args[1];

            try
            {
                switch (command)
                {
                    case "remove-background":
                        await RemoveBackground(inputPath);
                        break;
                    case "super-resolution":
                        if (args.Length < 3)
                        {
                            Console.WriteLine(JsonSerializer.Serialize(new { status = "error", message = "Usage: NpuBridge.exe super-resolution <inputPath> <scaleFactor>" }));
                            return;
                        }
                        await SuperResolution(inputPath, args[2]);
                        break;
                    case "ocr":
                        await ExtractText(inputPath);
                        break;
                    case "make-sticker":
                        await MakeSticker(inputPath);
                        break;
                    default:
                        Console.WriteLine(JsonSerializer.Serialize(new { status = "error", message = $"Unknown command: {command}" }));
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[NpuBridge] {ex}");
                Console.WriteLine(JsonSerializer.Serialize(new { status = "error", message = ex.Message }));
            }
        }

        static async Task RemoveBackground(string inputPath)
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException("Input image not found.", inputPath);

            string fullInputPath = Path.GetFullPath(inputPath);
            SoftwareBitmap result = await ExtractForegroundAsync(fullInputPath, maxLongEdgeForNpu: null);

            string dir = Path.GetDirectoryName(fullInputPath)!;
            string baseName = Path.GetFileNameWithoutExtension(fullInputPath);
            string outputFileName = $"{baseName}_no_bg.png";
            string outputPath = Path.Combine(dir, outputFileName);

            var folder = await StorageFolder.GetFolderFromPathAsync(dir);
            var outputFile = await folder.CreateFileAsync(outputFileName, CreationCollisionOption.ReplaceExisting);

            using (var outStream = await outputFile.OpenAsync(FileAccessMode.ReadWrite))
            {
                var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, outStream);
                encoder.SetSoftwareBitmap(result);
                await encoder.FlushAsync();
            }

            result.Dispose();

            Console.WriteLine(JsonSerializer.Serialize(new
            {
                status = "success",
                outputPath,
                message = "Background removed successfully."
            }));
        }

        static async Task MakeSticker(string inputPath)
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException("Input image not found.", inputPath);

            string fullInputPath = Path.GetFullPath(inputPath);

            // Foreground extraction uses the same pipeline as RemoveBackground, but we cap the input size
            // for NPU reliability (the user-visible output is 480x480 anyway).
            var extraction = await ExtractForegroundWithMaskAsync(fullInputPath, STICKER_MAX_LONG_EDGE_FOR_NPU);

            var fg = extraction.Foreground;
            var maskGray = extraction.MaskGray8;

            var box = FindBoundingBox(maskGray, STICKER_MASK_ALPHA_THRESHOLD);
            double boxRatio = 0;
            bool subjectDetected = true;

            int cropX;
            int cropY;
            int cropW;
            int cropH;

            if (!box.HasValue)
            {
                subjectDetected = false;
                (cropX, cropY, cropW, cropH) = CenterSquareCrop(fg.PixelWidth, fg.PixelHeight);
            }
            else
            {
                var b = box.Value;
                boxRatio = (double)(b.Width * b.Height) / (fg.PixelWidth * fg.PixelHeight);

                if (boxRatio > STICKER_FALLBACK_BOX_RATIO)
                {
                    subjectDetected = false;
                    (cropX, cropY, cropW, cropH) = CenterSquareCrop(fg.PixelWidth, fg.PixelHeight);
                }
                else
                {
                    int padX = (int)Math.Round(b.Width * STICKER_PADDING_RATIO);
                    int padY = (int)Math.Round(b.Height * STICKER_PADDING_RATIO);

                    cropX = Math.Max(0, b.X - padX);
                    cropY = Math.Max(0, b.Y - padY);
                    int right = Math.Min(fg.PixelWidth, b.X + b.Width + padX);
                    int bottom = Math.Min(fg.PixelHeight, b.Y + b.Height + padY);
                    cropW = Math.Max(1, right - cropX);
                    cropH = Math.Max(1, bottom - cropY);
                }
            }

            SoftwareBitmap cropped = CropBgra8(fg, cropX, cropY, cropW, cropH);
            fg.Dispose();
            maskGray.Dispose();

            string dir = Path.GetDirectoryName(fullInputPath)!;
            string baseName = Path.GetFileNameWithoutExtension(fullInputPath);
            string rawFileName = $"{baseName}_sticker_raw.png";
            string outputPath = Path.Combine(dir, rawFileName);

            var folder = await StorageFolder.GetFolderFromPathAsync(dir);
            var outputFile = await folder.CreateFileAsync(rawFileName, CreationCollisionOption.ReplaceExisting);

            using (var outStream = await outputFile.OpenAsync(FileAccessMode.ReadWrite))
            {
                var encoder = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, outStream);
                encoder.SetSoftwareBitmap(cropped);
                await encoder.FlushAsync();
            }

            cropped.Dispose();

            Console.WriteLine(JsonSerializer.Serialize(new
            {
                status = "success",
                outputPath,
                subjectDetected,
                subjectBoxRatio = boxRatio,
                message = "Sticker intermediate PNG written successfully."
            }));
        }

        // Converts source + grayscale mask → BGRA8 bitmap with mask as alpha channel.
        // Uses CsWinRT-compatible IMemoryBufferByteAccess access via NativeObject.As(Guid).
        static unsafe SoftwareBitmap ApplyMaskAsAlpha(SoftwareBitmap source, SoftwareBitmap mask)
        {
            int width = source.PixelWidth;
            int height = source.PixelHeight;

            var srcBgra = SoftwareBitmap.Convert(source, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Straight);
            var maskGray = SoftwareBitmap.Convert(mask, BitmapPixelFormat.Gray8, BitmapAlphaMode.Ignore);

            using var srcBuf = srcBgra.LockBuffer(BitmapBufferAccessMode.ReadWrite);
            using var maskBuf = maskGray.LockBuffer(BitmapBufferAccessMode.Read);

            var srcDesc = srcBuf.GetPlaneDescription(0);
            var maskDesc = maskBuf.GetPlaneDescription(0);

            using var srcRef = srcBuf.CreateReference();
            using var maskRef = maskBuf.CreateReference();

            // IMemoryBufferByteAccess — a non-WinRT COM interface that BitmapBuffer references support.
            // Direct C# casts fail in CsWinRT; use NativeObject.As(Guid) to QueryInterface instead.
            var iid = new Guid("5B0D3235-4DBA-4D44-865E-8F1D0E4FD04D");
            using var srcAcc = ((IWinRTObject)srcRef).NativeObject.As(iid);
            using var maskAcc = ((IWinRTObject)maskRef).NativeObject.As(iid);

            // vtable layout: [0]=QueryInterface, [1]=AddRef, [2]=Release, [3]=GetBuffer
            byte* srcData = InvokeGetBuffer(srcAcc.ThisPtr);
            byte* maskData = InvokeGetBuffer(maskAcc.ThisPtr);

            for (int y = 0; y < height; y++)
            {
                int sr = y * srcDesc.Stride;
                int mr = y * maskDesc.Stride;
                for (int x = 0; x < width; x++)
                    srcData[sr + x * 4 + 3] = maskData[mr + x]; // alpha ← mask
            }

            maskGray.Dispose();
            return srcBgra; // buffer locks released by using-blocks above; pixel data persists
        }

        static unsafe byte* InvokeGetBuffer(IntPtr comPtr)
        {
            void** vtable = *(void***)comPtr;
            byte* data;
            uint capacity;
            ((delegate* unmanaged[Stdcall]<IntPtr, byte**, uint*, void>)vtable[3])(comPtr, &data, &capacity);
            return data;
        }

        static async Task EnsureSegmentationModelReadyAsync()
        {
            if (ImageObjectExtractor.GetReadyState() == AIFeatureReadyState.Ready) return;

            Console.Error.WriteLine("[NpuBridge] Model not ready — calling EnsureReadyAsync (may take a moment on first run)...");
            var readyResult = await ImageObjectExtractor.EnsureReadyAsync();
            if (readyResult.Status != AIFeatureReadyResultState.Success)
                throw new Exception($"NPU segmentation model unavailable: {readyResult.Status}");
        }

        static async Task<SoftwareBitmap> LoadSoftwareBitmapAsync(string fullPath, int? maxLongEdge)
        {
            StorageFile inputFile = await StorageFile.GetFileFromPathAsync(fullPath);
            using var stream = await inputFile.OpenAsync(FileAccessMode.Read);
            var decoder = await BitmapDecoder.CreateAsync(stream);

            if (maxLongEdge.HasValue)
            {
                uint w = decoder.PixelWidth;
                uint h = decoder.PixelHeight;
                uint longEdge = Math.Max(w, h);

                if (longEdge > maxLongEdge.Value)
                {
                    double scale = (double)maxLongEdge.Value / longEdge;
                    uint scaledW = (uint)Math.Max(1, (int)Math.Round(w * scale));
                    uint scaledH = (uint)Math.Max(1, (int)Math.Round(h * scale));

                    var transform = new BitmapTransform
                    {
                        ScaledWidth = scaledW,
                        ScaledHeight = scaledH,
                        InterpolationMode = BitmapInterpolationMode.Fant
                    };

                    return await decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied, transform, ExifOrientationMode.RespectExifOrientation, ColorManagementMode.DoNotColorManage);
                }
            }

            var bmp = await decoder.GetSoftwareBitmapAsync();
            if (bmp.BitmapPixelFormat != BitmapPixelFormat.Bgra8)
            {
                var converted = SoftwareBitmap.Convert(bmp, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied);
                bmp.Dispose();
                bmp = converted;
            }
            return bmp;
        }

        static ImageObjectExtractorHint CreateCenteredHint(SoftwareBitmap bitmap)
        {
            return new ImageObjectExtractorHint(
                null,
                new List<Windows.Graphics.PointInt32> { new(bitmap.PixelWidth / 2, bitmap.PixelHeight / 2) },
                null);
        }

        static async Task<SoftwareBitmap> ExtractForegroundAsync(string fullInputPath, int? maxLongEdgeForNpu)
        {
            var result = await ExtractForegroundWithMaskAsync(fullInputPath, maxLongEdgeForNpu);
            result.MaskGray8.Dispose();
            return result.Foreground;
        }

        static async Task<(SoftwareBitmap Foreground, SoftwareBitmap MaskGray8)> ExtractForegroundWithMaskAsync(string fullInputPath, int? maxLongEdgeForNpu)
        {
            await EnsureSegmentationModelReadyAsync();

            SoftwareBitmap source = await LoadSoftwareBitmapAsync(fullInputPath, maxLongEdgeForNpu);

            using var extractor = await ImageObjectExtractor.CreateWithSoftwareBitmapAsync(source);
            var hint = CreateCenteredHint(source);
            SoftwareBitmap mask = extractor.GetSoftwareBitmapObjectMask(hint);

            // Composite: apply mask as alpha channel → transparent BGRA8.
            SoftwareBitmap foreground = ApplyMaskAsAlpha(source, mask);
            source.Dispose();

            // Keep the Gray8 mask for bbox scan. (ApplyMaskAsAlpha converts it to Gray8 internally.)
            var maskGray = SoftwareBitmap.Convert(mask, BitmapPixelFormat.Gray8, BitmapAlphaMode.Ignore);
            mask.Dispose();

            return (foreground, maskGray);
        }

        struct BoundingBox
        {
            public int X;
            public int Y;
            public int Width;
            public int Height;
        }

        static unsafe BoundingBox? FindBoundingBox(SoftwareBitmap maskGray8, byte alphaThreshold)
        {
            int width = maskGray8.PixelWidth;
            int height = maskGray8.PixelHeight;

            using var buf = maskGray8.LockBuffer(BitmapBufferAccessMode.Read);
            var desc = buf.GetPlaneDescription(0);
            using var bufRef = buf.CreateReference();

            var iid = new Guid("5B0D3235-4DBA-4D44-865E-8F1D0E4FD04D");
            using var acc = ((IWinRTObject)bufRef).NativeObject.As(iid);
            byte* data = InvokeGetBuffer(acc.ThisPtr);

            int minX = width;
            int minY = height;
            int maxX = -1;
            int maxY = -1;

            for (int y = 0; y < height; y++)
            {
                int row = y * desc.Stride;
                for (int x = 0; x < width; x++)
                {
                    if (data[row + x] >= alphaThreshold)
                    {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX < minX || maxY < minY) return null;
            return new BoundingBox
            {
                X = minX,
                Y = minY,
                Width = maxX - minX + 1,
                Height = maxY - minY + 1
            };
        }

        static (int X, int Y, int W, int H) CenterSquareCrop(int width, int height)
        {
            int side = Math.Min(width, height);
            int x = (width - side) / 2;
            int y = (height - side) / 2;
            return (x, y, side, side);
        }

        static unsafe SoftwareBitmap CropBgra8(SoftwareBitmap sourceBgra8, int x, int y, int w, int h)
        {
            var src = SoftwareBitmap.Convert(sourceBgra8, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Straight);
            var dest = new SoftwareBitmap(BitmapPixelFormat.Bgra8, w, h, BitmapAlphaMode.Straight);

            using var srcBuf = src.LockBuffer(BitmapBufferAccessMode.Read);
            using var dstBuf = dest.LockBuffer(BitmapBufferAccessMode.Write);
            var srcDesc = srcBuf.GetPlaneDescription(0);
            var dstDesc = dstBuf.GetPlaneDescription(0);

            using var srcRef = srcBuf.CreateReference();
            using var dstRef = dstBuf.CreateReference();

            var iid = new Guid("5B0D3235-4DBA-4D44-865E-8F1D0E4FD04D");
            using var srcAcc = ((IWinRTObject)srcRef).NativeObject.As(iid);
            using var dstAcc = ((IWinRTObject)dstRef).NativeObject.As(iid);

            byte* srcData = InvokeGetBuffer(srcAcc.ThisPtr);
            byte* dstData = InvokeGetBuffer(dstAcc.ThisPtr);

            for (int row = 0; row < h; row++)
            {
                int srcRow = (y + row) * srcDesc.Stride + x * 4;
                int dstRow = row * dstDesc.Stride;
                System.Buffer.MemoryCopy(srcData + srcRow, dstData + dstRow, dstDesc.Stride, w * 4);
            }

            src.Dispose();
            return dest;
        }

        static async Task SuperResolution(string inputPath, string scaleFactorStr)
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException("Input image not found.", inputPath);

            if (!int.TryParse(scaleFactorStr, out int scaleFactor) || (scaleFactor != 2 && scaleFactor != 4))
            {
                throw new ArgumentException("Scale factor must be 2 or 4.");
            }

            if (ImageScaler.GetReadyState() != AIFeatureReadyState.Ready)
            {
                Console.Error.WriteLine("[NpuBridge] Model not ready — calling EnsureReadyAsync (may take a moment on first run)...");
                var readyResult = await ImageScaler.EnsureReadyAsync();
                if (readyResult.Status != AIFeatureReadyResultState.Success) 
                    throw new Exception($"NPU ImageScaler model unavailable: {readyResult.Status}");
            }

            string fullInputPath = Path.GetFullPath(inputPath);
            StorageFile inputFile = await StorageFile.GetFileFromPathAsync(fullInputPath);

            SoftwareBitmap source;
            using (var stream = await inputFile.OpenAsync(FileAccessMode.Read))
            {
                var decoder = await BitmapDecoder.CreateAsync(stream);       
                source = await decoder.GetSoftwareBitmapAsync();
            }

            using var scaler = await ImageScaler.CreateAsync();
            
            // Assume method is ScaleSoftwareBitmap or Scale
            SoftwareBitmap result = scaler.ScaleSoftwareBitmap(source, source.PixelWidth * scaleFactor, source.PixelHeight * scaleFactor);

            string dir = Path.GetDirectoryName(fullInputPath)!;
            string baseName = Path.GetFileNameWithoutExtension(fullInputPath);
            string extension = Path.GetExtension(fullInputPath);
            string outputFileName = $"{baseName}_{scaleFactor}x{extension}";
            string outputPath = Path.Combine(dir, outputFileName);

            var folder = await StorageFolder.GetFolderFromPathAsync(dir);    
            var outputFile = await folder.CreateFileAsync(outputFileName, CreationCollisionOption.ReplaceExisting);

            using (var outStream = await outputFile.OpenAsync(FileAccessMode.ReadWrite))
            {
                Guid encoderId = BitmapEncoder.PngEncoderId;
                if (extension.Equals(".jpg", StringComparison.OrdinalIgnoreCase) || extension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase))
                    encoderId = BitmapEncoder.JpegEncoderId;
                else if (extension.Equals(".bmp", StringComparison.OrdinalIgnoreCase))
                    encoderId = BitmapEncoder.BmpEncoderId;
                else if (extension.Equals(".tiff", StringComparison.OrdinalIgnoreCase))
                    encoderId = BitmapEncoder.TiffEncoderId;

                var encoder = await BitmapEncoder.CreateAsync(encoderId, outStream);
                encoder.SetSoftwareBitmap(result);
                await encoder.FlushAsync();
            }

            source.Dispose();
            result.Dispose();

            Console.WriteLine(JsonSerializer.Serialize(new
            {
                status = "success",
                outputPath,
                message = $"Upscaled {scaleFactor}x successfully."
            }));
        }

        static async Task ExtractText(string inputPath)
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException("Input image not found.", inputPath);

            string fullInputPath = Path.GetFullPath(inputPath);
            StorageFile inputFile = await StorageFile.GetFileFromPathAsync(fullInputPath);

            SoftwareBitmap source;
            using (var stream = await inputFile.OpenAsync(FileAccessMode.Read))
            {
                var decoder = await BitmapDecoder.CreateAsync(stream);
                source = await decoder.GetSoftwareBitmapAsync();
            }

            // OcrEngine supports Bgra8 (SoftwareBitmap max dimensions: 4000x4000)
            if (source.BitmapPixelFormat != BitmapPixelFormat.Bgra8)
            {
                var newSource = SoftwareBitmap.Convert(source, BitmapPixelFormat.Bgra8);
                source.Dispose();
                source = newSource;
            }

            OcrEngine engine = OcrEngine.TryCreateFromUserProfileLanguages();
            if (engine == null)
            {
                source.Dispose();
                throw new Exception("Failed to initialize OcrEngine with user profile languages.");
            }

            var result = await engine.RecognizeAsync(source);
            source.Dispose();

            Console.WriteLine(JsonSerializer.Serialize(new
            {
                status = "success",
                text = result.Text
            }));
        }
    }
}
