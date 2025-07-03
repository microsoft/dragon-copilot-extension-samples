# Dragon Copilot Extension Samples

A development environment for creating and testing extensions that integrate with the Dragon Backend Simulator. This repository provides everything you need to build, test, and debug extensions locally before deploying them to production.

## 🚀 Quick Start

### Option 1: PowerShell Script (Recommended for Windows)
```powershell
# Clone the repository
git clone <your-repo-url>
cd dragon-copilot-extension-samples

# Run the quick start script
.\scripts\start-dev.ps1
```

### Option 2: Bash Script (Linux/Mac)
```bash
# Clone the repository
git clone <your-repo-url>
cd dragon-copilot-extension-samples

# Make the script executable and run it
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

### Option 3: Docker Compose (Cross-platform)
```bash
# Clone the repository
git clone <your-repo-url>
cd dragon-copilot-extension-samples

# Start with Docker Compose
docker-compose up --build
```

### Option 4: Manual Start
```bash
# Terminal 1 - Start the Dragon Backend Simulator
cd DragonBackendSimulator/DragonBackendSimulator.Web
dotnet run --urls http://localhost:5180

# Terminal 2 - Start the Sample Extension
cd samples/DragonCopilot/Workflow/SampleExtension.Web
dotnet run --urls http://localhost:5181
```

## 🎯 What You'll See

After starting the services, you'll have:

### 🐉 Dragon Backend Simulator
- **URL**: http://localhost:5180/
- **Purpose**: Simulates the backend system that will call your extension
- **Features**:   - REST API for simulating encounters
  - Automatically calls your extension when encounters are simulated
  - Swagger documentation for easy testing

### 🔧 Sample Extension
- **URL**: http://localhost:5181/
- **Purpose**: Example extension showing how to integrate with the simulator
- **Features**:
  - Receives and processes requests from the simulator
  - Full Swagger documentation at root URL
  - Example of proper request/response handling

## 🧪 Testing Your Setup

### Interactive Testing (Easiest)
1. Open [`testing/integration-tests.http`](testing/integration-tests.http) in VS Code
2. Install the "REST Client" extension if you haven't already
3. Click "Send Request" above each test to run them individually
4. Watch the responses to verify everything is working

### Automated Testing
```bash
# Run unit tests for the sample extension
cd samples/DragonCopilot/Workflow/SampleExtension.Web
dotnet test

# Run integration tests (services must be running)
# Use the HTTP file or your preferred API testing tool
```

### Health Checks
- Sample Extension: http://localhost:5181/health
- Sample Extension Swagger: http://localhost:5181/
- Simulator Health: http://localhost:5180/health
- Simulator Swagger: http://localhost:5180/
- Integration Test: Simulate an encounter and verify it gets processed

## 🛠️ Creating Your Own Extension

### Step 1: Copy the Sample
```bash
# Copy the sample extension as a starting point
cp -r samples/DragonCopilot/Workflow/SampleExtension.Web src/YourExtension.Web
cd src/YourExtension.Web
```

### Step 2: Update Configuration
1. Rename the project in `YourExtension.Web.csproj`
2. Update the namespace in all C# files
3. Modify the `ProcessingService.cs` to implement your business logic
4. Update the `ProcessRequest` and `ProcessResponse` models as needed

### Step 3: Configure the Simulator
Update `DragonBackendSimulator.Web/appsettings.Development.json`:
```json
{
  "EncounterApi": {
    "BaseUrl": "http://localhost:5182",  // Your extension's port
    "Path": "/api/process",
    "TimeoutSeconds": 30
  }
}
```

### Step 4: Test Your Extension
1. Start your extension on a different port (e.g., 5182)
2. Update the simulator configuration to point to your extension
3. Use the integration tests to verify the flow works
4. Add your own tests specific to your extension's functionality

## 📋 Architecture Overview

```
┌─────────────────────┐    HTTP POST     ┌─────────────────────┐
│                     │   /api/process   │                     │
│  Dragon Backend     │ ───────────────► │   Your Extension    │
│     Simulator       │                  │                     │
│                     │ ◄─────────────── │                     │
└─────────────────────┘    Response      └─────────────────────┘
         │                                                      │
         │                                                      │
         ▼                                                      ▼
   Starts Encounters                               Processes Business Logic
                                                   Returns Results
                                                   Handles Errors
```

### Components

- **Dragon Backend Simulator**: Simulates the production backend system
  - Creates encounters
  - Calls your extension via HTTP
  - Provides APIs for testing

- **Sample Extension**: Example implementation showing best practices
  - Receives processing requests
  - Demonstrates proper error handling
  - Shows how to structure responses
  - Includes comprehensive testing

- **Integration Tests**: Ready-to-run test suite
  - Verifies end-to-end functionality
  - Tests error scenarios
  - Performance testing
  - Documentation of expected behavior

## 🔧 Development Workflow

### Daily Development
1. Start services: `.\scripts\start-dev.ps1`
2. Make changes to your extension
3. Test with integration suite
4. Debug using VS Code/Visual Studio
5. Stop services: `.\scripts\start-dev.ps1 -StopAll`

### Debugging
- Set breakpoints in your extension code
- Use the sample HTTP requests to trigger specific scenarios
- Check logs in the terminal where services are running
- Use Swagger UI for interactive API testing

### Adding Features
1. Update your models (`ProcessRequest`, `ProcessResponse`)
2. Implement business logic in `ProcessingService`
3. Add new endpoints if needed
4. Update integration tests
5. Test with the simulator

## 📁 Project Structure

```
dragon-extension-developer/
├── scripts/                          # Quick start scripts
│   ├── start-dev.ps1                 # Windows PowerShell script
│   └── start-dev.sh                  # Linux/Mac bash script
├── testing/                          # Test suites and documentation
│   └── integration-tests.http        # Ready-to-run integration tests
├── DragonBackendSimulator/           # Simulator that calls your extension
│   └── DragonBackendSimulator.Web/   # ASP.NET Core web API
├── samples/DragonCopilot             # Example extension implementations
│   └── Workflow/SampleExtension.Web/ # Workflow Extension Example
├── src/                              # Your extensions go here
│   └── YourExtension.Web/            # Extension implementation
├── docker-compose.yml                # Docker setup for easy deployment
└── README.md                         # This file
```

## 🐛 Troubleshooting

### Services Won't Start
- Ensure .NET 9.0 SDK is installed
- Check if ports 5180/5181 are already in use
- Run `.\scripts\start-dev.ps1 -StopAll` to clean up

### Extension Not Being Called
- Verify simulator configuration points to correct URL
- Check extension is running and responding to health checks
- Look at simulator logs for HTTP errors

### Tests Failing
- Ensure both services are running
- Check the services are on the expected ports
- Verify network connectivity between services

### Docker Issues
- Ensure Docker is running
- Try `docker-compose down` then `docker-compose up --build`
- Check Docker logs: `docker-compose logs`

## 📚 Additional Resources

- [Sample Extension Documentation](samples/DragonCopilot/Workflow/SampleExtension.Web/README.md)
- [Dragon Backend Simulator Documentation](DragonBackendSimulator/DragonBackendSimulator.Web/README.md)
- [API Documentation](testing/integration-tests.http) - See the HTTP file for detailed API examples

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

🐉 **Happy Extension Development!** If you run into any issues or have questions, please open an issue in this repository.

## 🛠️ Tools

### Dragon Extension CLI

A cross-platform CLI tool for Dragon Copilot extension development, including manifest generation and packaging for distribution.

**Key Features:**
- Interactive manifest generation with step-by-step wizard
- Pre-built templates for common use cases (clinical coding, speech analysis)
- Comprehensive manifest validation with helpful error messages
- Extension packaging into ZIP files ready for distribution
- Cross-platform support (Windows, macOS, Linux)

**Quick Usage:**

> Note: The CLI tool is not currently available for download, but you can build it from source and execute with `node dist/cli.js <command>`

```bash
# Initialize a new extension
dragon-extension init

# Generate from template
dragon-extension generate --template note-analysis

# Validate a manifest
dragon-extension validate manifest.yaml

# Package extension
dragon-extension package
```

📁 **Location:** `tools/dragon-manifest-generator/` *(Note: Directory will be renamed to `tools/dragon-extension/` in a future update)*  
📖 **Documentation:** [Dragon Extension CLI README](tools/dragon-manifest-generator/README.md)

---
