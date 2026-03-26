param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot "..\pages"),
  [string]$OptimizedRoot = (Join-Path $PSScriptRoot "..\optimized-pages"),
  [string]$ThumbnailRoot = (Join-Path $PSScriptRoot "..\page-thumbs"),
  [int]$OptimizedMaxWidth = 1800,
  [int]$ThumbnailMaxWidth = 360,
  [int]$OptimizedJpegQuality = 82,
  [int]$ThumbnailJpegQuality = 68,
  [switch]$SkipOptimized,
  [switch]$SkipThumbnails
)

Add-Type -AssemblyName System.Drawing

$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" } |
  Select-Object -First 1

if (-not $jpegEncoder) {
  throw "No se encontro el codificador JPEG de System.Drawing."
}

function Resolve-OrCreateDirectory {
  param([string]$Path)

  $resolved = Resolve-Path $Path -ErrorAction SilentlyContinue

  if (-not $resolved) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
    $resolved = Resolve-Path $Path
  }

  return $resolved.Path.TrimEnd('\', '/')
}

function Get-RelativeFilePath {
  param(
    [string]$FullPath,
    [string]$RootPath
  )

  return $FullPath.Substring($RootPath.Length).TrimStart('\', '/')
}

function Get-JpegOutputPath {
  param(
    [string]$RelativePath,
    [string]$OutputRoot
  )

  $relativeDirectory = Split-Path $RelativePath -Parent
  $fileName = [System.IO.Path]::GetFileNameWithoutExtension($RelativePath) + ".jpg"

  if ([string]::IsNullOrWhiteSpace($relativeDirectory)) {
    return Join-Path $OutputRoot $fileName
  }

  return Join-Path (Join-Path $OutputRoot $relativeDirectory) $fileName
}

function Save-OptimizedJpeg {
  param(
    [string]$InputPath,
    [string]$OutputPath,
    [int]$MaxWidth,
    [int]$Quality
  )

  $source = [System.Drawing.Image]::FromFile($InputPath)

  try {
    $scale = 1.0

    if ($source.Width -gt $MaxWidth) {
      $scale = $MaxWidth / $source.Width
    }

    $targetWidth = [Math]::Max([int][Math]::Round($source.Width * $scale), 1)
    $targetHeight = [Math]::Max([int][Math]::Round($source.Height * $scale), 1)

    $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $bitmap.SetResolution($source.HorizontalResolution, $source.VerticalResolution)

    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($source, 0, 0, $targetWidth, $targetHeight)

        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
          [System.Drawing.Imaging.Encoder]::Quality,
          [long]$Quality
        )

        $bitmap.Save($OutputPath, $jpegEncoder, $encoderParams)
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

function Build-Variant {
  param(
    [System.IO.FileInfo]$File,
    [string]$SourceRoot,
    [string]$OutputRoot,
    [int]$MaxWidth,
    [int]$Quality,
    [string]$VariantName
  )

  $relativePath = Get-RelativeFilePath -FullPath $File.FullName -RootPath $SourceRoot
  $outputPath = Get-JpegOutputPath -RelativePath $relativePath -OutputRoot $OutputRoot
  $outputDirectory = Split-Path $outputPath -Parent

  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

  if ((Test-Path $outputPath) -and ((Get-Item $outputPath).LastWriteTimeUtc -ge $File.LastWriteTimeUtc)) {
    return [pscustomobject]@{
      Variant = $VariantName
      Status = "cached"
      SourceBytes = $File.Length
      OutputBytes = (Get-Item $outputPath).Length
    }
  }

  Save-OptimizedJpeg -InputPath $File.FullName -OutputPath $outputPath -MaxWidth $MaxWidth -Quality $Quality

  return [pscustomobject]@{
    Variant = $VariantName
    Status = "generated"
    SourceBytes = $File.Length
    OutputBytes = (Get-Item $outputPath).Length
  }
}

$resolvedSourceRoot = (Resolve-Path $SourceRoot).Path.TrimEnd('\', '/')
$resolvedOptimizedRoot = $null
$resolvedThumbnailRoot = $null

if (-not $SkipOptimized) {
  $resolvedOptimizedRoot = Resolve-OrCreateDirectory -Path $OptimizedRoot
}

if (-not $SkipThumbnails) {
  $resolvedThumbnailRoot = Resolve-OrCreateDirectory -Path $ThumbnailRoot
}

$sourceFiles = Get-ChildItem -Path $resolvedSourceRoot -Recurse -File -Include *.jpg, *.jpeg, *.png, *.webp, *.avif |
  Sort-Object FullName

$results = @()

foreach ($file in $sourceFiles) {
  if (-not $SkipOptimized) {
    $results += Build-Variant `
      -File $file `
      -SourceRoot $resolvedSourceRoot `
      -OutputRoot $resolvedOptimizedRoot `
      -MaxWidth $OptimizedMaxWidth `
      -Quality $OptimizedJpegQuality `
      -VariantName "optimized"
  }

  if (-not $SkipThumbnails) {
    $results += Build-Variant `
      -File $file `
      -SourceRoot $resolvedSourceRoot `
      -OutputRoot $resolvedThumbnailRoot `
      -MaxWidth $ThumbnailMaxWidth `
      -Quality $ThumbnailJpegQuality `
      -VariantName "thumbnail"
  }
}

if (-not $results.Count) {
  Write-Host "No se generaron variantes."
  exit 0
}

$groupedResults = $results | Group-Object Variant

foreach ($group in $groupedResults) {
  $totalSourceMb = [math]::Round((($group.Group | Measure-Object SourceBytes -Sum).Sum / 1MB), 2)
  $totalOutputMb = [math]::Round((($group.Group | Measure-Object OutputBytes -Sum).Sum / 1MB), 2)
  $generatedCount = ($group.Group | Where-Object { $_.Status -eq "generated" }).Count
  $cachedCount = ($group.Group | Where-Object { $_.Status -eq "cached" }).Count
  $ratio = if ($totalSourceMb -gt 0) { [math]::Round((1 - ($totalOutputMb / $totalSourceMb)) * 100, 1) } else { 0 }

  Write-Host ("[{0}] archivos={1} generados={2} cacheados={3} origen={4}MB salida={5}MB ahorro={6}%" -f `
    $group.Name,
    $group.Count,
    $generatedCount,
    $cachedCount,
    $totalSourceMb,
    $totalOutputMb,
    $ratio
  )
}
