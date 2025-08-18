# GitHub Copilot Instructions for Dragon Copilot Extension Samples

## Repository Overview

This repository contains sample code and tools for developing **Dragon Copilot Extensions** - plugins that extend the functionality of Dragon Copilot, a medical AI platform for clinical documentation and healthcare workflows.

## Key Architecture Concepts

### Dragon Copilot Extensions
- **Purpose**: Extend Dragon Copilot with custom AI-powered functionality for clinical data processing
- **Pattern**: REST API services that receive clinical data and return processed results
- **Data Types**: Clinical notes, transcripts, audio, encounters, patient data
- **Integration**: Extensions are called by Dragon Copilot platform via HTTP POST to `/v1/process`

### Core Data Models (src/Dragon.Copilot.Models/)
- **DragonStandardPayload**: Main payload structure containing session data, clinical context
- **Note**: Clinical notes and documentation
- **Transcript**: Speech-to-text transcriptions 
- **IterativeTranscript/IterativeAudio**: Real-time streaming data
- **Patient/Practitioner**: Healthcare entities
- **Encounter**: Clinical visits and sessions
- **MedicalCode**: Standardized medical coding (ICD, SNOMED, etc.)

## Project Structure

### Main Components
1. **Sample Extension** (`samples/DragonCopilot/Workflow/SampleExtension.Web/`)
   - C# ASP.NET Core Web API demonstrating extension pattern
   - Shows request/response handling, authentication, processing logic
   - Port 5181 (HTTP), 7156 (HTTPS)

2. **CLI Tools** (`tools/dragon-extension-cli/`)
   - TypeScript/Node.js CLI for extension development
   - Commands: `init`, `generate`, `validate`, `package`
   - Creates extension manifests and publisher configurations

3. **Documentation** (`doc/`)
   - Authentication patterns (JWT + custom license keys)
   - API contracts and integration guides

## Development Patterns

### Extension API Contract
```csharp
[HttpPost("/v1/process")]
public async Task<ProcessResponse> ProcessAsync([FromBody] ProcessRequest request)
```

### Authentication Layers
1. **JWT Authentication**: Microsoft Entra ID integration for service-to-service auth
2. **License Key Validation**: Custom business logic for subscription/feature control
3. **Conditional Security**: Can be disabled for development environments

### Configuration Patterns
- **Development**: Authentication disabled for easier testing
- **Production**: Full security with Entra ID + license validation
- **Environment-specific**: `appsettings.json` vs `appsettings.Development.json`

## Extension Manifest Format
```yaml
name: extension-name
description: Extension description
version: 0.0.1
tools:
  - name: tool-name
    description: Tool description
    endpoint: https://api.example.com/v1/process
    inputs:
      - name: note
        description: Clinical note input
        data: DSP/Note
    outputs:
      - name: processed-data
        description: Processed results
        data: DSP
```

## Common Development Workflows

### Creating New Extensions
1. Use CLI: `dragon-extension init`
2. Copy sample project as starting point
3. Modify `ProcessingService.cs` for custom business logic
4. Update `extension.yaml` manifest
5. Test locally, then deploy

### Local Development
- Run: `.\scripts\start-dev.ps1` (Windows) or `./scripts/start-dev.sh` (Linux/Mac)
- Test endpoints: http://localhost:5181/health, http://localhost:5181/ (Swagger)
- Use `.http` files for API testing

### Deployment Options
- **Local/Development**: Direct .NET hosting
- **Container**: Docker with provided Dockerfile
- **Azure**: Container Apps deployment scripts available

## Code Generation Guidelines

### When working with this codebase:

1. **Follow Medical Domain Patterns**
   - Use clinical terminology appropriately
   - Respect patient data sensitivity and privacy
   - Follow healthcare compliance patterns (HIPAA considerations)

2. **Extension Development**
   - Always implement health check endpoints
   - Use structured logging for debugging
   - Follow the ProcessRequest/ProcessResponse pattern
   - Include comprehensive error handling

3. **Security Considerations**
   - Implement proper authentication when required
   - Validate all input data thoroughly  
   - Use HTTPS in production
   - Follow principle of least privilege

4. **API Design**
   - Use RESTful patterns
   - Include OpenAPI/Swagger documentation
   - Support CORS for Dragon Copilot integration
   - Return consistent error response formats

5. **Testing Patterns**
   - Include health check endpoints
   - Provide `.http` test files
   - Test with realistic clinical data samples
   - Validate against extension manifest requirements

## Technology Stack
- **Backend**: C# .NET 9.0, ASP.NET Core
- **CLI Tools**: TypeScript, Node.js, Commander.js
- **Authentication**: Microsoft Entra ID, JWT tokens
- **Documentation**: OpenAPI/Swagger
- **Deployment**: Docker, Azure Container Apps
- **Testing**: HTTP files, integration tests

## Key Files to Reference
- `samples/DragonCopilot/Workflow/SampleExtension.Web/` - Main extension example
- `src/Dragon.Copilot.Models/` - Data models and contracts
- `tools/dragon-extension-cli/` - Development tooling
- `doc/Authentication.md` - Security implementation guide
- `QUICKSTART.md` - Getting started guide

## Business Context
This is healthcare/medical AI software. Extensions process clinical data like patient notes, transcripts, and medical encounters to provide AI-powered insights, entity extraction, clinical decision support, and documentation assistance for healthcare providers.
