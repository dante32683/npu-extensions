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

#pragma warning disable CS8305 // experimental APIs

namespace NpuBridge
{
    class Program
    {
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
                        WriteNotImplemented("make-sticker", "Usage: NpuBridge.exe make-sticker <inputPath>");
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

        static void WriteNotImplemented(string command, string usage)
        {
            Console.WriteLine(JsonSerializer.Serialize(new
            {
                status = "error",
                command,
                usage,
                message = "Bridge command scaffolded but not implemented yet."
            }));
        }

        static async Task RemoveBackground(string inputPath)
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException("Input image not found.", inputPath);

            if (ImageForegroundExtractor.GetReadyState() != AIFeatureReadyState.Ready)
            {
                Console.Error.WriteLine("[NpuBridge] Model not ready — calling EnsureReadyAsync (may take a moment on first run)...");
                var readyResult = await ImageForegroundExtractor.EnsureReadyAsync();
                if (readyResult.Status != AIFeatureReadyResultState.Success)
                    throw new Exception($"NPU segmentation model unavailable: {readyResult.Status}");
            }

            string fullInputPath = Path.GetFullPath(inputPath);
            StorageFile inputFile = await StorageFile.GetFileFromPathAsync(fullInputPath);

            SoftwareBitmap source;
            using (var stream = await inputFile.OpenAsync(FileAccessMode.Read))
            {
                var decoder = await BitmapDecoder.CreateAsync(stream);
                source = await decoder.GetSoftwareBitmapAsync();
            }

            using var extractor = await ImageForegroundExtractor.CreateAsync();
            SoftwareBitmap mask = extractor.GetMaskFromSoftwareBitmap(source);

            // Composite: apply mask as alpha channel → transparent PNG
            SoftwareBitmap result = ApplyMaskAsAlpha(source, mask);
            source.Dispose();
            mask.Dispose();

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
