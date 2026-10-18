Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\..\web\public\logo.png")
$w = $img.Width
$h = $img.Height

Write-Host "Logo dimensions: $w x $h"
Write-Host "Corner Top-Left (0,0):" ($img.GetPixel(0, 0))
Write-Host "Corner Top-Right ($($w-1),0):" ($img.GetPixel($w-1, 0))
Write-Host "Corner Bottom-Left (0,$($h-1)):" ($img.GetPixel(0, $h-1))
Write-Host "Corner Bottom-Right ($($w-1),$($h-1)):" ($img.GetPixel($w-1, $h-1))

Write-Host "Inside (100,100):" ($img.GetPixel(100, 100))
Write-Host "Center (256,256):" ($img.GetPixel(256, 256))

$img.Dispose()
