# Dragon Backend Simulator - Encounter API

This project provides a REST API for creating and managing encounters. The API includes functionality to create encounters and invoke configured external APIs to report back status.

## Project Structure

The application follows a clean architecture approach using traditional ASP.NET Core MVC controllers:

- **Models**: Data models, DTOs, and enums
- **Services**: Business logic and external API integration  
- **Controllers**: Traditional MVC controllers with comprehensive documentation
- **Configuration**: Strongly-typed configuration models
- **Extensions**: Service registration and pipeline configuration

## API Endpoints

The API follows RESTful conventions:

### Simulate Encounter

**POST** `/api/encounters:simulate`

Simulates a new encounter and invokes the configured external API to report status.

#### Request Body

```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

#### Response

```json
{
  "id": "guid",
  "name": "string",
  "description": "string",
  "createdAt": "datetime",
  "completedAt": "datetime",
  "status": "enum (Created=0, Processing=1, Completed=2, Failed=3)",
  "statusCode": "int",
  "externalApiResponse": "string",
  "errorMessage": "string"
}
```

#### Status Codes

- **201 Created** - Encounter created successfully
- **400 Bad Request** - Invalid request format
- **408 Request Timeout** - External API timeout
- **502 Bad Gateway** - External API error
- **500 Internal Server Error** - Unexpected error

## Configuration

The application can be configured through `appsettings.json`:

```json
{
  "EncounterApi": {
    "BaseUrl": "http://localhost:5181",
    "Path": "/api/process",
    "TimeoutSeconds": 30
  }
}
```

### Configuration Properties

- **BaseUrl**: The base URL of the external API to invoke
- **Path**: The specific path to call on the external API
- **TimeoutSeconds**: Timeout in seconds for external API calls

## Running the Application

### Prerequisites

- .NET 9.0 SDK

### Development

```bash
# Build the solution
dotnet build

# Run the application
dotnet run

# The application will be available at:
# HTTP: http://localhost:5180
# HTTPS: https://localhost:7023
```

### Testing the API

You can test the API using the provided HTTP files or tools like PowerShell:

```powershell
$body = @{
    name = "Patient Consultation"
    description = "Initial consultation for new patient"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5180/api/encounters:simulate" -Method POST -Body $body -ContentType "application/json"
```

## Features

- **POST /api/encounters:simulate** - Simulates an encounter and invokes an external API
- Configurable external API endpoints
- Comprehensive error handling and logging
- OpenAPI/Swagger documentation support
- Traditional ASP.NET Core MVC controllers
- Rich XML documentation

## Error Handling

The API includes comprehensive error handling for:
- External API timeouts
- HTTP request exceptions
- JSON serialization errors
- Network connectivity issues

All errors are logged with appropriate detail levels and return standardized error responses.

## OpenAPI/Swagger Documentation

The API includes OpenAPI documentation. When running in development mode, you can access the OpenAPI specification at the `/openapi/v1.json` endpoint.
