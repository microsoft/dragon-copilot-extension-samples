# Quickstart: Build a Dragon Copilot (radiologists) extension

In this quickstart, you run a sample extension locally, test it in the sandbox, customize it, and package it for distribution.

## Table of contents

- [Prerequisites](#prerequisites)
- [Set up the sample](#set-up-the-sample)
- [Verify the sample locally](#verify-the-sample-locally)
- [Test with the extensions sandbox](#test-with-the-extensions-sandbox)
- [Generate your manifest](#generate-your-manifest)
- [Customize your extension](#customize-your-extension)
- [Validate and package](#validate-and-package)
- [Optional: Expose your API with Dev Tunnel](#optional-expose-your-api-with-dev-tunnel)
- [Authentication setup](#authentication-setup)
- [Next steps](#next-steps)

## Prerequisites

- Git
- Visual Studio Code
- GitHub Copilot enabled in Visual Studio Code (recommended for customization)
- Dragon Copilot CLI. See the [CLI installation instructions](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/tools/dragon-copilot-cli/README.md). This quickstart uses the `radiologists` commands.

## Set up the sample

1. Read the [Radiologists product overview](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/radiologists/README.md).
2. Clone the repository to get the code on your machine (see [repo setup](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/README.md#1-clone-the-repository)).
3. Choose one path:

   | Path | Use this when | Read this |
   | --- | --- | --- |
   | **C# (Quickstart, AI, Local)** | You want the main built-in sample set | [Workflow README](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/radiologists/src/samples/Workflow/README.md) |
   | **Python Quickstart** | You want a Python implementation | [Python README](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/radiologists/src/samples/Workflow/sample_extension_radiologists_python_quickstart/README.md) |
   | **Other languages** | You want Go, Java, Node.js, TypeScript, Rust, or another language | [Scaffold prompt](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/.github/prompts/radiologists-scaffold-language-sample.prompt.md) |

4. Follow the README for your selected path to complete setup.

> **Done when:** The sample is running locally and the health endpoint returns a successful response.

If you are using GitHub Copilot, enable custom instructions. This helps Copilot apply the repo's [radiologists custom instructions](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/.github/instructions/radiologists.instructions.md) while you edit.

> **Tip:** This helps prevent API contract and formatting mistakes in Copilot suggestions. If you're new to custom instructions, see the VS Code docs on [custom instructions](https://code.visualstudio.com/docs/copilot/copilot-customization).

## Verify the sample locally

Start the sample and use the instructions in your selected README to:

1. **Confirm the service is running.** Open the local URL or health endpoint documented for your sample.
2. **Send a request.** Use the sample's `.http`, `curl`, or PowerShell example to call `POST /v1/process`.
3. **Review the response.** Confirm the request succeeds and the response follows the Radiologists extension contract.

> **Note:** Authentication is disabled by default in the sample configuration, so local testing works before any Microsoft Entra setup.

## Test with the extensions sandbox

After local verification, use the extensions sandbox to run the manifest-configured request and review validated outputs before packaging.

1. Keep your extension running.
2. Start the sandbox and open it in your browser. For setup details, see the [sandbox README](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/tools/extensions-sandbox/README.md).
3. For your first run, upload the [sample manifest](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/radiologists/src/samples/Workflow/extension.yaml).
4. Set the tool endpoint to your running service (for example, `http://localhost:5080/v1/process`).
5. Fill in the inputs and click **Run**.
6. Review the validated response in **Results** and **Outputs**.

## Generate your manifest

After your first sandbox run succeeds, generate your own manifest for the remaining steps.

Install the CLI (see [Prerequisites](#prerequisites)) and verify it with `dragon-copilot --help`.

Then follow the [Typical workflow](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/radiologists/README.md#typical-workflow) (`init`/`generate` → edit) to create your manifest (`extension.yaml`). Set the tool endpoint and tool metadata now. Configure authentication later in [Authentication setup](#authentication-setup).

Re-run the sandbox using your generated `extension.yaml` to confirm end-to-end behavior with your own settings before continuing.

## Customize your extension

After the sample is running, replace the quality-check logic with your own.

1. Make changes in the quality-check service file for your selected sample. See the selected sample README for the exact service file location.
2. Keep the wire contract aligned with the [OpenAPI contract](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/radiologists/radiologists-extensibility-api.yaml).
3. Re-run [Verify the sample locally](#verify-the-sample-locally).
4. Re-run [Test with the extensions sandbox](#test-with-the-extensions-sandbox) after significant API or manifest changes.

## Validate and package

After you customize your extension and confirm it in the sandbox, run CLI validation and package your extension into a distributable `.zip`.

Run these commands from the directory that contains your `extension.yaml`:

- If you generated a new manifest, run them from the folder that contains it.
- If you are using the shared sample manifest, run them from `radiologists/src/samples/Workflow`.

```bash
dragon-copilot radiologists validate ./extension.yaml
dragon-copilot radiologists package
```

## Optional: Expose your API with Dev Tunnel

Use this optional step only for remote or shared testing.

1. Keep your local extension running.
2. [Install Dev Tunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows#install) if it is not already installed.
3. Sign in:

```bash
devtunnel login
```

4. Create (or reuse) and host a tunnel:

```bash
devtunnel create radiologists-quickstart -a
devtunnel port create radiologists-quickstart -p 5080
devtunnel host radiologists-quickstart
```

`-a` allows anonymous connect access to the tunnel.

5. Copy the public "connect via browser" URL from the terminal output.
6. Update your sandbox tool endpoint to `<tunnel-url>/v1/process`.
7. Re-run the sandbox and confirm the request still succeeds.

## Authentication setup

For production authentication setup, follow the [Authentication guide](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/doc/Authentication.md) and complete these onboarding steps:

1. Register the `Microsoft.HealthPlatform` resource provider in your Azure subscription (one-time per tenant).
2. Create an Entra app registration for your extension (see [One-time setup in partner tenant](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/tools/extensions-sandbox/README.md#one-time-setup-in-the-partner-tenant) for the App ID URI format and PowerShell commands).
3. Configure token settings (`idtyp` optional claim and `requestedAccessTokenVersion = 2`).
4. Enable authentication in sample config and set `TenantId`, `ClientId`, and `RequiredClaims.azp`.

## Next steps

- [Enable and test authentication in the extensions sandbox](https://github.com/microsoft/dragon-copilot-extension-samples/blob/main/tools/extensions-sandbox/README.md#testing-the-authentication-feature).
- Update your manifest with your deployed endpoint and production tenant settings.
