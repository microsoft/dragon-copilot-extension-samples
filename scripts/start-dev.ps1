#!/usr/bin/env pwsh
# Quick start script for Dragon Extension Developer environment
# This script starts both the Dragon Backend Simulator and Sample Extension for development

param(
    [switch]$Help,
    [switch]$StopAll
)

if ($Help) {
    Write-Host @"
Dragon Extension Developer - Quick Start Script

Usage:
  .\start-dev.ps1              Start both services in development mode
  .\start-dev.ps1 -StopAll     Stop all running services
  .\start-dev.ps1 -Help        Show this help message

Services:
  - Dragon Backend Simulator: http://localhost:5180/
  - Sample Extension Swagger: http://localhost:5181/

"@ -ForegroundColor Cyan
    exit 0
}

if ($StopAll) {
    Write-Host "Stopping all Dragon Extension Developer services..." -ForegroundColor Yellow
    
    # Stop processes listening on our ports
    $ports = @(5180, 5181)
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
$ports = @(5180, 5181)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Warning "Port $port is already in use. Run with -StopAll to stop existing services first."
        exit 1
    }
}

try {
    # Start the Dragon Backend Simulator
    Write-Host "`n📡 Starting Dragon Backend Simulator on http://localhost:5180..." -ForegroundColor Yellow
    $simulatorPath = Join-Path $rootPath "DragonBackendSimulator/DragonBackendSimulator.Web"
    
    if (-not (Test-Path $simulatorPath)) {
        Write-Error "Dragon Backend Simulator not found at: $simulatorPath"
        exit 1
    }
    
    $simulatorJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        dotnet run --urls "http://localhost:5180"
    } -ArgumentList $simulatorPath
    
    # Wait a moment for the first service to start
    Start-Sleep -Seconds 3
    
    # Start the Sample Extension
    Write-Host "🔧 Starting Sample Extension on http://localhost:5181..." -ForegroundColor Yellow
    $extensionPath = Join-Path $rootPath "samples/DragonCopilot/Workflow/SampleExtension.Web"
    
    if (-not (Test-Path $extensionPath)) {
        Write-Error "Sample Extension not found at: $extensionPath"
        $simulatorJob | Stop-Job -PassThru | Remove-Job
        exit 1
    }
    
    $extensionJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        dotnet run --urls "http://localhost:5181"
    } -ArgumentList $extensionPath
      # Wait for services to start and retry health checks
    Write-Host "`n⏳ Waiting for services to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    # Retry health checks multiple times
    $maxRetries = 3
    $retryDelay = 2
    $simulatorHealthy = $false
    $extensionHealthy = $false
    
    for ($retry = 1; $retry -le $maxRetries; $retry++) {
        Write-Host "🔍 Health check attempt $retry/$maxRetries..." -ForegroundColor Gray
        
        # Check Dragon Backend Simulator
        if (-not $simulatorHealthy) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:5180" -TimeoutSec 5 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $simulatorHealthy = $true
                }
            } catch { }
        }
        
        # Check Sample Extension
        if (-not $extensionHealthy) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:5181" -TimeoutSec 5 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    $extensionHealthy = $true
                }
            } catch { }
        }
        
        # If both services are healthy, break out of retry loop
        if ($simulatorHealthy -and $extensionHealthy) {
            break
        }
        
        # Wait before next retry (except on last attempt)
        if ($retry -lt $maxRetries) {
            Start-Sleep -Seconds $retryDelay
        }
    }
    Write-Host "`n✅ Dragon Extension Developer Environment Started!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
      if ($simulatorHealthy) {
        Write-Host "🟢 Dragon Backend Simulator: http://localhost:5180/" -ForegroundColor DarkCyan
    } else {
        Write-Host "🟡 Dragon Backend Simulator: http://localhost:5180/ (starting...)" -ForegroundColor DarkCyan
    }
    
    if ($extensionHealthy) {
        Write-Host "🟢 Sample Extension Swagger: http://localhost:5181/" -ForegroundColor DarkMagenta
    } else {
        Write-Host "🟡 Sample Extension Swagger: http://localhost:5181/ (starting...)" -ForegroundColor DarkMagenta
    }
    
    Write-Host "`n📋 Quick Test Commands:" -ForegroundColor White
    Write-Host "• Test integration: Import testing/integration-tests.http in VS Code" -ForegroundColor Gray
    Write-Host "• Stop services:    .\start-dev.ps1 -StopAll" -ForegroundColor Gray
    Write-Host "• View logs:        Check the job outputs below" -ForegroundColor Gray
    
    Write-Host "`n🚀 Ready for development! Press Ctrl+C to stop all services." -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
      # Monitor jobs and display output
    while ($simulatorJob.State -eq "Running" -and $extensionJob.State -eq "Running") {
        Start-Sleep -Seconds 1
        
        # Check for job output
        $simulatorOutput = Receive-Job $simulatorJob -ErrorAction SilentlyContinue
        $extensionOutput = Receive-Job $extensionJob -ErrorAction SilentlyContinue
        
        if ($simulatorOutput) {
            # Handle each line of output separately to preserve newlines
            $simulatorOutput | ForEach-Object {
                if ($_ -and $_.ToString().Trim()) {
                    Write-Host "[Simulator] $_" -ForegroundColor DarkCyan
                }
            }
        }
        
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
    if ($simulatorJob) {
        $simulatorJob | Stop-Job -PassThru | Remove-Job -Force
    }
    if ($extensionJob) {
        $extensionJob | Stop-Job -PassThru | Remove-Job -Force
    }
    
    Write-Host "`n👋 Dragon Extension Developer Environment stopped." -ForegroundColor Yellow
}
