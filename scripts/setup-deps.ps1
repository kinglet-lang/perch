# Link bootstrap compiler tree for GN (Windows).
# Usage: .\scripts\setup-deps.ps1
#        $env:BOOTSTRAP_ROOT = 'F:\code\KPL\bootstrap'; .\scripts\setup-deps.ps1

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Bootstrap = if ($env:BOOTSTRAP_ROOT) { $env:BOOTSTRAP_ROOT } else { Join-Path $Root '..\bootstrap' }
$Bootstrap = (Resolve-Path $Bootstrap).Path

if (-not (Test-Path (Join-Path $Bootstrap 'BUILD.gn'))) {
  Write-Error "bootstrap not found at $Bootstrap"
}

function Set-Junction([string]$Name, [string]$Target) {
  $Path = Join-Path $Root $Name
  if (Test-Path $Path) {
    Remove-Item $Path -Recurse -Force
  }
  New-Item -ItemType Junction -Path $Path -Target $Target | Out-Null
  Write-Host "linked $Name -> $Target"
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'build') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'third_party') | Out-Null

Set-Junction 'third_party\bootstrap' $Bootstrap
Set-Junction 'build\config' (Join-Path $Bootstrap 'build\config')
Set-Junction 'build\toolchain' (Join-Path $Bootstrap 'build\toolchain')
Set-Junction 'src' (Join-Path $Bootstrap 'src')

Write-Host "bootstrap linked from $Bootstrap"
