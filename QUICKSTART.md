# Quick Start Guide for Dragon Extension Developer

## 🚀 Getting Started (Choose One)

### Option 1: PowerShell Script (Windows - Easiest)
```powershell
# Start both services
.\scripts\start-dev.ps1

# Test the setup
.\scripts\test-setup.ps1

# Stop services when done
.\scripts\start-dev.ps1 -StopAll
```

### Option 2: Bash Script (Linux/Mac)
```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Start both services
./scripts/start-dev.sh

# Test the setup  
./scripts/test-setup.sh

# Stop services when done
./scripts/start-dev.sh --stop
```

### Option 3: Docker Compose
```bash
# Start everything with Docker
docker-compose up --build

# Stop everything
docker-compose down
```

### Option 4: VS Code Tasks
1. Open workspace in VS Code
2. Press `Ctrl+Shift+P`
3. Type "Tasks: Run Task"
4. Select "Start Dragon Extension Developer Environment"

## 🧪 Verify Everything Works

### Quick Test
Run the test script to verify integration:
- Windows: `.\scripts\test-setup.ps1`
- Linux/Mac: `./scripts/test-setup.sh`

### Manual Verification
1. **Extension Health**: http://localhost:5181/health
2. **Extension Swagger**: http://localhost:5181/
3. **Simulator Health**: http://localhost:5180/health
4. **Simulator Swagger**: http://localhost:5180/

### Integration Test Suite
Open `testing/integration-tests.http` in VS Code with REST Client extension and run the tests.

## 🔧 Development Workflow

### VS Code Tasks Available
- **Start Dragon Extension Developer Environment**: Starts both services
- **Stop Dragon Extension Services**: Stops all services
- **Test Dragon Extension Setup**: Runs validation tests
- **Build Sample Extension**: Builds just the extension
- **Build Dragon Backend Simulator**: Builds just the simulator
- **Docker Compose Up/Down**: Docker-based development

### Debugging
Use VS Code debug configurations:
- **Debug Sample Extension**: Debug the extension with breakpoints
- **Debug Dragon Backend Simulator**: Debug the simulator
- **Debug Both Services**: Debug both simultaneously

## 📋 What Each Service Does

### Dragon Backend Simulator (Port 5180)
- Simulates the production backend system
- Creates encounters via REST API
- Automatically calls your extension when encounters are created
- Provides Swagger UI for testing

### Sample Extension (Port 5181)  
- Example implementation of an extension
- Shows proper request/response handling
- Includes health check endpoints
- Demonstrates error handling patterns

## 🎯 Testing Your Extension

### 1. Direct Extension Testing
```http
POST http://localhost:5181/api/process
Content-Type: application/json

{
  "requestId": "test-123",
  "data": "Your test data",
  "metadata": {"source": "manual-test"}
}
```

### 2. Full Integration Testing
```http
POST http://localhost:5180/api/encounters:simulate
Content-Type: application/json

{
  "name": "Test Encounter",
  "description": "This will call your extension"
}
```

### 3. Echo Testing (Simple)
```http
POST http://localhost:5181/api/process/echo
Content-Type: application/json

"Hello World"
```

## 🔍 Troubleshooting

### Services Won't Start
- Check .NET 9.0 SDK is installed: `dotnet --version`
- Ensure ports 5180/5181 are free
- Run stop script first: `.\scripts\start-dev.ps1 -StopAll`

### Integration Tests Fail
- Verify both services are running and healthy
- Check service logs in terminal windows
- Ensure simulator configuration points to extension URL

### Docker Issues
- Ensure Docker Desktop is running
- Try: `docker-compose down && docker-compose up --build`
- Check logs: `docker-compose logs`

## 📚 Next Steps

1. **Explore the APIs**: Use Swagger UI to understand the interfaces
2. **Run Full Test Suite**: Execute all tests in `testing/integration-tests.http`
3. **Create Your Extension**: Copy `samples/DragonCopilot/Workflow/SampleExtension.Web` as a starting point
4. **Customize Business Logic**: Modify `ProcessingService.cs` for your needs
5. **Add Your Tests**: Extend the integration test suite for your scenarios

## 🎉 You're Ready!

Your Dragon Extension Developer environment is now set up and ready for development. Start building your custom extensions and use the simulator to test them locally before deployment.

For detailed documentation, see the individual README files in each project folder.
