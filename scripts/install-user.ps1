$ErrorActionPreference = "Stop"

function Get-GitHubRepositoryFromRemote {
  if (-not (Get-Command "git" -ErrorAction SilentlyContinue)) {
    return ""
  }

  $RemoteUrl = git config --get remote.origin.url 2>$null

  if (-not $RemoteUrl) {
    return ""
  }

  if ($RemoteUrl -match "github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$") {
    return "$($Matches.owner)/$($Matches.repo)"
  }

  return ""
}

function Get-GitHubRepositoryFromPackageJson {
  $PackagePath = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "package.json"

  if (-not (Test-Path $PackagePath)) {
    return ""
  }

  try {
    $Package = Get-Content -Raw $PackagePath | ConvertFrom-Json
    $Repository = $Package.repository

    if ($Repository -is [string]) {
      $Url = $Repository
    } elseif ($Repository.url) {
      $Url = $Repository.url
    } else {
      return ""
    }

    if ($Url -match "github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$") {
      return "$($Matches.owner)/$($Matches.repo)"
    }
  } catch {
    return ""
  }

  return ""
}

function Resolve-Repository {
  if ($env:MACA_HELPER_REPO) {
    return $env:MACA_HELPER_REPO
  }

  $FromRemote = Get-GitHubRepositoryFromRemote

  if ($FromRemote) {
    return $FromRemote
  }

  $FromPackage = Get-GitHubRepositoryFromPackageJson

  if ($FromPackage) {
    return $FromPackage
  }

  throw "No pude detectar el repo de GitHub. Ejecuta esto con MACA_HELPER_REPO=usuario/maca-helper o descarga el instalador desde GitHub Releases."
}

function Find-WindowsInstallerAsset {
  param([Parameter(Mandatory = $true)]$Release)

  $Assets = @($Release.assets)
  $Installer = $Assets |
    Where-Object { $_.name -match "\.(msi|exe)$" -and $_.name -notmatch "(setup\.nsis|sig|blockmap)" } |
    Sort-Object @{ Expression = { if ($_.name -match "\.msi$") { 0 } else { 1 } } }, name |
    Select-Object -First 1

  if (-not $Installer) {
    throw "La ultima release no tiene un instalador .msi o .exe publicado."
  }

  return $Installer
}

$Repository = Resolve-Repository
$Headers = @{ "User-Agent" = "maca-helper-installer" }
$ReleaseUrl = "https://api.github.com/repos/$Repository/releases/latest"

Write-Host "Maca Helper - instalador de usuario" -ForegroundColor Green
Write-Host "Repo: $Repository"
Write-Host "Buscando ultima release..."

$Release = Invoke-RestMethod -Uri $ReleaseUrl -Headers $Headers
$Asset = Find-WindowsInstallerAsset -Release $Release
$DownloadPath = Join-Path $env:TEMP $Asset.name

Write-Host "Descargando: $($Asset.name)" -ForegroundColor Cyan
Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $DownloadPath -Headers $Headers

Write-Host "Abriendo instalador..." -ForegroundColor Cyan
Start-Process -FilePath $DownloadPath -Wait

Write-Host "Instalacion finalizada." -ForegroundColor Green
