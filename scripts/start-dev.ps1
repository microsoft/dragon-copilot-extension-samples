# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

#!/usr/bin/env pwsh
# Quick start script for Dragon Copilot Extension Developer environment
# This script starts the Sample Extension for development

param(
    [switch]$Help,
    [switch]$StopAll
)

if ($Help) {
    Write-Host @"
Dragon Extension Developer - Quick Start Script

Usage:
  .\start-dev.ps1              Start the sample extension in development mode
  .\start-dev.ps1 -StopAll     Stop all running services
  .\start-dev.ps1 -Help        Show this help message

Services:
  - Sample Extension Swagger: http://localhost:5181/

"@ -ForegroundColor Cyan
    exit 0
}

if ($StopAll) {
    Write-Host "Stopping all Dragon Extension Developer services..." -ForegroundColor Yellow

    # Stop processes listening on our ports
    $ports = @(5181)
    foreach ($port in $ports) {
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                    Select-Object -ExpandProperty OwningProcess |
                    Get-Process -Id { $_ } -ErrorAction SilentlyContinue

        if ($processes) {
            Write-Host "Stopping processes on port $port..." -ForegroundColor Gray
            $processes | Stop-Process -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host "All services stopped." -ForegroundColor Green
    exit 0
}

$rootPath = Split-Path $PSScriptRoot -Parent

# Check if .NET is available
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Error ".NET SDK is required but not found. Please install .NET 9.0 SDK or later."
    exit 1
}

Write-Host "🐉 Starting Dragon Extension Developer Environment..." -ForegroundColor Green
Write-Host "Root path: $rootPath" -ForegroundColor Gray

# Check if ports are available
$ports = @(5181)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Warning "Port $port is already in use. Run with -StopAll to stop existing services first."
        exit 1
    }
}

try {
    # Start the Sample Extension
    Write-Host "🔧 Starting Sample Extension on http://localhost:5181..." -ForegroundColor Yellow
    $extensionPath = Join-Path $rootPath "samples/DragonCopilot/Workflow/SampleExtension.Web"

    if (-not (Test-Path $extensionPath)) {
        Write-Error "Sample Extension not found at: $extensionPath"
        exit 1
    }

    $extensionJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        dotnet run --urls "http://localhost:5181"
    } -ArgumentList $extensionPath

    # Wait for services to start and retry health checks
    Write-Host "`n⏳ Waiting for service to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 5

    # Retry health checks multiple times
    $maxRetries = 3
    $retryDelay = 2
    $extensionHealthy = $false

    for ($retry = 1; $retry -le $maxRetries; $retry++) {
        Write-Host "🔍 Health check attempt $retry/$maxRetries..." -ForegroundColor Gray

        # Check Sample Extension
        if (-not $extensionHealthy) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:5181" -TimeoutSec 5 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $extensionHealthy = $true
                }
            } catch { }
        }

        # If service is healthy, break out of retry loop
        if ($extensionHealthy) {
            break
        }

        # Wait before next retry (except on last attempt)
        if ($retry -lt $maxRetries) {
            Start-Sleep -Seconds $retryDelay
        }
    }

    Write-Host "`n✅ Dragon Extension Developer Environment Started!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

    if ($extensionHealthy) {
        Write-Host "🟢 Sample Extension Swagger: http://localhost:5181/" -ForegroundColor DarkMagenta
    } else {
        Write-Host "🟡 Sample Extension Swagger: http://localhost:5181/ (starting...)" -ForegroundColor DarkMagenta
    }

    Write-Host "`n📋 Quick Test Commands:" -ForegroundColor White
    Write-Host "• Test extension directly: Send POST requests to http://localhost:5181/v1/process" -ForegroundColor Gray
    Write-Host "• Stop services:           .\start-dev.ps1 -StopAll" -ForegroundColor Gray
    Write-Host "• View logs:               Check the job outputs below" -ForegroundColor Gray

    Write-Host "`n🚀 Ready for development! Press Ctrl+C to stop the service." -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

    # Monitor jobs and display output
    while ($extensionJob.State -eq "Running") {
        Start-Sleep -Seconds 1

        # Check for job output
        $extensionOutput = Receive-Job $extensionJob -ErrorAction SilentlyContinue

        if ($extensionOutput) {
            # Handle each line of output separately to preserve newlines
            $extensionOutput | ForEach-Object {
                if ($_ -and $_.ToString().Trim()) {
                    Write-Host "[Extension] $_" -ForegroundColor DarkMagenta
                }
            }
        }
    }

} catch {
    Write-Error "Failed to start services: $_"
} finally {
    # Cleanup jobs
    if ($extensionJob) {
        $extensionJob | Stop-Job -PassThru | Remove-Job -Force
    }

    Write-Host "`n👋 Dragon Extension Developer Environment stopped." -ForegroundColor Yellow
}
