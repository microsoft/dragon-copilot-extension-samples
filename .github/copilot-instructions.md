# GitHub Copilot Instructions for Dragon Copilot Extension Samples

## Repository Overview

This repository contains sample code and tools for developing **Dragon Copilot Extensions** - plugins that extend the functionality of Dragon Copilot, a medical AI platform for clinical documentation and healthcare workflows.

## Key Architecture Concepts

### Dragon Copilot Extensions
- **Purpose**: Extend Dragon Copilot with custom AI-powered functionality for clinical data processing
- **Pattern**: REST API services that receive clinical data and return processed results
- **Data Types**: Clinical notes, transcripts, audio, encounters, patient data
- **Integration**: Extensions are called by Dragon Copilot platform via HTTP POST to `/v1/process`

### Physician Conversational Tools (Public Preview, schema `0.4.0-preview.2`)
- **Purpose**: Tools the Dragon Copilot assistant calls during a conversation (`IntentDriven` trigger). Part of the physician domain, not a separate product
- **Types covered here**: `MCP`, `OpenAPI`, `CopilotStudio`
- **Schema**: `physician/manifest/0.4.0-preview.2/manifest-schema.json`, mirrored in `tools/dragon-copilot-cli/src/schemas/physician/physician-extension-manifest-schema-0.4.0-preview.2.json` — keep both copies byte-identical
- **Key fields**: `expose`, `customExtractors`, `runtimeParamBindings` (keyed by MCP tool / operationId; flat list for CopilotStudio), `isExclusive`, `timeout` (5–60s)
- **Default**: registered as `preview`, so `0.3.0` stays the default schema

### Core Data Models (physician/src/models/Dragon.Copilot.Physician.Models/)
- **DragonStandardPayload**: Main payload structure containing session data, clinical context
- **Note**: Clinical notes and documentation
- **Transcript**: Speech-to-text transcriptions
- **IterativeTranscript/IterativeAudio**: Real-time streaming data
- **Patient/Practitioner**: Healthcare entities
- **Encounter**: Clinical visits and sessions
- **MedicalCode**: Standardized medical coding (ICD, SNOMED, etc.)

## Project Structure

### Main Components
1. **Sample Extension** (`physician/src/samples/DragonCopilot/Workflow/SampleExtension.Web/`)
   - C# ASP.NET Core Web API demonstrating extension pattern
   - Shows request/response handling, authentication, processing logic
   - Port 5181 (HTTP), 7156 (HTTPS)

2. **Conversational Samples** (`physician/src/samples/DragonCopilot/Conversational/`)
   - `Mcp/` — C# MCP server (ModelContextProtocol.AspNetCore), port 5190
   - `OpenApi/` — C# REST API with an OpenAPI 3.0 document, port 5191
   - `CopilotStudio/` — manifest + setup guide (no server)
   - Build/test: `dotnet test physician/src/samples/DragonCopilot/Conversational/SampleConversational.slnx`

3. **CLI Tools** (`tools/dragon-copilot-cli/`)
   - TypeScript/Node.js CLI for extension development
   - Commands: `connector init`, `connector validate`, `connector package`
   - Creates extension manifests and publisher configurations

4. **Documentation** (`doc/`)
   - Authentication patterns (Microsoft Entra ID JWT)
   - API contracts and integration guides

## Development Patterns

### Extension API Contract
```csharp
[HttpPost("/v1/process")]
public async Task<ProcessResponse> ProcessAsync([FromBody] ProcessRequest request)
```

### Authentication
1. **JWT Authentication**: Microsoft Entra ID integration for service-to-service auth
2. **Conditional Security**: Can be disabled for development environments

### Configuration Patterns
- **Development**: Authentication disabled for easier testing
- **Production**: JWT authentication with Microsoft Entra ID
- **Environment-specific**: `appsettings.json` vs `appsettings.Development.json`

## Extension Manifest Format
Physician manifests are versioned by `schemaVersion` (latest GA: `0.3.0`; latest preview: `0.4.0-preview.2`). Manifests without it use the original format; convert them with `dragon-copilot physician migrate`.
```yaml
schemaVersion: 0.3.0
name: extension-name            # lowercase, starts with a letter
caption: Extension Name          # display name
description: Extension description
version: 0.0.1
auth:
  tenantId: 12345678-1234-1234-1234-123456789abc
tools:
  - name: tool-name
    caption: Tool Name
    description: Tool description
    type: DragonAPI
    triggers:                    # DataAvailable and/or ExplicitRequest
      - DataAvailable
    timeout: 60                  # Optional: 5-60 seconds; the platform uses 5 if omitted, so set it explicitly
    endpoint: https://api.example.com/v1/process
    inputs:
      - name: note
        description: Clinical note input
        content-type: application/vnd.ms-dragon.dsp.note+json
      - name: ehr-context
        description: EHR context for the current encounter
        content-type: application/fhir.ehr-context+json
        include: [patient, current-encounter]
        required: false          # Optional input: the tool still runs without it
    outputs:                     # Optional: omit for fire-and-forget tools
      - name: processed-data
        description: Processed results
        content-type: application/vnd.ms-dragon.dsp+json
```

## Common Development Workflows

### Creating New Extensions
1. Use CLI: `dragon-copilot connector init`
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
- `physician/src/samples/DragonCopilot/Workflow/SampleExtension.Web/` - Main extension example
- `physician/src/models/Dragon.Copilot.Physician.Models/` - Data models and contracts
- `tools/dragon-copilot-cli/` - Development tooling
- `doc/Authentication.md` - Security implementation guide
- `physician/QUICKSTART.md` - Getting started guide
- `physician/CONVERSATIONAL.md` - Conversational tools (MCP, OpenAPI, Copilot Studio) guide

## Business Context
This is healthcare/medical AI software. Extensions process clinical data like patient notes, transcripts, and medical encounters to provide AI-powered insights, entity extraction, clinical decision support, and documentation assistance for healthcare providers.
