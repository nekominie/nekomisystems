param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot "..\pages"),
  [string]$OutputRoot = (Join-Path $PSScriptRoot "..\thumbs"),
  [int]$MaxWidth = 320,
  [int]$JpegQuality = 72
)

Add-Type -AssemblyName System.Drawing

$ResolvedSourceRoot = (Resolve-Path $SourceRoot).Path.TrimEnd('\', '/')
$ResolvedOutputRoot = (Resolve-Path $OutputRoot -ErrorAction SilentlyContinue)

if (-not $ResolvedOutputRoot) {
  New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
  $ResolvedOutputRoot = (Resolve-Path $OutputRoot).Path
}
else {
  $ResolvedOutputRoot = $ResolvedOutputRoot.Path
}

$ResolvedOutputRoot = $ResolvedOutputRoot.TrimEnd('\', '/')

function Save-Thumbnail {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$MaxWidth,
    [int]$JpegQuality
  )

  $source = [System.Drawing.Image]::FromFile($InputPath)

  try {
    $ratio = $MaxWidth / $source.Width
    $targetWidth = [Math]::Min($MaxWidth, $source.Width)
    $targetHeight = [int][Math]::Round($source.Height * $ratio)

    if ($source.Width -le $MaxWidth) {
      $targetWidth = $source.Width
      $targetHeight = $source.Height
    }

    $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)

    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)

        $extension = [System.IO.Path]::GetExtension($OutputPath).ToLowerInvariant()

        if ($extension -eq ".jpg" -or $extension -eq ".jpeg") {
          $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
            Where-Object { $_.MimeType -eq "image/jpeg" }
          $qualityEncoder = [System.Drawing.Imaging.Encoder]::Quality
          $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
          $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($qualityEncoder, [long]$JpegQuality)
          $bitmap.Save($OutputPath, $encoder, $encoderParams)
        }
        else {
          $bitmap.Save($OutputPath)
        }
      }
      finally {
        $graphics.Dispose()
      }
    }
    finally {
      $bitmap.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }
}

$files = Get-ChildItem -Path $ResolvedSourceRoot -Recurse -File -Include *.jpg, *.jpeg, *.png, *.webp

foreach ($file in $files) {
  $relativePath = $file.FullName.Substring($ResolvedSourceRoot.Length).TrimStart('\', '/')
  $outputPath = Join-Path $ResolvedOutputRoot $relativePath
  $outputDir = Split-Path $outputPath -Parent

  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

  if ((Test-Path $outputPath) -and ((Get-Item $outputPath).LastWriteTimeUtc -ge $file.LastWriteTimeUtc)) {
    continue
  }

  Save-Thumbnail -InputPath $file.FullName -OutputPath $outputPath -MaxWidth $MaxWidth -JpegQuality $JpegQuality
}
