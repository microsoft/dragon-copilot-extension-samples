# Dragon Copilot Extension Samples – Quick Start

Jump straight into development with the three entry points shipped in this repository:

- **Dragon Extension CLI** – scaffold, validate, and package Dragon Copilot extensions.
- **Partner Integration CLI** – build embedded partner manifests with the guided wizard or web builder.
- **Sample Extension Web API** – reference ASP.NET Core host implementing `/v1/process`.

Choose one path or explore them all—each shares common models and tooling.

## 🔧 Prerequisites

- .NET 9 SDK
- Node.js 22.20.0
- npm 10.9.3
- Docker Desktop (for container builds)

> Use a PowerShell shell on Windows. Commands assume the repository root unless noted.

## 1. Dragon Extension CLI in Five Minutes

```powershell
cd tools/dragon-extension-cli
npm install
npm run build
node dist/cli.js init      # or npm link && dragon-extension init
```

During `init` the shared prompts from `@dragon-copilot/cli-common` help you:

- Name and describe the extension with schema-backed validation.
- Capture Azure Entra tenant information for authentication.
- Configure tools with multi-select data inputs and repeatable output definitions.
- Generate `publisher.json` alongside the manifest and a starter logo inside `assets/`.

Continue with validation and packaging when ready:

```powershell
node dist/cli.js validate extension.yaml
node dist/cli.js package --output my-extension.zip
npm test
```

Artifacts emitted in the working directory:

- `extension.yaml`
- `publisher.json`
- `assets/logo_large.png` (replace before publishing)

## 2. Partner Integration CLI Walkthrough

```powershell
cd tools/partner-integration-cli
npm install
npm run build
node dist/cli.js init
```

Key experience highlights after the latest refactors:

- Clean partner ID, issuer, and token prompts with no placeholder GUIDs.
- Note section mapping handled through a single multi-select per section (no repetitive prompts).
- Client authentication flow now asks whether collected user/customer identity claims are required.
- SMART on FHIR and Token Launch setup clearly labels default issuer questions.
- Context retrieval defaults include `ehr-user_id`, aligning with Interop guidance.

Wrap up with validation, packaging, or automated workflows:

```powershell
node dist/cli.js validate integration.yaml
node dist/cli.js package --include assets/
npm test                        # includes bootstrapAssetsDirectory coverage
```

Generated assets match the extension CLI layout:

- `integration.yaml`
- `publisher.json`
- `assets/logo_large.png`

Prefer a visual experience? Open `tools/partner-integration-cli/web/index.html` in a browser for the single-page manifest builder that mirrors the CLI prompts.

## 3. Sample Extension Web API

```powershell
cd samples/DragonCopilot/Workflow/SampleExtension.Web
dotnet restore
dotnet run
```

The service listens on `http://localhost:5181`. Validate the endpoints:

```powershell
curl http://localhost:5181/health
```

Use the ready-made [SampleExtension.Web.http](./samples/DragonCopilot/Workflow/SampleExtension.Web/SampleExtension.Web.http) file to send sample `/v1/process` requests that demonstrate note processing responses.

### Deploy to Azure Container Apps

```powershell
# from repository root
docker build -f samples/DragonCopilot/Workflow/SampleExtension.Web/Dockerfile -t dragon-extension:latest .
docker run -p 5181:8080 dragon-extension:latest

az login
az acr login --name <registry>
docker tag dragon-extension:latest <registry>.azurecr.io/dragon-extension:latest
docker push <registry>.azurecr.io/dragon-extension:latest

az containerapp update `
    --name <app-name> `
    --resource-group <rg> `
    --image <registry>.azurecr.io/dragon-extension:latest `
    --set-env-vars `
        ASPNETCORE_ENVIRONMENT=Production `
        Authentication__Enabled=true `
        Authentication__TenantId=<tenant-id> `
        Authentication__ClientId=<client-id> `
        Authentication__Instance=https://login.microsoftonline.com/

az containerapp show `
    --name <app-name> `
    --resource-group <rg> `
    --query "properties.latestRevisionFqdn" `
    --output tsv
```

Consult [doc/Authentication.md](./doc/Authentication.md) for Entra ID configuration details.

## ✅ Troubleshooting

- `.NET 9` missing ➡️ install the SDK and re-run `dotnet --version`.
- CLI prompts showing outdated defaults ➡️ rebuild the tool (`npm run build`) to refresh `dist/`.
- Node errors ➡️ confirm Node 22.x and npm 10.x are active via `node --version` / `npm --version`.
- API 404s ➡️ ensure `dotnet run` is active and requests follow `dragon-extensibility-api.yaml`.

## 📚 Next Steps

- Study each CLI README for advanced command options.
- Explore `src/Dragon.Copilot.Models` to understand payload contracts.
- Replace the sample logos and extend the Jest/.http suites with your scenarios.
- Track the `feature/partner-integration-cli` branch for the latest shared tooling improvements.

Happy building! Mix the CLIs, web builder, and sample API to deliver end-to-end Dragon Copilot experiences quickly.

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
az containerapp update `
    --name <your-container-app-name> `
    --resource-group <your-resource-group> `
    --image <your-registry-name>.azurecr.io/dragon-extension:latest
```

Verify the revision status and capture the public endpoint:

```powershell
az containerapp show `
    --name <your-container-app-name> `
    --resource-group <your-resource-group> `
    --query "properties.latestRevisionFqdn" `
    --output tsv
```

#### 5. Configure Environment Variables (Production)

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

Consult [doc/Authentication.md](./doc/Authentication.md) for Entra ID configuration guidance.

#### 6. Verify Production Deployment

```powershell
$fqdn = az containerapp show `
    --name <your-container-app-name> `
    --resource-group <your-resource-group> `
    --query "properties.latestRevisionFqdn" `
    --output tsv

curl "https://$fqdn/health"

az containerapp logs show `
    --name <your-container-app-name> `
    --resource-group <your-resource-group> `
    --follow
```

If the health probe fails, review the container logs and confirm the environment variables match your Entra ID registration.
