param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot "..\pages"),
  [string]$OutputRoot = (Join-Path $PSScriptRoot "..\page-thumbs"),
  [int]$MaxWidth = 360,
  [int]$JpegQuality = 68
)

& (Join-Path $PSScriptRoot "generate-reader-assets.ps1") `
  -SourceRoot $SourceRoot `
  -ThumbnailRoot $OutputRoot `
  -ThumbnailMaxWidth $MaxWidth `
  -ThumbnailJpegQuality $JpegQuality `
  -SkipOptimized
