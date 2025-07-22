# Quick Start Guide for Dragon Extension Developer

## 🚀 Getting Started (Choose One)

### Option 1: PowerShell Script (Windows - Easiest)
```powershell
# Start the extension
.\scripts\start-dev.ps1

# Stop services when done
.\scripts\start-dev.ps1 -StopAll
```

### Option 2: Bash Script (Linux/Mac)
```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Start the extension
./scripts/start-dev.sh

# Stop services when done
./scripts/start-dev.sh --stop
```

### Option 3: VS Code Tasks
1. Open workspace in VS Code
2. Press `Ctrl+Shift+P`
3. Type "Tasks: Run Task"
4. Select "Start Dragon Extension Developer Environment"

## ☁️ Deploy to Azure (Production Ready)

### Prerequisites for Azure Deployment
- Azure CLI installed: `winget install Microsoft.AzureCLI`
- Docker Desktop installed and running
- Azure subscription with Container Apps permissions

### Quick Azure Deploy
```powershell
# Deploy your extension to Azure Container Apps
.\scripts\deploy-extension-azure.ps1 -ExtensionName "my-dragon-ext"

# For production environment
.\scripts\deploy-extension-azure.ps1 -ExtensionName "my-dragon-ext" -EnvironmentSuffix "prod"
```

### What Azure Deployment Includes
- ✅ **Secure Container Registry**: Private ACR for your images
- ✅ **Managed Identity**: No passwords or keys needed
- ✅ **Auto-scaling**: Scales to zero when not in use
- ✅ **Health Monitoring**: Built-in health checks
- ✅ **HTTPS**: Automatic SSL certificates
- ✅ **Production Ready**: High availability and monitoring

The deployment script will:
1. Build your Docker image locally
2. Create Azure infrastructure (ACR, Container Apps, etc.)
3. Push image to your private registry
4. Deploy with managed identity authentication
5. Provide live URLs for testing and integration

## 🧪 Verify Everything Works

### Quick Testing Options

#### Manual Verification
1. **Extension Health**: http://localhost:5181/health
2. **Extension Swagger**: http://localhost:5181/

#### Comprehensive Integration Test Suite
Open `testing/integration-tests.http` in VS Code with REST Client extension and run the tests.

## 🔧 Development Workflow

### VS Code Tasks Available
- **Start Dragon Extension Developer Environment**: Starts the extension service
- **Stop Dragon Extension Services**: Stops all services
- **Build Sample Extension**: Builds the extension

### Debugging
Use VS Code debug configurations:
- **Debug Sample Extension**: Debug the extension with breakpoints

## 📋 What the Service Does

### Sample Extension (Port 5181)
- Example implementation of a Dragon Copilot extension
- Shows proper request/response handling for Dragon Copilot integration
- Includes health check endpoints
- Demonstrates error handling patterns
- Provides comprehensive API documentation via Swagger

## 🎯 Testing Your Extension

### 1. Direct Extension Testing
```http
POST http://localhost:5181/v1/process
Content-Type: application/json

{
  "sessionData": {
    "session_start": "2025-07-01T13:50:00.000Z",
    "correlation_id": "test-correlation-123",
    "tenant_id": "test-tenant-456"
  }
}
```

### 2. Extension Processing Test
```http
POST http://localhost:5181/v1/process
Content-Type: application/json

{
  "sessionData": {
    "session_start": "2025-07-22T12:00:00.000Z",
    "session_id": "test-session-001"
  },
  "iterativeTranscripts": [
    {
      "transcript": "Test patient encounter for validation"
    }
  ]
}
```

## 🔍 Troubleshooting

### Services Won't Start
- Check .NET 9.0 SDK is installed: `dotnet --version`
- Ensure port 5181 is free
- Run stop script first: `.\scripts\start-dev.ps1 -StopAll`

### Integration Tests Fail
- Verify the extension is running and healthy
- Check extension logs in terminal window
- Test extension directly using the HTTP test file

### Docker Issues
- For containerized deployment, build the extension directly:
  ```bash
  docker build -f samples/DragonCopilot/Workflow/SampleExtension.Web/Dockerfile -t my-extension .
  docker run -p 5181:8080 my-extension
  ```

## 📚 Next Steps

1. **Explore the APIs**: Use Swagger UI to understand the interfaces
2. **Run Full Test Suite**: Execute all tests in `testing/integration-tests.http`
3. **Create Your Extension**: Copy `samples/DragonCopilot/Workflow/SampleExtension.Web` as a starting point
4. **Customize Business Logic**: Modify `ProcessingService.cs` for your needs
5. **Add Your Tests**: Extend the integration test suite for your scenarios

## 🎉 You're Ready!

Your Dragon Extension Developer environment is now set up and ready for development. Start building your custom extensions and test them locally before deploying to Dragon Copilot.

For detailed documentation, see the individual README files in each project folder.
