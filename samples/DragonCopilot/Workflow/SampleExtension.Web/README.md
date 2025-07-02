# Sample Extension Web API

A sample C# Web API project that demonstrates how to create an extension that can receive and process requests from the Dragon Backend Simulator.

## Features

- **REST API**: Accepts POST requests with data to be processed
- **Swagger Documentation**: Interactive API documentation available at the root URL
- **Health Checks**: Multiple health check endpoints for monitoring
- **CORS Support**: Configured to accept requests from the Dragon Backend Simulator
- **Structured Logging**: Comprehensive logging for debugging and monitoring
- **Error Handling**: Robust error handling with appropriate HTTP status codes

## API Endpoints

### Main Processing Endpoint
- `POST /api/process` - Processes data sent from the Dragon Backend Simulator

### Utility Endpoints
- `GET /health` - Application health check
- `GET /api/process/health` - Service-specific health check

## Request/Response Models

### ProcessRequest
```json
{
  "requestId": "guid",
  "encounterId": "guid (optional)",
  "data": "string",
  "metadata": {
    "key": "value"
  },
  "createdAt": "datetime"
}
```

### ProcessResponse
```json
{
  "responseId": "guid",
  "requestId": "guid",
  "success": true,
  "result": "processed data",
  "errorMessage": null,
  "processingTimeMs": 123,
  "metadata": {
    "key": "value"
  },
  "processedAt": "datetime"
}
```

## Getting Started

### Prerequisites
- .NET 9.0 SDK
- Visual Studio 2022 or VS Code

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

Use the included `SampleExtension.Web.http` file in VS Code with the REST Client extension to test the API endpoints.

## Integration with Dragon Backend Simulator

To integrate this extension with the Dragon Backend Simulator:

1. Ensure both applications are running
2. Configure the Dragon Backend Simulator to send requests to:
   - HTTP: `http://localhost:5181/api/process`
   - HTTPS: `https://localhost:7156/api/process`

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
