<#
.SYNOPSIS
Runs the Partner Integration CLI build followed by validate-and-package against a manifest directory.

.PARAMETER ManifestDirectory
Path to the folder containing integration.yaml (and optional publisher.json / assets).

.PARAMETER SkipBuild
Skip running npm run build when you know the CLI is already built.
#>
[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ManifestDirectory,

    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -Path $ManifestDirectory -PathType Container)) {
    throw "ManifestDirectory '$ManifestDirectory' does not exist or is not a directory."
}

$resolvedManifestDir = (Resolve-Path -Path $ManifestDirectory).Path
$cliRoot = Split-Path -Path $PSScriptRoot -Parent

Push-Location -Path $cliRoot
try {
    if (-not $SkipBuild) {
        Write-Host 'Running npm run build...' -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE."
        }
    }

    Write-Host "Validating and packaging manifest in '$resolvedManifestDir'..." -ForegroundColor Cyan
    node ./scripts/validate-and-package.mjs --cwd "$resolvedManifestDir"
    if ($LASTEXITCODE -ne 0) {
        throw "validate-and-package.mjs failed with exit code $LASTEXITCODE."
    }

    Write-Host 'Validation + packaging complete.' -ForegroundColor Green
}
finally {
    Pop-Location
}
