Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\..\web\public\logo-original-backup.png")
$w = $img.Width
$h = $img.Height

$bgR = 20
$bgG = 45
$bgB = 75

# Find top edge of the inner badge (scanning down along center X)
$minY = 0
for ($y = 0; $y -lt $h / 2; $y++) {
    $c = $img.GetPixel([int]($w / 2), $y)
    # Check if color differs noticeably from background
    $diff = [Math]::Abs($c.R - $bgR) + [Math]::Abs($c.G - $bgG) + [Math]::Abs($c.B - $bgB)
    if ($diff -gt 30) {
        $minY = $y
        break
    }
}

# Find bottom edge
$maxY = $h - 1
for ($y = $h - 1; $y -gt $h / 2; $y--) {
    $c = $img.GetPixel([int]($w / 2), $y)
    $diff = [Math]::Abs($c.R - $bgR) + [Math]::Abs($c.G - $bgG) + [Math]::Abs($c.B - $bgB)
    if ($diff -gt 30) {
        $maxY = $y
        break
    }
}

# Find left edge along center Y
$minX = 0
for ($x = 0; $x -lt $w / 2; $x++) {
    $c = $img.GetPixel($x, [int]($h / 2))
    $diff = [Math]::Abs($c.R - $bgR) + [Math]::Abs($c.G - $bgG) + [Math]::Abs($c.B - $bgB)
    if ($diff -gt 30) {
        $minX = $x
        break
    }
}

# Find right edge
$maxX = $w - 1
for ($x = $w - 1; $x -gt $w / 2; $x--) {
    $c = $img.GetPixel($x, [int]($h / 2))
    $diff = [Math]::Abs($c.R - $bgR) + [Math]::Abs($c.G - $bgG) + [Math]::Abs($c.B - $bgB)
    if ($diff -gt 30) {
        $maxX = $x
        break
    }
}

$img.Dispose()

Write-Host "Badge bounds: X = $minX to $maxX (Width: $($maxX - $minX)), Y = $minY to $maxY (Height: $($maxY - $minY))"
