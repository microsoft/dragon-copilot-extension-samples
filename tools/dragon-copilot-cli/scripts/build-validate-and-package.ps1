param(
    [Parameter(Mandatory = $true)]
    [string]$ManifestDirectory,

    [string]$OutputPath,

    [switch]$SkipBuild,

    [switch]$SkipValidate
)

$ErrorActionPreference = 'Stop'

$cliRoot = Split-Path -Parent $PSScriptRoot

Write-Host "📦 Dragon Copilot Partner Packaging Helper" -ForegroundColor Cyan
Write-Host "📁 CLI root:" $cliRoot

Push-Location $cliRoot
try {
    if (-not $SkipBuild) {
        Write-Host "\n🔧 Ensuring CLI is built (npm install && npm run build)..." -ForegroundColor Yellow
        npm install | Out-Null
        npm run build | Out-Null
        Write-Host "✅ CLI build complete." -ForegroundColor Green
    }
    else {
        Write-Host "\n⏭️  SkipBuild specified - using existing build output." -ForegroundColor Yellow
    }

    if (-not (Test-Path $ManifestDirectory)) {
        throw "Manifest directory not found: $ManifestDirectory"
    }

    $resolvedManifestDirectory = (Resolve-Path $ManifestDirectory).Path
    Write-Host "\n🗂️  Preparing manifest workspace:" $resolvedManifestDirectory

    Push-Location $resolvedManifestDirectory
    try {
        $manifestPath = Join-Path $PWD 'integration.yaml'
        $publisherPath = Join-Path $PWD 'publisher.json'
        $logoPath = Join-Path $PWD 'assets/logo_large.png'

        if (-not (Test-Path $manifestPath)) {
            throw "integration.yaml not found in $resolvedManifestDirectory"
        }

        if (-not (Test-Path $publisherPath)) {
            throw "publisher.json not found in $resolvedManifestDirectory"
        }

        if (-not (Test-Path $logoPath)) {
            throw "assets/logo_large.png not found. Run the manifest builder's Assets Helper or add your branded logo (PNG, 216-350px square)."
        }

        if (-not $SkipValidate) {
            Write-Host "\n✅ Running manifest validation..." -ForegroundColor Yellow
            node (Join-Path $cliRoot 'dist/cli.js') partner validate $manifestPath
            Write-Host "📄 Validation complete." -ForegroundColor Green
        }
        else {
            Write-Host "\n⏭️  SkipValidate specified - skipping validation." -ForegroundColor Yellow
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
            Write-Host "\n📦 Packaging to: $resolvedOutput" -ForegroundColor Yellow
        }
        else {
            Write-Host "\n📦 Packaging with default output name (manifestName-version.zip)." -ForegroundColor Yellow
        }

        node (Join-Path $cliRoot 'dist/cli.js') @packageArgs
        Write-Host "\n🎉 Package created successfully." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}
