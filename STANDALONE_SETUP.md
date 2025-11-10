# Standalone Setup Guide for Dragon Copilot Extensions

This guide explains how to extract and run the Dragon Copilot partner initialization tools **without VS Code**.

## Install Required Dependencies

### Step 1: Install Node.js and npm

The Dragon Copilot CLI requires Node.js (which includes npm). Choose the appropriate installation method for your platform:

#### Windows

**Option A: Download from Official Website**
1. Visit [https://nodejs.org](https://nodejs.org)
2. Download the **LTS version** (22.20.0 or later)
3. Run the installer (.msi file)
4. Follow the installation wizard (accept defaults)
5. Restart your command prompt/PowerShell

**Option B: Using Package Manager (Chocolatey)**
```powershell
# Install Chocolatey if not already installed
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs --version=22.20.0
```

**Option C: Using Package Manager (Winget)**
```powershell
# Install Node.js via Windows Package Manager
winget install OpenJS.NodeJS
```

#### macOS

**Option A: Download from Official Website**
1. Visit [https://nodejs.org](https://nodejs.org)
2. Download the **LTS version** for macOS
3. Run the installer (.pkg file)
4. Follow the installation wizard

**Option B: Using Homebrew**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@22
```

**Option C: Using Node Version Manager (nvm)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc

# Install Node.js
nvm install 22.20.0
nvm use 22.20.0
nvm alias default 22.20.0
```

#### Linux (Ubuntu/Debian)

**Option A: Using Node Package Manager (nvm) - Recommended**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.bashrc

# Install Node.js
nvm install 22.20.0
nvm use 22.20.0
nvm alias default 22.20.0
```

**Option B: Using apt package manager**
```bash
# Update package index
sudo apt update

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Linux (CentOS/RHEL/Fedora)

```bash
# Using dnf/yum
sudo dnf install npm nodejs

# Or using nvm (recommended for latest versions)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22.20.0
nvm use 22.20.0
```

### Step 2: Install .NET (Optional)

If you plan to work with C# extensions, install .NET 9:

#### Windows
```powershell
# Using winget
winget install Microsoft.DotNet.SDK.9

# Or download from: https://dotnet.microsoft.com/download
```

#### macOS
```bash
# Using Homebrew
brew install --cask dotnet-sdk

# Or download from: https://dotnet.microsoft.com/download
```

#### Linux
```bash
# Ubuntu/Debian
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update && sudo apt-get install -y dotnet-sdk-9.0

# Or follow instructions at: https://dotnet.microsoft.com/download
```

## Verify Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 22.20.0** or later
- **npm 10.9.3** or later  
- **.NET 9** (if working with C# extensions)
- **PowerShell** (for Windows) or **Bash** (for Linux/Mac)

You can verify your installations:

```bash
node --version
npm --version
dotnet --version
```

## Step 3: Extract the Archive

1. **Download/Receive** the Dragon Copilot extension samples zip file
2. **Extract** the archive to your desired location:

### Windows
```powershell
# Extract using PowerShell
Expand-Archive -Path "dragon-copilot-extension-samples.zip" -DestinationPath "C:\your-project-folder"
cd "C:\your-project-folder\dragon-copilot-extension-samples"
```

### Linux/Mac
```bash
# Extract using unzip
unzip dragon-copilot-extension-samples.zip -d /your-project-folder
cd /your-project-folder/dragon-copilot-extension-samples
```

## Step 4: Install and Build the CLI Tools

Navigate to the CLI tools directory and set up the Dragon Copilot CLI:

### Windows (PowerShell)
```powershell
cd tools\dragon-copilot-cli
npm install
npm run build
npm link
```

### Linux/Mac (Bash)
```bash
cd tools/dragon-copilot-cli
npm install
npm run build
npm link
```

This will:
- Install all required dependencies
- Build the TypeScript CLI from source
- Create a global `dragon-copilot` command available from anywhere

## Step 5: Verify CLI Installation

Test that the CLI is properly installed:

```bash
dragon-copilot --help
```

You should see the CLI help menu with available commands.

## Step 6: Initialize Partner Integration

Now you can run the partner initialization wizard:

```bash
dragon-copilot partner init
```

This interactive wizard will:
- Guide you through creating a `integration.yaml` manifest
- Configure partner authentication settings
- Set up clinical application integration details
- Create publisher configuration

The wizard will prompt you for:
- **Partner name** and description
- **Clinical application name** (the EHR or workflow system)
- **Authentication method** (JWT, API key, etc.)
- **API endpoints** and configuration
- **Data access requirements**

## Step 7: Validate Your Configuration

After completing the wizard, validate your configuration:

```bash
dragon-copilot partner validate ./integration.yaml
```

This ensures your manifest follows the correct schema and business rules.

## Step 8: Working with Extensions (Optional)

If you want to create Dragon Copilot extensions (not just partner integrations):

```bash
# Create a new extension
dragon-copilot extension init

# Validate extension manifest
dragon-copilot extension validate ./extension.yaml

# Package extension for distribution
dragon-copilot extension package --manifest ./extension.yaml
```

## Directory Structure After Setup

After extraction and setup, your directory structure should look like:

```
your-project-folder/
├── dragon-copilot-extension-samples/
│   ├── doc/                          # Documentation
│   ├── samples/                      # Sample implementations
│   │   └── DragonCopilot/
│   │       └── Workflow/
│   │           └── SampleExtension.Web/   # C# sample extension
│   ├── src/
│   │   └── Dragon.Copilot.Models/    # Data models and contracts
│   ├── tools/
│   │   └── dragon-copilot-cli/       # CLI tools (now built)
│   └── [your-integration-files]/     # Generated by wizard
│       ├── integration.yaml          # Partner manifest
│       ├── publisher.json           # Publisher configuration
│       └── assets/                  # Logos and resources
```

## Troubleshooting

### CLI Not Found
If `dragon-copilot` command is not recognized:

1. **Verify npm global directory** is in your PATH:
   ```bash
   npm config get prefix
   ```

2. **Manually add to PATH** if needed:
   - Windows: Add `%APPDATA%\npm` to your PATH
   - Linux/Mac: Add `~/.npm-global/bin` to your PATH

3. **Alternative: Use npx** instead of global install:
   ```bash
   cd tools/dragon-copilot-cli
   npx dragon-copilot partner init
   ```

### Permission Issues (Linux/Mac)
If you encounter permission errors with `npm link`:

```bash
# Use a global directory you own
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Then retry the build and link
npm run build
npm link
```

### Node.js Version Issues
Ensure you're using Node.js 22.20.0 or compatible version. If you need to install or update Node.js, refer to the detailed installation instructions in **Step 1: Install Node.js and npm** section above.

Quick verification:
```bash
node --version  # Should show v22.20.0 or later
npm --version   # Should show v10.9.3 or later
```

If you need to switch versions using nvm:
```bash
# Linux/Mac/Windows (with nvm-windows)
nvm install 22.20.0
nvm use 22.20.0
```

## Next Steps

1. **Review Documentation**: Check the `doc/` folder for authentication patterns and API integration guides
2. **Examine Sample Code**: Look at `samples/DragonCopilot/Workflow/SampleExtension.Web/` for implementation examples
3. **Test Integration**: Use the generated configuration files to test your Dragon Copilot integration
4. **Deploy**: Follow deployment guides in the documentation for production setup

## Getting Help

- **CLI Help**: Run `dragon-copilot --help` or `dragon-copilot <command> --help`
- **Documentation**: Review files in the `doc/` directory
- **Sample Code**: Examine the sample extension in `samples/` for patterns
- **Validation**: Use `dragon-copilot partner validate` to check your configuration

This setup allows you to use all Dragon Copilot development tools without requiring VS Code, using only command-line tools and your preferred text editor.