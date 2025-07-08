# Copyright (c) Microsoft Corporation.
# Licensed under the MIT License.

#!/usr/bin/env pwsh
# Azure deployment script for Dragon Copilot Extension
# This script deploys the sample extension to Azure Container Apps

param(
    [Parameter(Mandatory=$true)]
    [string]$ExtensionName,

    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "$ExtensionName-rg",

    [Parameter(Mandatory=$false)]
    [string]$Region = "East US",

    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId,

    [Parameter(Mandatory=$false)]
    [string]$EnvironmentSuffix = "dev",

    [switch]$Help
)

if ($Help) {
    Write-Host @"
Dragon Extension Azure Deployment Script

Usage:
  .\deploy-extension-azure.ps1 -ExtensionName "my-extension"
  .\deploy-extension-azure.ps1 -ExtensionName "my-extension" -ResourceGroup "custom-rg" -Region "West US 2"
  .\deploy-extension-azure.ps1 -ExtensionName "my-extension" -SubscriptionId "12345678-1234-1234-1234-123456789012"

Parameters:
  -ExtensionName       [Required] Name of the extension (used for app and resource naming)
  -ResourceGroup       [Optional] Resource group name (default: {ExtensionName}-rg)
  -Region              [Optional] Azure region (default: East US)
  -SubscriptionId      [Optional] Azure subscription ID (uses current if not specified)
  -EnvironmentSuffix   [Optional] Environment suffix for resource naming (default: dev)
  -Help                Show this help message

Examples:
  .\deploy-extension-azure.ps1 -ExtensionName "dragon-ext-001"
  .\deploy-extension-azure.ps1 -ExtensionName "prod-extension" -EnvironmentSuffix "prod" -Region "West US 2"

"@ -ForegroundColor Cyan
    exit 0
}

# Validate inputs
if (-not $ExtensionName) {
    Write-Error "ExtensionName is required. Use -Help for usage information."
    exit 1
}

# Validate extension name format (Azure naming requirements)
if ($ExtensionName -notmatch '^[a-z0-9][a-z0-9-]{1,32}[a-z0-9]$') {
    Write-Error "ExtensionName must be 3-34 characters, start and end with alphanumeric, and contain only lowercase letters, numbers, and hyphens."
    exit 1
}

$rootPath = Split-Path $PSScriptRoot -Parent
$extensionPath = Join-Path $rootPath "samples/DragonCopilot/Workflow/SampleExtension.Web"

# Validate extension source exists
if (-not (Test-Path $extensionPath)) {
    Write-Error "Sample Extension not found at: $extensionPath"
    exit 1
}

# Check if Azure CLI is available
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI is required but not found. Please install Azure CLI: https://aka.ms/install-azure-cli"
    exit 1
}

# Check if Docker is available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required but not found. Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
}

Write-Host "🐉 Deploying Dragon Extension to Azure Container Apps..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "Extension Name: $ExtensionName" -ForegroundColor Gray
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor Gray
Write-Host "Region: $Region" -ForegroundColor Gray
Write-Host "Environment Suffix: $EnvironmentSuffix" -ForegroundColor Gray
Write-Host "Source Path: $extensionPath" -ForegroundColor Gray

try {
    # Set subscription if provided
    if ($SubscriptionId) {
        Write-Host "`n🔄 Setting Azure subscription..." -ForegroundColor Yellow
        az account set --subscription $SubscriptionId
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to set subscription $SubscriptionId"
        }
        Write-Host "✅ Subscription set to: $SubscriptionId" -ForegroundColor Green
    } else {
        # Get current subscription
        $currentSub = az account show --query "id" -o tsv
        Write-Host "`n📋 Using current subscription: $currentSub" -ForegroundColor Gray
    }

    # Check if resource group exists, create if needed
    Write-Host "`n🏗️  Checking resource group..." -ForegroundColor Yellow
    $rgExists = az group exists --name $ResourceGroup
    if ($rgExists -eq "false") {
        Write-Host "Creating resource group '$ResourceGroup' in '$Region'..." -ForegroundColor Yellow
        az group create --name $ResourceGroup --location $Region
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create resource group $ResourceGroup"
        }
        Write-Host "✅ Resource group created successfully" -ForegroundColor Green
    } else {
        Write-Host "✅ Resource group '$ResourceGroup' already exists" -ForegroundColor Green
    }

    # Check if container app environment exists, create if needed
    $environmentName = "$ExtensionName-$EnvironmentSuffix-env"
    Write-Host "`n🌐 Checking container app environment..." -ForegroundColor Yellow

    $envExists = az containerapp env list --resource-group $ResourceGroup --query "[?name=='$environmentName'].name" -o tsv
    if (-not $envExists) {
        Write-Host "Creating container app environment '$environmentName'..." -ForegroundColor Yellow
        az containerapp env create `
            --name $environmentName `
            --resource-group $ResourceGroup `
            --location $Region
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create container app environment $environmentName"
        }
        Write-Host "✅ Container app environment created successfully" -ForegroundColor Green
    } else {
        Write-Host "✅ Container app environment '$environmentName' already exists" -ForegroundColor Green
    }

    # Create Azure Container Registry for the extension
    $registryName = ($ExtensionName -replace '-','') + "acr" + $EnvironmentSuffix
    $registryServer = "$registryName.azurecr.io"
    Write-Host "`n📦 Checking container registry..." -ForegroundColor Yellow

    $registryExists = az acr list --resource-group $ResourceGroup --query "[?name=='$registryName'].name" -o tsv
    if (-not $registryExists) {
        Write-Host "Creating container registry '$registryName'..." -ForegroundColor Yellow
        az acr create `
            --name $registryName `
            --resource-group $ResourceGroup `
            --location $Region `
            --sku Basic `
            --admin-enabled false
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create container registry $registryName"
        }
        Write-Host "✅ Container registry created successfully" -ForegroundColor Green
    } else {
        Write-Host "✅ Container registry '$registryName' already exists" -ForegroundColor Green
    }

    # Create managed identity for the container app
    $identityName = "$ExtensionName-$EnvironmentSuffix-identity"
    Write-Host "`n🔐 Checking managed identity..." -ForegroundColor Yellow

    $identityExists = az identity list --resource-group $ResourceGroup --query "[?name=='$identityName'].name" -o tsv
    if (-not $identityExists) {
        Write-Host "Creating managed identity '$identityName'..." -ForegroundColor Yellow
        az identity create `
            --name $identityName `
            --resource-group $ResourceGroup `
            --location $Region
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to create managed identity $identityName"
        }
        Write-Host "✅ Managed identity created successfully" -ForegroundColor Green
    } else {
        Write-Host "✅ Managed identity '$identityName' already exists" -ForegroundColor Green
    }

    # Get the managed identity details
    $identityId = az identity show --name $identityName --resource-group $ResourceGroup --query "id" -o tsv
    $principalId = az identity show --name $identityName --resource-group $ResourceGroup --query "principalId" -o tsv

    # Assign AcrPull role to the managed identity
    Write-Host "`n🔑 Configuring registry permissions..." -ForegroundColor Yellow
    $registryId = az acr show --name $registryName --resource-group $ResourceGroup --query "id" -o tsv

    # Check if role assignment already exists
    $roleExists = az role assignment list --assignee $principalId --scope $registryId --role "AcrPull" --query "[0].id" -o tsv
    if (-not $roleExists) {
        Write-Host "Assigning AcrPull role to managed identity..." -ForegroundColor Yellow
        Write-Host "Note: This may take a moment due to Azure AD propagation delays..." -ForegroundColor Gray

        # Retry role assignment with exponential backoff (managed identity propagation can take time)
        $maxRetries = 6
        $retryCount = 0
        $success = $false

        while ($retryCount -lt $maxRetries -and -not $success) {
            $waitTime = [Math]::Pow(2, $retryCount) * 10  # 10, 20, 40, 80, 160, 320 seconds

            if ($retryCount -gt 0) {
                Write-Host "Waiting $waitTime seconds before retry $retryCount/$maxRetries..." -ForegroundColor Gray
                Start-Sleep -Seconds $waitTime
            }

            az role assignment create `
                --assignee $principalId `
                --scope $registryId `
                --role "AcrPull" `
                2>$null

            if ($LASTEXITCODE -eq 0) {
                $success = $true
                Write-Host "✅ Registry permissions configured successfully" -ForegroundColor Green
            } else {
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    Write-Host "Role assignment failed (attempt $retryCount/$maxRetries). Retrying..." -ForegroundColor Yellow
                }
            }
        }

        if (-not $success) {
            throw "Failed to assign AcrPull role to managed identity after $maxRetries attempts. The managed identity may not be fully propagated in Azure AD yet. Please wait a few minutes and try again, or assign the role manually in the Azure Portal."
        }
    } else {
        Write-Host "✅ Registry permissions already configured" -ForegroundColor Green
    }

    # Build and push Docker image to ACR
    $imageName = "$registryServer/dragon-extension"
    $imageTag = "latest"
    $fullImageName = "${imageName}:${imageTag}"

    Write-Host "`n🔨 Building Docker image..." -ForegroundColor Yellow
    Write-Host "Image: $fullImageName" -ForegroundColor Gray
    Write-Host "Build Context: $rootPath" -ForegroundColor Gray
    Write-Host "Dockerfile: $extensionPath/Dockerfile" -ForegroundColor Gray

    # Build the Docker image
    docker build -t $fullImageName -f "$extensionPath/Dockerfile" $rootPath
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build Docker image"
    }
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green

    # Login to ACR using managed identity
    Write-Host "`n📦 Pushing image to Azure Container Registry..." -ForegroundColor Yellow
    az acr login --name $registryName
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to login to Azure Container Registry"
    }

    # Push the image
    docker push $fullImageName
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to push Docker image to ACR"
    }
    Write-Host "✅ Image pushed to registry successfully" -ForegroundColor Green

    # Deploy the extension using the pre-built image
    $containerAppName = "$ExtensionName-$EnvironmentSuffix"
    Write-Host "`n🚀 Deploying container app '$containerAppName'..." -ForegroundColor Yellow
    Write-Host "Using Image: $fullImageName" -ForegroundColor Gray
    Write-Host "Registry: $registryServer" -ForegroundColor Gray
    Write-Host "Managed Identity: $identityName" -ForegroundColor Gray

    az containerapp create `
        --name $containerAppName `
        --resource-group $ResourceGroup `
        --environment $environmentName `
        --image $fullImageName `
        --registry-server $registryServer `
        --registry-identity $identityId `
        --user-assigned $identityId `
        --target-port 8080 `
        --ingress external `
        --env-vars "ASPNETCORE_ENVIRONMENT=Production" "ASPNETCORE_URLS=http://+:8080" `
        --cpu 0.25 `
        --memory 0.5Gi `
        --min-replicas 0 `
        --max-replicas 3

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to deploy container app $containerAppName"
    }

    # Get the container app URL
    Write-Host "`n🔍 Retrieving container app details..." -ForegroundColor Yellow
    $containerAppUrl = az containerapp show `
        --name $containerAppName `
        --resource-group $ResourceGroup `
        --query "properties.configuration.ingress.fqdn" `
        -o tsv

    if (-not $containerAppUrl) {
        throw "Failed to retrieve container app URL"
    }

    # Test the deployment
    Write-Host "`n🔍 Testing deployment..." -ForegroundColor Yellow
    $healthUrl = "https://$containerAppUrl/health"
    $processUrl = "https://$containerAppUrl/v1/process"

    # Wait a moment for the app to start
    Start-Sleep -Seconds 10

    try {
        $healthResponse = Invoke-WebRequest -Uri $healthUrl -TimeoutSec 30 -ErrorAction SilentlyContinue
        if ($healthResponse.StatusCode -eq 200) {
            Write-Host "✅ Health check passed" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Health check returned status: $($healthResponse.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Health check failed (app may still be starting): $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "`n🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "`n📋 Deployment Summary:" -ForegroundColor White
    Write-Host "  Container App:     $containerAppName" -ForegroundColor Gray
    Write-Host "  Resource Group:    $ResourceGroup" -ForegroundColor Gray
    Write-Host "  Region:            $Region" -ForegroundColor Gray
    Write-Host "  Environment:       $environmentName" -ForegroundColor Gray

    Write-Host "`n🌐 URLs:" -ForegroundColor White
    Write-Host "  Extension URL:     https://$containerAppUrl" -ForegroundColor DarkCyan
    Write-Host "  Health Check:      $healthUrl" -ForegroundColor DarkCyan
    Write-Host "  Process Endpoint:  $processUrl" -ForegroundColor DarkCyan

    Write-Host "`n📊 Monitoring:" -ForegroundColor White
    Write-Host "  # View logs:" -ForegroundColor Gray
    Write-Host "  az containerapp logs show --name $containerAppName --resource-group $ResourceGroup --follow" -ForegroundColor DarkGray
    Write-Host "  # View in Azure Portal:" -ForegroundColor Gray
    Write-Host "  https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$ResourceGroup/providers/Microsoft.App/containerApps/$containerAppName" -ForegroundColor DarkGray

    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

} catch {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Error $_.Exception.Message

    Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Verify Azure CLI is logged in: az account show" -ForegroundColor Gray
    Write-Host "  2. Check subscription permissions for Container Apps and ACR" -ForegroundColor Gray
    Write-Host "  3. Ensure resource group name is unique and valid" -ForegroundColor Gray
    Write-Host "  4. Try a different region if quota issues occur" -ForegroundColor Gray
    Write-Host "  5. Check Azure CLI version: az --version" -ForegroundColor Gray
    Write-Host "  6. Verify Docker is running: docker --version" -ForegroundColor Gray

    exit 1
}
