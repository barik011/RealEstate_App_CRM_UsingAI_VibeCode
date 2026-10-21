$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = Split-Path -Parent $PSScriptRoot
$buildRoot = Join-Path $projectRoot 'dist'
$outputPath = Join-Path $projectRoot 'artifacts/hostinger-realstate-linux.zip'
if (-not (Test-Path -LiteralPath (Join-Path $buildRoot 'index.html'))) {
  throw 'Run npm run build before packaging.'
}
if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath }
$archive = [System.IO.Compression.ZipFile]::Open($outputPath, 'Create')
try {
  Get-ChildItem -LiteralPath $buildRoot -Recurse -File -Force | ForEach-Object {
    # ZIP paths must use forward slashes even when created on Windows.
    $entryName = $_.FullName.Substring($buildRoot.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive, $_.FullName, $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally { $archive.Dispose() }
$archive = [System.IO.Compression.ZipFile]::OpenRead($outputPath)
try {
  $names = @($archive.Entries | ForEach-Object { $_.FullName })
  if ($names | Where-Object { $_.Contains('\') -or $_ -match '^dist/|(^|/)\.env' }) {
    throw 'Invalid deployment archive paths.'
  }
  foreach ($required in @('index.html', '.htaccess', 'favicon.svg', 'images/fallback.svg')) {
    if ($names -notcontains $required) { throw "Missing $required" }
  }
  if (-not ($names | Where-Object { $_ -match '^assets/.+\.js$' })) {
    throw 'Missing JavaScript assets.'
  }
  Write-Output "Verified $($names.Count) static files with Linux-compatible ZIP paths: $outputPath"
} finally { $archive.Dispose() }
