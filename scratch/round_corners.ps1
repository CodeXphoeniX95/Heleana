Add-Type -AssemblyName System.Drawing

function Create-RoundedImage($srcPath, $destPath, $targetW = 0, $targetH = 0, $radiusPercent = 0.22) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    
    $w = if ($targetW -gt 0) { $targetW } else { $src.Width }
    $h = if ($targetH -gt 0) { $targetH } else { $src.Height }
    $r = [int]($w * $radiusPercent)
    
    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $r * 2

    $path.AddArc(0, 0, $diameter, $diameter, 180, 90)
    $path.AddArc($w - $diameter, 0, $diameter, $diameter, 270, 90)
    $path.AddArc($w - $diameter, $h - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc(0, $h - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $g.SetClip($path)
    $g.DrawImage($src, 0, 0, $w, $h)

    $g.Dispose()
    $src.Dispose()

    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created rounded image at $destPath ($w x $h, radius: $r px)"
}

$backupPath = "$PSScriptRoot\..\web\public\logo-original-backup.png"

# Process web icons
Create-RoundedImage $backupPath "$PSScriptRoot\..\web\public\logo.png" 512 512
Create-RoundedImage $backupPath "$PSScriptRoot\..\web\public\logo-rounded.png" 512 512
Create-RoundedImage $backupPath "$PSScriptRoot\..\web\public\pwa-192x192.png" 192 192
Create-RoundedImage $backupPath "$PSScriptRoot\..\web\public\pwa-512x512.png" 512 512
Create-RoundedImage $backupPath "$PSScriptRoot\..\web\public\apple-touch-icon.png" 180 180

# Process admin-web icons
Create-RoundedImage $backupPath "$PSScriptRoot\..\admin-web\public\logo.png" 512 512
Create-RoundedImage $backupPath "$PSScriptRoot\..\admin-web\public\logo-rounded.png" 512 512
Create-RoundedImage $backupPath "$PSScriptRoot\..\admin-web\public\pwa-192x192.png" 192 192
Create-RoundedImage $backupPath "$PSScriptRoot\..\admin-web\public\pwa-512x512.png" 512 512
Create-RoundedImage $backupPath "$PSScriptRoot\..\admin-web\public\apple-touch-icon.png" 180 180

Write-Host "All app icons (logo, PWA, apple-touch-icon) generated and updated with rounded corners!"
