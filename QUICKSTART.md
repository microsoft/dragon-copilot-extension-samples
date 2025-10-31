#
# Quick Start Guide for Dragon Extension Developer

## 🚀 Getting Started (Choose One)

### Development Prerequisites
* DotNet 9
* Node 22.20.0
* npm 10.9.3

### Generate Manifests with the CLI
Use the unified `dragon-copilot` CLI to create and validate manifest version 3 definitions that now support automation scripts, event triggers, and dependency metadata.

```powershell
cd tools/dragon-copilot-cli
npm install
npm run build
npm link

# Interactive extension wizard (prompts for scripts/triggers/dependencies)
dragon-copilot extension init

# Validate both extension and publisher configuration together
dragon-copilot extension validate ./extension.yaml

# Partner manifest workflow
dragon-copilot partner init
dragon-copilot partner validate ./integration.yaml
```

> Tip: The wizard ensures `manifestVersion: 3` is set and collects automation metadata so the generated YAML aligns with the new schema shipped in this repository.

### Local Development Environment
1. Clone the repository
1. Open a terminal and navigate to `samples/DragonCopilot/Workflow/SampleExtension.Web`
1. Issue a `dotnet run`

The application will start and be available at http://localhost:5181

### Call the endpoint
You can make use of the [SampleExtension.Web.http](./samples/DragonCopilot/Workflow/SampleExtension.Web/SampleExtension.Web.http) file in the sample project to make a call. It contains a sample invocation for an extension listening for `Note` content.

You should see an output similar to the following:
```
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Date: Mon, 06 Oct 2025 13:20:44 GMT
Server: Kestrel
Transfer-Encoding: chunked

{
    "success": true,
    "message": "Payload processed successfully",
    "payload": {
    "sample-entities": {
        "schema_version": "0.1",
        "document": {
        "title": "Outpatient Note",
        "type": {
            "text": "string"
        }
        },
        "resources": []
    },
    "adaptive-card": {
        // abbreviated
    }
}
```

## ☁️ Deploy to Azure (Production Ready)

### Prerequisites for Azure Deployment
- Docker Desktop installed and running
- Azure subscription with Container Apps deployed
- Container registry with permissions granted to the Container Apps identity

### Steps

#### 1. Build the Docker Image
From the **repository root directory**, build the Docker image:

```powershell
# Build the Docker image
docker build -f samples/DragonCopilot/Workflow/SampleExtension.Web/Dockerfile -t dragon-extension:latest .
```

> **Note**: The Dockerfile must be built from the repository root because it references files from both `src/Dragon.Copilot.Models/` and `samples/DragonCopilot/Workflow/SampleExtension.Web/`.

#### 2. Test the Docker Image Locally (Optional but Recommended)
```powershell
# Run the container locally
docker run -p 5181:8080 dragon-extension:latest

# Test the health endpoint
curl http://localhost:5181/health
```

#### 3. Tag and Push to Azure Container Registry
```powershell
# Login to Azure
az login

# Login to your Azure Container Registry
az acr login --name <your-registry-name>

# Tag the image for your registry
docker tag dragon-extension:latest <your-registry-name>.azurecr.io/dragon-extension:latest

# Push the image
docker push <your-registry-name>.azurecr.io/dragon-extension:latest
```

#### 4. Deploy to Azure Container Apps
```powershell
# Create or update the container app
az containerapp update `
  --name <your-container-app-name> `
  --resource-group <your-resource-group> `
  --image <your-registry-name>.azurecr.io/dragon-extension:latest

# Verify deployment
az containerapp show `
  --name <your-container-app-name> `
  --resource-group <your-resource-group> `
  --query "properties.latestRevisionFqdn" `
  --output tsv
```

#### 5. Configure Environment Variables (Production)
For production deployments, configure authentication and other settings:

```powershell
az containerapp update `
  --name <your-container-app-name> `
  --resource-group <your-resource-group> `
  --set-env-vars `
    ASPNETCORE_ENVIRONMENT=Production `
    Authentication__Enabled=true `
    Authentication__TenantId=<your-entra-tenant-id> `
    Authentication__ClientId=<your-entra-client-id> `
    Authentication__Instance=https://login.microsoftonline.com/
```

See [Authentication.md](./doc/Authentication.md) for detailed authentication configuration.

#### 6. Verify Production Deployment
```powershell
# Get the FQDN
$fqdn = az containerapp show `
  --name <your-container-app-name> `
  --resource-group <your-resource-group> `
  --query "properties.latestRevisionFqdn" `
  --output tsv

# Test the health endpoint
curl "https://$fqdn/health"

# View logs
az containerapp logs show `
  --name <your-container-app-name> `
  --resource-group <your-resource-group> `
  --follow
```

## 📋 What the Service Does

### Sample Extension (Port 5181)
- Example implementation of a Dragon Copilot extension
- Shows proper request/response handling for Dragon Copilot integration
- Includes health check endpoints
- Demonstrates error handling patterns
- Provides comprehensive API documentation via Swagger

## 🔍 Troubleshooting

### Services Won't Start
- Check .NET 9.0 SDK is installed: `dotnet --version`
- Make sure that you have nuget available as default source: `dotnet nuget add source https://api.nuget.org/v3/index.json -n nuget.org`
- Ensure port 5181 is free

### Integration Tests Fail
- Verify the extension is running and healthy
- Check extension logs in terminal window
- Test extension directly using the HTTP test file

## 📚 Next Steps

1. **Explore the APIs**: Use Swagger UI to understand the interfaces
3. **Create Your Extension**: Use `samples/DragonCopilot/Workflow/SampleExtension.Web` as a starting point
4. **Customize Business Logic**: Modify `ProcessingService.cs` for your needs
5. **Add Your Tests**: Extend the http test suite for your scenarios

## 🎉 You're Ready!

Your Dragon Extension Developer environment is now set up and ready for development. Start building your custom extensions and test them locally before deploying to Dragon Copilot.

For detailed documentation, see the individual README files in each project folder.
