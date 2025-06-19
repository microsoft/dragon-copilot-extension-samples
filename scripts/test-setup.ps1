#!/usr/bin/env pwsh
# Quick validation script to test that both services are running and integrated properly
# Run this after starting the services with start-dev.ps1

param(
    [switch]$Verbose,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Dragon Extension Developer - Quick Test Script

Usage:
  .\test-setup.ps1              Run basic integration tests
  .\test-setup.ps1 -Verbose     Run tests with detailed output
  .\test-setup.ps1 -Help        Show this help message

Prerequisites:
  - Both services running (use .\start-dev.ps1)
  - Dragon Backend Simulator on http://localhost:5180
  - Sample Extension on http://localhost:5181

"@ -ForegroundColor Cyan
    exit 0
}

$simulatorUrl = "http://127.0.0.1:5180"
$extensionUrl = "http://127.0.0.1:5181"

Write-Host "🧪 Dragon Extension Developer - Quick Test Suite" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor DarkGray

# Test 1: Extension Health Check
Write-Host "`n1️⃣  Testing Sample Extension Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$extensionUrl/health" -Method GET -TimeoutSec 5
    if ($response -and ($response.status -eq "healthy" -or $response.PSObject.Properties.Name -contains "status")) {
        Write-Host "   ✅ Sample Extension is healthy" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "   📋 Service: $($response.service)" -ForegroundColor Gray
            Write-Host "   📋 Version: $($response.version)" -ForegroundColor Gray
            Write-Host "   📋 Status: $($response.status)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  Sample Extension returned unexpected response format" -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host "   📋 Full response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Sample Extension health check failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($Verbose) {
        Write-Host "   📋 Make sure the extension is running on $extensionUrl" -ForegroundColor Gray
    }
    exit 1
}

# Test 2: Simulator Health Check  
Write-Host "`n2️⃣  Testing Dragon Backend Simulator..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$simulatorUrl/health" -Method GET -TimeoutSec 5
    if ($response -and ($response.status -eq "healthy" -or $response.PSObject.Properties.Name -contains "status")) {
        Write-Host "   ✅ Dragon Backend Simulator is healthy" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "   📋 Service: $($response.service)" -ForegroundColor Gray
            Write-Host "   📋 Status: $($response.status)" -ForegroundColor Gray
            Write-Host "   📋 Swagger UI available at: $simulatorUrl/" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  Dragon Backend Simulator returned unexpected response format" -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host "   📋 Full response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Dragon Backend Simulator health check failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($Verbose) {
        Write-Host "   📋 Make sure the simulator is running on $simulatorUrl" -ForegroundColor Gray
    }
    exit 1
}

# Test 3: Extension Echo Test
Write-Host "`n3️⃣  Testing Extension Echo Endpoint..." -ForegroundColor Yellow
try {
    $testMessage = "Quick test message"
    $response = Invoke-RestMethod -Uri "$extensionUrl/api/process/echo" -Method POST -Body "`"$testMessage`"" -ContentType "application/json" -TimeoutSec 5
    if ($response.originalMessage -eq $testMessage -and $response.echoedMessage -eq "Echo: $testMessage") {
        Write-Host "   ✅ Echo endpoint working correctly" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "   📋 Original: $($response.originalMessage)" -ForegroundColor Gray
            Write-Host "   📋 Echoed: $($response.echoedMessage)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  Echo endpoint returned unexpected response format" -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host "   📋 Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Echo endpoint test failed: $_" -ForegroundColor Red
}

# Test 4: Direct Extension Processing
Write-Host "`n4️⃣  Testing Direct Extension Processing..." -ForegroundColor Yellow
try {
    $testRequest = @{
        requestId = [System.Guid]::NewGuid().ToString()
        data = "Quick setup validation test"
        metadata = @{
            source = "QuickTestScript"
            timestamp = (Get-Date).ToString("o")
        }
    }
    
    $body = $testRequest | ConvertTo-Json -Depth 3
    $response = Invoke-RestMethod -Uri "$extensionUrl/api/process" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5
    
    if ($response.success -eq $true) {
        Write-Host "   ✅ Direct processing working correctly" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "   📋 Request ID: $($response.requestId)" -ForegroundColor Gray
            Write-Host "   📋 Message: $($response.message)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️  Direct processing returned success=false" -ForegroundColor Yellow
        if ($Verbose) {
            Write-Host "   📋 Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Direct processing test failed: $_" -ForegroundColor Red
    if ($Verbose) {
        Write-Host "   📋 Error details: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

# Test 5: Full Integration Test (Simulator -> Extension)
Write-Host "`n5️⃣  Testing Full Integration (Simulator → Extension)..." -ForegroundColor Yellow
try {
    $encounterRequest = @{
        name = "Quick Test Encounter"
        description = "Automated test encounter created by test script"
    }
    
    $body = $encounterRequest | ConvertTo-Json
    $createResponse = Invoke-RestMethod -Uri "$simulatorUrl/api/encounters:simulate" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    
    if ($createResponse.id) {
        Write-Host "   ✅ Encounter created successfully (ID: $($createResponse.id))" -ForegroundColor Green
       
        if ($createResponse.status -eq "Completed") {
            Write-Host "   ✅ Integration test successful - encounter was completed by extension!" -ForegroundColor Green
            if ($Verbose) {
                Write-Host "   📋 Encounter Status: $createResponse.status" -ForegroundColor Gray
                Write-Host "   📋 Created At: $($createResponse.createdAt)" -ForegroundColor Gray
                if ($createResponse.completedAt) {
                    Write-Host "   📋 Completed At: $($createResponse.completedAt)" -ForegroundColor Gray
                }
            }
        } elseif ($createResponse.status -eq "Created") {
            Write-Host "   ⚠️  Encounter created but status shows 'Created' - extension may not have been called" -ForegroundColor Yellow
            Write-Host "      This might indicate the simulator couldn't reach the extension" -ForegroundColor Yellow
        } elseif ($createResponse.status -eq "Failed") {
            Write-Host "   ❌ Encounter processing failed" -ForegroundColor Red
            if ($createResponse.errorMessage) {
                Write-Host "      Error: $($createResponse.errorMessage)" -ForegroundColor Red
            }
        } else {
            Write-Host "   ⚠️  Unexpected encounter status: $createResponse.status" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Failed to create encounter - no ID returned" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Integration test failed: $_" -ForegroundColor Red
    if ($Verbose) {
        Write-Host "   📋 Error details: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

# Summary
Write-Host "`n🎯 Test Summary" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "✅ If all tests passed, your setup is working correctly!" -ForegroundColor Green
Write-Host "🌐 Access points:" -ForegroundColor White
Write-Host "   • Extension Swagger UI: $extensionUrl/" -ForegroundColor Cyan
Write-Host "   • Extension Health: $extensionUrl/health" -ForegroundColor Cyan
Write-Host "   • Simulator Swagger UI: $simulatorUrl/" -ForegroundColor Cyan
Write-Host "   • Simulator API: $simulatorUrl/api/encounters:simulate" -ForegroundColor Cyan
Write-Host "   • Integration Tests: testing/integration-tests.http" -ForegroundColor Cyan

Write-Host "`n📝 Next Steps:" -ForegroundColor White
Write-Host "   1. Explore the API endpoints above" -ForegroundColor Gray
Write-Host "   2. Run the full integration test suite in testing/integration-tests.http" -ForegroundColor Gray
Write-Host "   3. Create your own extension based on the sample" -ForegroundColor Gray
Write-Host "   4. Start building your custom business logic!" -ForegroundColor Gray

Write-Host "`n🚀 Happy Extension Development!" -ForegroundColor Green
