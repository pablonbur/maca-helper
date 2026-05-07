$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$IconDir = Join-Path $ProjectRoot "src-tauri\icons"
$PngPath = Join-Path $IconDir "icon.png"
$IcoPath = Join-Path $IconDir "icon.ico"

New-Item -ItemType Directory -Force -Path $IconDir | Out-Null

Add-Type -AssemblyName System.Drawing

$Size = 256
$Bitmap = New-Object System.Drawing.Bitmap $Size, $Size
$Graphics = [System.Drawing.Graphics]::FromImage($Bitmap)
$Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$Graphics.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

$Background = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 22, 124, 128))
$Accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 242, 223))
$TextBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)

$Graphics.FillEllipse($Background, 12, 12, 232, 232)
$Graphics.FillEllipse($Accent, 164, 32, 48, 48)

$Font = New-Object System.Drawing.Font "Segoe UI", 86, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$Format = New-Object System.Drawing.StringFormat
$Format.Alignment = [System.Drawing.StringAlignment]::Center
$Format.LineAlignment = [System.Drawing.StringAlignment]::Center
$Rect = New-Object System.Drawing.RectangleF 0, 18, $Size, 220

$Graphics.DrawString("M", $Font, $TextBrush, $Rect, $Format)
$Bitmap.Save($PngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$PngBytes = [System.IO.File]::ReadAllBytes($PngPath)
$IcoBytes = New-Object System.Collections.Generic.List[byte]

function Add-UInt16Le([System.Collections.Generic.List[byte]]$List, [int]$Value) {
  $List.Add([byte]($Value -band 0xFF))
  $List.Add([byte](($Value -shr 8) -band 0xFF))
}

function Add-UInt32Le([System.Collections.Generic.List[byte]]$List, [int]$Value) {
  $List.Add([byte]($Value -band 0xFF))
  $List.Add([byte](($Value -shr 8) -band 0xFF))
  $List.Add([byte](($Value -shr 16) -band 0xFF))
  $List.Add([byte](($Value -shr 24) -band 0xFF))
}

Add-UInt16Le $IcoBytes 0
Add-UInt16Le $IcoBytes 1
Add-UInt16Le $IcoBytes 1
$IcoBytes.Add(0)
$IcoBytes.Add(0)
$IcoBytes.Add(0)
$IcoBytes.Add(0)
Add-UInt16Le $IcoBytes 1
Add-UInt16Le $IcoBytes 32
Add-UInt32Le $IcoBytes $PngBytes.Length
Add-UInt32Le $IcoBytes 22
$IcoBytes.AddRange($PngBytes)

[System.IO.File]::WriteAllBytes($IcoPath, $IcoBytes.ToArray())

$Graphics.Dispose()
$Bitmap.Dispose()

Write-Host "Icono generado en $IcoPath"
