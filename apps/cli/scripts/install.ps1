#!/usr/bin/env pwsh
param(
  [String]$Version = "latest",
  [Switch]$NoPathUpdate
)

$ErrorActionPreference = "Stop"

$Repo        = if ($env:OPENBEAM_REPO)    { $env:OPENBEAM_REPO }    else { "kuluruvineeth/openbeam" }
$InstallDir  = if ($env:OPENBEAM_INSTALL) { $env:OPENBEAM_INSTALL } else { "$env:USERPROFILE\.openbeam" }
$BinDir      = Join-Path $InstallDir "bin"

if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64" -or $env:PROCESSOR_ARCHITEW6432 -eq "ARM64") {
  $Target = "windows_arm64"
} else {
  $Target = "windows_x86_64"
}

$TmpDir = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "openbeam-install-$([Guid]::NewGuid())")

try {
  if ($Version -eq "latest") {
    Write-Host "Resolving latest release..."
    $latest = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers @{ "User-Agent" = "openbeam-install" }
    if ($latest.tag_name -like "cli-v*") {
      $Tag = $latest.tag_name
    } else {
      $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases?per_page=20" -Headers @{ "User-Agent" = "openbeam-install" }
      $Tag = ($releases | Where-Object { $_.tag_name -like "cli-v*" } | Select-Object -First 1).tag_name
    }
    if (-not $Tag) { throw "Could not resolve a cli-v* release for $Repo" }
  } else {
    $Tag = $Version
  }

  if ($Tag -notmatch '^cli-v[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.]+)?$') {
    throw "Invalid tag: $Tag (expected cli-vX.Y.Z)"
  }

  $ResolvedVersion = $Tag -replace '^cli-v', ''
  $Archive = "openbeam_${ResolvedVersion}_${Target}.zip"
  $Base    = "https://github.com/$Repo/releases/download/$Tag"

  Write-Host "Downloading $Archive"
  Invoke-WebRequest -Uri "$Base/$Archive"         -OutFile (Join-Path $TmpDir $Archive)
  Invoke-WebRequest -Uri "$Base/checksums.txt"    -OutFile (Join-Path $TmpDir "checksums.txt")

  Write-Host "Verifying checksum"
  $expected = (Get-Content (Join-Path $TmpDir "checksums.txt") | Where-Object { $_ -match [regex]::Escape($Archive) } | ForEach-Object { ($_ -split '\s+')[0] })
  if (-not $expected) { throw "Checksum for $Archive not found" }
  $actual = (Get-FileHash -Algorithm SHA256 -Path (Join-Path $TmpDir $Archive)).Hash.ToLower()
  if ($actual -ne $expected.ToLower()) { throw "Checksum mismatch: expected $expected, got $actual" }

  Write-Host "Extracting to $BinDir"
  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  Expand-Archive -Path (Join-Path $TmpDir $Archive) -DestinationPath $TmpDir -Force
  Move-Item -Force -Path (Join-Path $TmpDir "openbeam.exe") -Destination (Join-Path $BinDir "openbeam.exe")

  if (-not $NoPathUpdate) {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$BinDir*") {
      [Environment]::SetEnvironmentVariable("Path", "$userPath;$BinDir", "User")
      Write-Host "Added $BinDir to User PATH — open a new terminal for the change to take effect"
    }
    if (-not [Environment]::GetEnvironmentVariable("OPENBEAM_INSTALL", "User")) {
      [Environment]::SetEnvironmentVariable("OPENBEAM_INSTALL", $InstallDir, "User")
    }
  }

  Write-Host ""
  Write-Host "openbeam $ResolvedVersion installed to $BinDir\openbeam.exe" -ForegroundColor Green
  Write-Host "Run 'openbeam --help' to get started." -ForegroundColor Green
}
finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $TmpDir
}
