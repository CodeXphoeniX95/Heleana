Add-Type -AssemblyName System.Drawing

function Extract-InnerSquircleIcon($srcPath, $destPath, $targetW = 512, $targetH = 512) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    $origW = $src.Width
    $origH = $src.Height

    # Coordinates of the inner squircle card inside the 1024x1024 original image
    # The badge sits roughly from X=118, Y=118 to X=906, Y=906 (size ~788x788)
    $cropX = [int]($origW * 0.115)
    $cropY = [int]($origH * 0.115)
    $cropSize = [int]($origW * 0.77)

    # 1. Crop to the inner squircle card area
    $cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropSize, $cropSize)
    $croppedBmp = $src.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $src.Dispose()

    # 2. Create high quality target bitmap with transparent background
    $targetBmp = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($targetBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 3. Define squircle rounded clip path (radius ~22% of target size for standard iOS/Android/Windows squircle)
    $r = [int]($targetW * 0.22)
    $diameter = $r * 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath

    $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $path.AddArc($targetW - $diameter, 0, $diameter, $diameter, 270, 90)
    $path.AddArc($targetW - $diameter, $targetH - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc(0, $targetH - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $g.SetClip($path)
    $g.DrawImage($croppedBmp, 0, 0, $targetW, $targetH)

    $g.Dispose()
    $croppedBmp.Dispose()

    $targetBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetBmp.Dispose()

    Write-Host "Successfully generated transparent rounded squircle icon at $destPath ($targetW x $targetH)"
}

$backupPath = "$PSScriptRoot\..\web\public\logo-original-backup.png"

# Process web icons
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\web\public\logo.png" 512 512
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\web\public\logo-rounded.png" 512 512
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\web\public\pwa-192x192.png" 192 192
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\web\public\pwa-512x512.png" 512 512
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\web\public\apple-touch-icon.png" 180 180

# Process admin-web icons
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\admin-web\public\logo.png" 512 512
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\admin-web\public\logo-rounded.png" 512 512
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\admin-web\public\pwa-192x192.png" 192 192
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\admin-web\public\pwa-512x512.png" 512 512
Extract-InnerSquircleIcon $backupPath "$PSScriptRoot\..\admin-web\public\apple-touch-icon.png" 180 180

Write-Host "ALL APP ICONS CONVERTED TO TRANSPARENT SQUIRCLE ICONS!"
