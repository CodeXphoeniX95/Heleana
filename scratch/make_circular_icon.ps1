Add-Type -AssemblyName System.Drawing

function Create-CircularAppIcon($srcPath, $destPath, $targetSize = 512, $isCircle = $true) {
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)

    # We target the central emblem in logo-original-backup.png
    # The gold coin + teal ring + dark blue inner card span from approx (140, 140) to (884, 884)
    $cropSize = 744
    $cropX = [int]((1024 - $cropSize) / 2) # 140
    $cropY = [int]((1024 - $cropSize) / 2) # 140

    $cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropSize, $cropSize)
    $croppedBmp = $src.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $src.Dispose()

    # Create target bitmap with 32bpp ARGB transparent background
    $targetBmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($targetBmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    if ($isCircle) {
        # Perfect Circle - 100% round like Chrome / mobile app icons
        $path.AddEllipse(0, 0, $targetSize, $targetSize)
    } else {
        # Super rounded squircle (40% radius)
        $r = [int]($targetSize * 0.40)
        $diameter = $r * 2
        $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
        $path.AddArc($targetSize - $diameter, 0, $diameter, $diameter, 270, 90)
        $path.AddArc($targetSize - $diameter, $targetSize - $diameter, $diameter, $diameter, 0, 90)
        $path.AddArc(0, $targetSize - $diameter, $diameter, $diameter, 90, 90)
        $path.CloseFigure()
    }

    $g.SetClip($path)
    $g.DrawImage($croppedBmp, 0, 0, $targetSize, $targetSize)

    $g.Dispose()
    $croppedBmp.Dispose()

    $targetBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $targetBmp.Dispose()

    Write-Host "Generated circular icon: $destPath ($targetSize x $targetSize)"
}

$backupPath = "$PSScriptRoot\..\web\public\logo-original-backup.png"

# Process web icons with circle mask
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\web\public\logo.png" 512 $true
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\web\public\logo-rounded.png" 512 $true
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\web\public\pwa-192x192.png" 192 $true
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\web\public\pwa-512x512.png" 512 $true
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\web\public\apple-touch-icon.png" 180 $true

# Process admin-web icons with circle mask
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\admin-web\public\logo.png" 512 $true
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\admin-web\public\logo-rounded.png" 512 $true
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\admin-web\public\pwa-192x192.png" 192 $true
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\admin-web\public\pwa-512x512.png" 512 $true
Create-CircularAppIcon $backupPath "$PSScriptRoot\..\admin-web\public\apple-touch-icon.png" 180 $true

Write-Host "SUCCESS: Created circular app icons with 100% transparent backgrounds!"
