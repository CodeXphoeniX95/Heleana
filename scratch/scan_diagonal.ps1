Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\..\web\public\logo-original-backup.png")
$w = $img.Width
$h = $img.Height

# Scan along diagonal from top-left (0,0) toward center (512,512) to find where the inner rounded squircle card starts!
for ($i = 0; $i -lt 512; $i += 2) {
    $c = $img.GetPixel($i, $i)
    Write-Host "At ($i, $i): R=$($c.R), G=$($c.G), B=$($c.B)"
    if ($c.G -gt 60 -and $c.B -gt 90) {
        Write-Host ">>> Inner squircle card boundary found around ($i, $i)!"
        break
    }
}

$img.Dispose()
