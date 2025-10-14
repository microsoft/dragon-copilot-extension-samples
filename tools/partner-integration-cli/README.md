# Partner Integration CLI

A cross-platform CLI tool for Partner Integration development, including manifest generation, publisher configuration, and packaging for distribution.

## Features

- **Interactive Manifest Generation**: Step-by-step wizard to create integration manifests
- **Publisher Configuration**: Generate and manage publisher.json files
- **Template-based Generation**: Pre-built templates for common integration use cases
- **Manifest Validation**: Comprehensive validation with helpful error messages
- **Integration Packaging**: Create ZIP packages ready for distribution
- **Cross-platform**: Works on Windows, macOS, and Linux

## Installation

### From GitHub Releases

> Note: Not currently available

Download the latest release for your platform:

- **Windows**: `partner-integration-win.exe`
- **macOS**: `partner-integration-macos`
- **Linux**: `partner-integration-linux`

### From npm

> Note: Not currently available

```bash
npm install -g partner-integration-cli
```

### From Source

```bash
git clone <repository-url>
cd tools/partner-integration-cli
npm install
npm run build
npm link
```

## Usage

### Initialize a New Integration

```bash
partner-integration init
```

Interactive prompts will guide you through creating a new integration manifest and publisher configuration.

### Generate from Template

```bash
# EHR integration template
partner-integration generate --template ehr-integration

# API connector template
partner-integration generate --template api-connector

# Data synchronization template
partner-integration generate --template data-sync

# Custom integration template
partner-integration generate --template custom
```

### Add Tools Interactively

```bash
partner-integration generate --interactive
```

This will also offer to create or update the publisher.json file.

### Validate a Manifest

```bash
partner-integration validate integration.yaml
```

This validates both the integration manifest and publisher.json (if present).

### Package Integration

```bash
# Basic packaging
partner-integration package

# Include additional files
partner-integration package --include images/logo.png

# Custom output name
partner-integration package --output my-integration-v1.0.0.zip
```

## File Structure

A typical Partner Integration project includes:

```
my-integration/
├── integration.yaml    # Integration manifest
└── publisher.json      # Publisher configuration
```

## Manifest Format

Partner Integration manifests follow this structure:

```yaml
name: my-integration
description: Description of what the integration does
version: 0.0.1
auth:
  tenantId: 12345678-1234-1234-1234-123456789abc

tools:
  - name: my-tool
    description: Tool description
    endpoint: https://api.example.com/v1/process
    inputs:
      - name: input-name
        description: Input description
        data: DSP/Patient
    outputs:
      - name: output-name
        description: Output description
        data: DSP
```

## Publisher Configuration Format

The `publisher.json` file contains publisher information required for integration distribution:

```json
{
  "publisherId": "contoso.healthcare",
  "publisherName": "Contoso Healthcare Inc.",
  "websiteUrl": "https://www.contosohealth.com",
  "privacyPolicyUrl": "https://www.contosohealth.com/privacy",
  "supportUrl": "https://www.contosohealth.com/support",
  "version": "0.0.1",
  "contactEmail": "support@contosohealth.com",
  "offerId": "contoso-integration-suite",
  "defaultLocale": "en-US",
  "supportedLocales": ["en-US"],
  "scope": "US",
  "regions": ["US"]
}
```

### Publisher Configuration Fields

- **publisherId**: Unique identifier for the publisher (e.g., `contoso.healthcare`)
- **publisherName**: Display name of the publisher
- **websiteUrl**: Publisher's website URL
- **privacyPolicyUrl**: URL to privacy policy
- **supportUrl**: URL for support information
- **version**: Version of the publisher configuration
- **contactEmail**: Contact email for support
- **offerId**: Identifier for the integration offering
- **defaultLocale**: Must be `en-US` (only supported locale)
- **supportedLocales**: Must be `["en-US"]` (only supported locale)
- **scope**: Must be `US` (only supported region)
- **regions**: Must be `["US"]` (only supported region)

## Templates

### ehr-integration
Provides integration functionality for Electronic Health Record (EHR) systems, including patient data synchronization and appointment management.

### api-connector
Generic API connector for external healthcare systems, with data transformation capabilities.

### data-sync
Bidirectional data synchronization between healthcare systems, supporting patient data and clinical notes.

### custom
Basic template for custom partner integrations with configurable endpoints and data types.

## Data Types

Partner integrations support various data types:

### Dragon Standard Payload (DSP) Types
- `DSP/Note` - Clinical notes and documentation
- `DSP/Patient` - Patient demographic and clinical information
- `DSP/Encounter` - Healthcare encounters or visits
- `DSP/Practitioner` - Healthcare provider information
- `DSP/Transcript` - Speech transcriptions
- `DSP/Document` - Clinical documents

### EHR Data Types
- `EHR/PatientRecord` - Electronic health record patient data
- `EHR/Appointment` - Appointment or scheduling data
- `EHR/Medication` - Medication and prescription information
- `EHR/LabResult` - Laboratory test results

### API Data Types
- `API/Request` - API request data
- `API/Response` - API response data

### Custom Data Types
- `Custom/Data` - Custom data formats specific to integrations

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Package executables
npm run package
```

## Contributing

This tool is designed to follow the same contribution pattern as the Dragon Extension CLI:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all tests pass
6. Submit a pull request

## GitHub Actions Integration

> Note: This is future looking and not currently implemented

This tool is designed to work with GitHub Actions for automated releases:

```yaml
name: Release Partner Integration CLI
on:
  push:
    tags: ['partner-v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd tools/partner-integration-cli && npm ci
      - run: cd tools/partner-integration-cli && npm run package
      - uses: softprops/action-gh-release@v1
        with:
          files: tools/partner-integration-cli/releases/*
```