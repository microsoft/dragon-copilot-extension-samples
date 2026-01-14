param(
    [switch]$SkipNodeInstall,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$minimumNodeVersion = [version]'22.20.0'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$cliRoot = Resolve-Path (Join-Path $scriptRoot '..')
$repoRoot = Split-Path $cliRoot -Parent

function Write-Section([string]$message) {
    Write-Host "`n=== $message ===" -ForegroundColor Cyan
}

function Get-NodeVersionOrNull {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) {
        return $null
    }

    $rawVersion = (& node --version) 2>$null
    if (-not $rawVersion) {
        return $null
    }

    $trimmed = $rawVersion.Trim()
    if ($trimmed.StartsWith('v')) {
        $trimmed = $trimmed.Substring(1)
    }

    try {
        return [version]$trimmed
    } catch {
        return $null
    }
}

function Install-NodeRuntime {
    $currentVersion = Get-NodeVersionOrNull
    if ($currentVersion -and $currentVersion -ge $minimumNodeVersion) {
        Write-Host "Node.js $($currentVersion.ToString()) detected." -ForegroundColor Green
        return
    }

    if ($currentVersion) {
        Write-Host "Node.js $($currentVersion.ToString()) detected, but version $($minimumNodeVersion.ToString()) or later is required." -ForegroundColor Yellow
    } else {
        Write-Host "Node.js not detected." -ForegroundColor Yellow
    }

    if ($SkipNodeInstall) {
        throw "Install Node.js $($minimumNodeVersion.ToString()) or later and re-run this script, or remove -SkipNodeInstall."
    }

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    $choco = Get-Command choco -ErrorAction SilentlyContinue

    if ($winget) {
        Write-Section "Installing Node.js via winget"
        $wingetArgs = @(
            'install',
            '--id', 'OpenJS.NodeJS',
            '--exact',
            '--silent',
            '--accept-package-agreements',
            '--accept-source-agreements'
        )
        & winget @wingetArgs
        if ($LASTEXITCODE -ne 0) {
            throw "winget failed to install Node.js (exit code $LASTEXITCODE)."
        }
    } elseif ($choco) {
        Write-Section "Installing Node.js via Chocolatey"
        & choco install nodejs --version $($minimumNodeVersion.ToString()) -y
        if ($LASTEXITCODE -ne 0) {
            throw "Chocolatey failed to install Node.js (exit code $LASTEXITCODE)."
        }
    } else {
        throw "Neither winget nor choco is available. Install Node.js manually (https://nodejs.org) and re-run the script."
    }

    $currentVersion = Get-NodeVersionOrNull
    if (-not $currentVersion -or $currentVersion -lt $minimumNodeVersion) {
        throw "Node.js installation did not succeed. Verify your environment and try again."
    }

    Write-Host "Node.js $($currentVersion.ToString()) installed successfully." -ForegroundColor Green
}

function Confirm-NpmAvailable {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCommand) {
        $version = (& npm --version) 2>$null
        Write-Host "npm $version detected." -ForegroundColor Green
        return
    }

    throw "npm command not found. Verify Node.js installation and PATH configuration."
}

function Invoke-Npm {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [string]$Description
    )

    if ($Description) {
        Write-Host $Description -ForegroundColor Yellow
    }

    & npm @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "npm command failed (exit code $LASTEXITCODE): npm $($Arguments -join ' ')"
    }
}

function Start-PartnerInit {
    Write-Section "Launching partner manifest wizard"
    & node (Join-Path $cliRoot 'dist/cli.js') partner init
}

function Invoke-OptionalPackaging {
    param(
        [string]$DefaultManifestDirectory
    )

    Write-Host ""
    $response = Read-Host "Run partner validate/package now? (y/N)"
    if (-not $response -or $response.Trim().ToLowerInvariant().StartsWith('y') -eq $false) {
        Write-Host "Skipping validation and packaging." -ForegroundColor Yellow
        return
    }

    $manifestDirectory = $DefaultManifestDirectory
    if ($manifestDirectory) {
        $userInput = Read-Host ("Manifest directory containing extension.yaml [default: {0}]" -f $manifestDirectory)
        if ($userInput) {
            $manifestDirectory = $userInput
        }
    }
    else {
        $manifestDirectory = Read-Host "Enter manifest directory containing extension.yaml"
    }

    if (-not $manifestDirectory) {
        Write-Host "Manifest directory not provided. Skipping validation and packaging." -ForegroundColor Yellow
        return
    }

    $resolvedManifest = Resolve-Path -Path $manifestDirectory -ErrorAction SilentlyContinue
    if (-not $resolvedManifest) {
        Write-Host ("Manifest directory not found: {0}" -f $manifestDirectory) -ForegroundColor Red
        return
    }

    $packageScript = Join-Path $scriptRoot 'build-validate-and-package.ps1'
    try {
        & $packageScript -ManifestDirectory $resolvedManifest.Path
    }
    catch {
        Write-Host "Packaging helper reported an error." -ForegroundColor Red
        throw
    }
}

Write-Section "Dragon Copilot standalone setup"
Write-Host "Repository root:" $repoRoot
Write-Host "CLI root:" $cliRoot

Install-NodeRuntime
Confirm-NpmAvailable

Push-Location $cliRoot
try {
    if (-not $SkipBuild) {
        Invoke-Npm -Arguments @('install') -Description "Installing CLI dependencies (npm install)..."
        Invoke-Npm -Arguments @('run', 'build') -Description "Building CLI (npm run build)..."
    } else {
        Write-Host "Skipping npm install/build as requested." -ForegroundColor Yellow
    }

    Invoke-Npm -Arguments @('link') -Description "Registering dragon-copilot command globally (npm link)..."
    Start-PartnerInit
    Invoke-OptionalPackaging
} finally {
    Pop-Location
}
