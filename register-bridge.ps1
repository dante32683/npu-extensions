$baseDir = $PSScriptRoot
$binDir = Join-Path $baseDir "npu-image-editor-ext\assets\bin"
$manifestSource = Join-Path $baseDir "npu-image-editor-ext\bridge\Package.appxmanifest"
$manifestDest = Join-Path $binDir "AppxManifest.xml"

# 1. Copy manifest to bin folder (renamed to AppxManifest.xml for standard registration)
if (Test-Path $manifestSource) {
    Copy-Item -Path $manifestSource -Destination $manifestDest -Force
} else {
    Write-Host "Error: Package.appxmanifest not found at $manifestSource" -ForegroundColor Red
    exit
}

# 2. Register via PowerShell (Bypasses the .exe startup error)
Write-Host "Registering NPU Bridge Sparse Package identity via PowerShell..." -ForegroundColor Cyan

try {
    Add-AppxPackage -Register $manifestDest -ExternalLocation $binDir -ForceApplicationShutdown -ErrorAction Stop
    Write-Host "Identity registered successfully! NPU features should now be unlocked." -ForegroundColor Green
} catch {
    Write-Host "Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Ensure Developer Mode is enabled and you are running as Administrator." -ForegroundColor Yellow
}
