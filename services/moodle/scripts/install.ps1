$ErrorActionPreference = "Stop"

$Owner = "DotNaos"
$Repo = "moodle"
$ReleaseTagPrefix = "moodle-v"
$Version = if ($env:VERSION) { $env:VERSION } else { "latest" }
$InstallDir = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\moodle\bin" }
$ChecksumFile = "checksums.txt"
$ReleasesApiOverride = $env:MOODLE_RELEASES_API_URL
$ReleasesApiUrl = if ($env:MOODLE_RELEASES_API_URL) { $env:MOODLE_RELEASES_API_URL } else { "https://api.github.com/repos/$Owner/$Repo/releases?per_page=100" }
$ReleaseDownloadBaseUrl = if ($env:MOODLE_RELEASE_DOWNLOAD_BASE_URL) { $env:MOODLE_RELEASE_DOWNLOAD_BASE_URL } else { "https://github.com/$Owner/$Repo/releases/download" }

function Resolve-AssetName {
  switch ($env:PROCESSOR_ARCHITECTURE) {
    "AMD64" { return "moodle_windows_amd64.zip" }
    "ARM64" { return "moodle_windows_arm64.zip" }
    default { throw "Unsupported Windows architecture: $env:PROCESSOR_ARCHITECTURE" }
  }
}

function Resolve-Version {
  param([string]$RequestedVersion, [string]$AssetName)

  if ($RequestedVersion -eq "latest") {
    $Releases = @()
    for ($Page = 1; $Page -le 10; $Page++) {
      if ($ReleasesApiOverride) {
        if ($Page -gt 1) { break }
        $PageUrl = $ReleasesApiUrl
      }
      else {
        $PageUrl = "$ReleasesApiUrl&page=$Page"
      }
      $PageReleases = @(Invoke-RestMethod -Uri $PageUrl)
      $Releases += $PageReleases
      if ($ReleasesApiOverride -or $PageReleases.Count -lt 100) { break }
    }
    $Release = $Releases |
      Where-Object {
        -not $_.draft -and
        -not $_.prerelease -and
        $_.tag_name -match '^moodle-v\d+\.\d+\.\d+$' -and
        ($_.assets.name -contains $AssetName) -and
        ($_.assets.name -contains $ChecksumFile)
      } |
      Sort-Object { [version]($_.tag_name -replace '^moodle-v', '') } -Descending |
      Select-Object -First 1
    if (-not $Release) {
      throw "No stable Moodle CLI release was found."
    }
    return $Release.tag_name
  }

  if ($RequestedVersion -match '^\d') {
    $RequestedVersion = "$ReleaseTagPrefix$RequestedVersion"
  }
  elseif ($RequestedVersion -match '^v') {
    $RequestedVersion = "moodle-$RequestedVersion"
  }
  if ($RequestedVersion -notmatch '^moodle-v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$') {
    throw "Invalid Moodle CLI release tag: $RequestedVersion"
  }
  return $RequestedVersion
}

function Get-ExpectedChecksum {
  param(
    [string]$ChecksumPath,
    [string]$AssetName
  )

  $line = Select-String -Path $ChecksumPath -Pattern " $([regex]::Escape($AssetName))$" | Select-Object -First 1
  if (-not $line) {
    throw "Could not find checksum for $AssetName."
  }

  return ($line.Line -split '\s+')[0]
}

$AssetName = Resolve-AssetName
$ResolvedVersion = Resolve-Version -RequestedVersion $Version -AssetName $AssetName
$BaseUrl = "$ReleaseDownloadBaseUrl/$ResolvedVersion"
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("moodle-install-" + [System.Guid]::NewGuid().ToString("n"))

New-Item -ItemType Directory -Path $TempDir | Out-Null
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$ZipPath = Join-Path $TempDir $AssetName
$ChecksumPath = Join-Path $TempDir $ChecksumFile
$ExtractDir = Join-Path $TempDir "extract"

try {
  Invoke-WebRequest -Uri "$BaseUrl/$AssetName" -OutFile $ZipPath
  Invoke-WebRequest -Uri "$BaseUrl/$ChecksumFile" -OutFile $ChecksumPath

  $Expected = Get-ExpectedChecksum -ChecksumPath $ChecksumPath -AssetName $AssetName
  $Actual = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($Expected.ToLowerInvariant() -ne $Actual) {
    throw "Checksum verification failed for $AssetName."
  }

  Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force
  Copy-Item -Path (Join-Path $ExtractDir "moodle.exe") -Destination (Join-Path $InstallDir "moodle.exe") -Force

  Write-Host "Installed Moodle CLI $ResolvedVersion to $(Join-Path $InstallDir 'moodle.exe')"
  if (-not (($env:PATH -split ';') -contains $InstallDir)) {
    Write-Warning "Add $InstallDir to your PATH if it is not already there."
  }
}
finally {
  Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
}
