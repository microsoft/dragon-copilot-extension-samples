# Dragon Extension CLI

A cross-platform CLI tool for Dragon Copilot extension development, including manifest generation, publisher configuration, and packaging for distribution.

## Features

- **Interactive Manifest Generation**: Step-by-step wizard to create manifests
- **Publisher Configuration**: Generate and manage publisher.json files
- **Template-based Generation**: Pre-built templates for common use cases
- **Manifest Validation**: Comprehensive validation with helpful error messages
- **Extension Packaging**: Create ZIP packages ready for distribution
- **Cross-platform**: Works on Windows, macOS, and Linux

## Installation

### From GitHub Releases

> Note: Not currently available

Download the latest release for your platform:

- **Windows**: `dragon-extension-win.exe`
- **macOS**: `dragon-extension-macos`
- **Linux**: `dragon-extension-linux`

### From npm

> Note: Not currently available

```bash
npm install -g dragon-extension
```

### From Source

```bash
git clone <repository-url>
cd tools/dragon-extension-cli
npm install
npm run build
npm link
```

## Usage

### Initialize a New Extension

```bash
dragon-extension init
```

Interactive prompts will guide you through creating a new extension manifest and publisher configuration.

### Generate from Template

```bash
# Clinical note analysis extension
dragon-extension generate --template note-analysis

# Speech analysis extension
dragon-extension generate --template speech-analysis
```

### Add Tools Interactively

```bash
dragon-extension generate --interactive
```

This will also offer to create or update the publisher.json file.

### Validate a Manifest

```bash
dragon-extension validate extension.yaml
```

This validates both the extension manifest and publisher.json (if present).

### Package Extension

```bash
# Basic packaging
dragon-extension package

# Include additional files
dragon-extension package --include images/logo.png

# Custom output name
dragon-extension package --output my-extension-v1.0.0.zip
```

## File Structure

A typical Dragon Copilot extension project includes:

```
my-extension/
├── extension.yaml      # Extension manifest
└── publisher.json      # Publisher configuration
```

## Manifest Format

Dragon Copilot manifests follow this structure:

```yaml
name: my-extension
description: Description of what the extension does
version: 0.0.1

tools:
  - name: my-tool
    description: Tool description
    endpoint: https://api.example.com/v1/process
    inputs:
      - name: input-name
        description: Input description
        data: DSP/Note
    outputs:
      - name: output-name
        description: Output description
        data: DSP
```

## Publisher Configuration Format

The `publisher.json` file contains publisher information required for extension distribution:

```json
{
  "publisherId": "contoso.healthcare",
  "publisherName": "Contoso Healthcare Inc.",
  "websiteUrl": "https://www.contosohealth.com",
  "privacyPolicyUrl": "https://www.contosohealth.com/privacy",
  "supportUrl": "https://www.contosohealth.com/support",
  "version": "0.0.1",
  "contactEmail": "support@contosohealth.com",
  "offerId": "contoso-extension-suite",
  "defaultLocale": "en-US",
  "supportedLocales": ["en-US"],
  "countries": ["US"]
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
- **offerId**: Identifier for the extension offering
- **defaultLocale**: Must be `en-US` (only supported locale)
- **supportedLocales**: Must be `["en-US"]` (only supported locale)
- **countries**: Must be `["US"]` (only supported country)

## Templates

### note-analysis
Provides analysis and processing functionality for clinical notes.

### speech-analysis
Analyzes speech patterns for medical conditions using vocal biomarkers.

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

## GitHub Actions Integration

> Note: This is future looking and not currently implemented

This tool is designed to work with GitHub Actions for automated releases:

```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run package
      - uses: softprops/action-gh-release@v1
        with:
          files: releases/*
```
