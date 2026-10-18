Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\..\web\public\logo-original-backup.png")
$w = $img.Width
$h = $img.Height

Write-Host "Analyzing 10x10 grid of logo-original-backup.png ($w x $h):"
for ($y = 0; $y -lt $h; $y += [int]($h / 8)) {
    $row = ""
    for ($x = 0; $x -lt $w; $x += [int]($w / 8)) {
        $c = $img.GetPixel($x, $y)
        $hex = "#" + $c.R.ToString("X2") + $c.G.ToString("X2") + $c.B.ToString("X2")
        $row += "$hex  "
    }
    Write-Host "Y=$y : $row"
}

$img.Dispose()
