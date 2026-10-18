Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\..\web\public\logo-original-backup.png")
$w = $img.Width
$h = $img.Height

Write-Host "Width: $w, Height: $h"

# Sample colors from corners and center
Write-Host "Top-Left (10,10):" ($img.GetPixel(10, 10))
Write-Host "Top-Right ($($w-10),10):" ($img.GetPixel($w-10, 10))
Write-Host "Center ($($w/2),$($h/2)):" ($img.GetPixel($w/2, $h/2))
Write-Host "Quarter ($($w/4),$($h/4)):" ($img.GetPixel($w/4, $h/4))

$img.Dispose()
