# Sample Extension Web API

A sample C# Web API project that demonstrates how to create an extension that can receive and process requests from Dragon Copilot.

## Architecture Overview

```
┌─────────────────────┐    HTTP POST     ┌─────────────────────┐
│                     │   /v1/process    │                     │
│   Dragon Copilot    │ ───────────────► │   Your Extension    │
│     Platform        │                  │                     │
│                     │ ◄─────────────── │                     │
└─────────────────────┘    Response      └─────────────────────┘
         │                                                      │
         │                                                      │
         ▼                                                      ▼
   Manages Encounters                               Processes Business Logic
   Handles Voice Data                               Returns Results
                                                   Handles Errors
```

## Features

- **REST API**: Accepts POST requests with data to be processed
- **Swagger Documentation**: Interactive API documentation available at the root URL
- **Health Checks**: Multiple health check endpoints for monitoring
- **CORS Support**: Configured to accept requests from Dragon Copilot
- **Structured Logging**: Comprehensive logging for debugging and monitoring
- **Error Handling**: Robust error handling with appropriate HTTP status codes
- **Dockerfile**: Build your application as a container.

## API Endpoints

### Main Processing Endpoint
- `POST /v1/process` - Processes data sent from Dragon Copilot

### Utility Endpoints
- `GET /health` - Application health check

## Request/Response Examples

Example request and response models are available in the [requests](../../../requests) directory.

## Getting Started

### Prerequisites
- .NET 9.0 SDK

### Running the Application

1. Navigate to the project directory:
   ```powershell
   cd samples/DragonCopilot/Workflow/SampleExtension.Web
   ```

2. Restore dependencies:
   ```powershell
   dotnet restore
   ```

3. Run the application:
   ```powershell
   dotnet run
   ```

4. Open your browser and navigate to:
   - HTTP: http://localhost:5181
   - HTTPS: https://localhost:7156

### Testing with HTTP Files

Use the included [SampleExtension.Web.http](./SampleExtension.Web.http) file in VS Code with the REST Client extension to test the API endpoints.

## Integration with Dragon Copilot

To integrate this extension with Dragon Copilot, you can make use of [Dev tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/overview) or deploy it to a cloud service like Azure Container Apps.

### Local Integration with a Dev Tunnel

#### Dev Tunnel Setup
1. [Install dev tunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows#install).
2. In a terminal, issue a `devtunnel login` command.
3. Issue a `devtunnel create extension-testing -a` command
4. Issue a `devtunnel port create extension-test -p 5181` command
5. Issue a `devtunnel host extension-testing` command

#### Test with Dragon Copilot
1. Ensure the extension is running
2. Update your extension manifest in Dragon Copilot to point to the DevTunnel URL
3. Test the integration by recording a session in Dragon Copilot

## Customization

The main processing logic is in `Services/ProcessingService.cs`. Modify the `ProcessData` method to implement your specific business logic.

## Project Structure

```
src/SampleExtension.Web/
├── Controllers/
│   └── ProcessController.cs
├── Models/
│   ├── ProcessRequest.cs
│   └── ProcessResponse.cs
├── Services/
│   ├── IProcessingService.cs
│   └── ProcessingService.cs
├── Extensions/
│   └── ServiceCollectionExtensions.cs
├── Properties/
│   └── launchSettings.json
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
└── SampleExtension.Web.csproj
```
