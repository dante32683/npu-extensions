$baseDir = $PSScriptRoot

$bridges = @(
    @{
        Name = "NPU Image Editor Bridge"
        Bin = "npu-image-editor-ext\assets\bin"
        Manifest = "npu-image-editor-ext\bridge\Package.appxmanifest"
    },
    @{
        Name = "NPU Text Tools Bridge"
        Bin = "npu-text-tools-ext\assets\bin"
        Manifest = "npu-text-tools-ext\bridge\Package.appxmanifest"
    },
    @{
        Name = "NPU Notes Bridge"
        Bin = "npu-notes-ext\assets\bin"
        Manifest = "npu-notes-ext\bridge\Package.appxmanifest"
    }
)

foreach ($bridge in $bridges) {
    $binDir = Join-Path $baseDir $bridge.Bin
    $manifestSource = Join-Path $baseDir $bridge.Manifest
    $manifestDest = Join-Path $binDir "AppxManifest.xml"

    if (-not (Test-Path $manifestSource)) {
        Write-Host "Skipping $($bridge.Name): manifest missing at $manifestSource" -ForegroundColor Yellow
        continue
    }

    if (-not (Test-Path $binDir)) {
        Write-Host "Skipping $($bridge.Name): build output missing at $binDir" -ForegroundColor Yellow
        continue
    }

    Copy-Item -Path $manifestSource -Destination $manifestDest -Force
    Write-Host "Registering $($bridge.Name) sparse package identity..." -ForegroundColor Cyan

    try {
        Add-AppxPackage -Register $manifestDest -ExternalLocation $binDir -ForceApplicationShutdown -ErrorAction Stop
        Write-Host "Registered $($bridge.Name)." -ForegroundColor Green
    } catch {
        Write-Host "Registration failed for $($bridge.Name): $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Ensure Developer Mode is enabled and you are running as Administrator." -ForegroundColor Yellow
    }
}
