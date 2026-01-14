param(
    [Parameter(Mandatory = $true)]
    [string]$ManifestDirectory,

    [string]$OutputPath,

    [switch]$SkipBuild,

    [switch]$SkipValidate
)

$ErrorActionPreference = 'Stop'

$cliRoot = Split-Path -Parent $PSScriptRoot

Write-Host "=== Dragon Copilot Partner Packaging Helper ===" -ForegroundColor Cyan
Write-Host ("CLI root: {0}" -f $cliRoot)

Push-Location $cliRoot
try {
    if (-not $SkipBuild) {
        Write-Host ""
        Write-Host "Building CLI (npm install; npm run build)..." -ForegroundColor Yellow
        npm install | Out-Null
        npm run build | Out-Null
        Write-Host "CLI build complete." -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "SkipBuild specified - using existing build output." -ForegroundColor Yellow
    }

    if (-not (Test-Path $ManifestDirectory)) {
        throw "Manifest directory not found: $ManifestDirectory"
    }

    $resolvedManifestDirectory = (Resolve-Path $ManifestDirectory).Path
    Write-Host ""
    Write-Host ("Preparing manifest workspace: {0}" -f $resolvedManifestDirectory)

    Push-Location $resolvedManifestDirectory
    try {
        $manifestPath = Join-Path $PWD 'extension.yaml'
        $publisherPath = Join-Path $PWD 'publisher.json'
        $logoPath = Join-Path $PWD 'assets/logo_large.png'

        if (-not (Test-Path $manifestPath)) {
            throw "extension.yaml not found in $resolvedManifestDirectory"
        }

        if (-not (Test-Path $publisherPath)) {
            throw "publisher.json not found in $resolvedManifestDirectory"
        }

        if (-not (Test-Path $logoPath)) {
            throw "assets/logo_large.png not found. Run the manifest builder Assets Helper or add your branded logo (PNG, 216-350px square)."
        }

        if (-not $SkipValidate) {
            Write-Host ""
            Write-Host "Running manifest validation..." -ForegroundColor Yellow
            node (Join-Path $cliRoot 'dist/cli.js') partner validate $manifestPath

            $validationExitCode = $LASTEXITCODE
            if ($validationExitCode -ne 0) {
                throw "Manifest validation failed (exit code $validationExitCode). See CLI output for details."
            }

            Write-Host "Validation complete." -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "SkipValidate specified - skipping validation." -ForegroundColor Yellow
        }

        $packageArgs = @('partner', 'package')
        if ($OutputPath) {
            $resolvedOutput = Resolve-Path -Path $OutputPath -ErrorAction SilentlyContinue
            if ($null -eq $resolvedOutput) {
                $resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath, $resolvedManifestDirectory)
            }
            else {
                $resolvedOutput = $resolvedOutput.Path
            }
            $packageArgs += @('--output', $resolvedOutput)
            Write-Host ""
            Write-Host ("Packaging to: {0}" -f $resolvedOutput) -ForegroundColor Yellow
        }
        else {
            Write-Host ""
            Write-Host "Packaging with default output name (manifestName-version.zip)." -ForegroundColor Yellow
        }

        node (Join-Path $cliRoot 'dist/cli.js') @packageArgs

        $packageExitCode = $LASTEXITCODE
        if ($packageExitCode -ne 0) {
            throw "Packaging failed (exit code $packageExitCode). See CLI output for details."
        }

        Write-Host ""
        Write-Host "Package created successfully." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}
