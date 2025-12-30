# Quick Start Guide for Dragon Extension Developer
This document is a quick‑start guide for building, testing, packaging, and deploying a custom Dragon Copilot extension. Its purpose is to walk an extension developer through the full development lifecycle—from setting up the environment to validating the extension inside the Dragon Copilot application. 

# Table of Contents
- [Quick Start Guide for Dragon Extension Developer](#quick-start-guide-for-dragon-extension-developer)
- [Running Locally](#-running-locally)
  - [Development Prerequisites](#development-prerequisites)
  - [Local Development Environment](#local-development-environment)
  - [Call the endpoint](#call-the-endpoint)
  - [Making Code Changes](#making-code-changes)
- [Using DevTunnels](#using-devtunnels)
- [Packaging your extension](#packaging-your-extension)
- [Create an Application in Azure portal that represents your application](#create-an-application-in-azure-portal-that-represents-your-application)
- [Installing your Extension](#installing-your-extension)
- [Testing your Extension](#testing-your-extension)


## 🚀 Running Locally

### Development Prerequisites
* DotNet 9
* Node 22.20.0
* npm 10.9.3

### Local Development Environment
1. Clone the repository
1. Open a terminal and navigate to `samples/DragonCopilot/Workflow/SampleExtension.Web`
1. Issue a `dotnet run`

The application will start and be available at http://localhost:5181

### Call the endpoint
You can make use of the [SampleExtension.Web.http](./samples/DragonCopilot/Workflow/SampleExtension.Web/SampleExtension.Web.http) file in the sample project to make a call. It contains a sample invocation for an extension listening for `Note` content.

You should see an output similar to the following:
```
HTTP/1.1 200 OK
Connection: close
Content-Type: application/json; charset=utf-8
Date: Mon, 06 Oct 2025 13:20:44 GMT
Server: Kestrel
Transfer-Encoding: chunked

{
    "success": true,
    "message": "Payload processed successfully",
    "payload": {
    "sample-entities": {
        "schema_version": "0.1",
        "document": {
        "title": "Outpatient Note",
        "type": {
            "text": "string"
        }
        },
        "resources": []
    },
    "adaptive-card": {
        // abbreviated
    }
}
```
### Making Code Changes
The majority of the code changes for your extension should fall underneath the Process API method.  The Process API will be called by Dragon Copilot to execute your extension.

##  Using DevTunnels
DevTunnels provide a secure way to expose your local web service to the internet without actually deploying.
1. [Install dev tunnel](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started?tabs=windows#install).
2. In a terminal, issue a `devtunnel login` command and select your appropriate account.
3. Issue a `devtunnel create name-of-tunnel -a` command
4. Issue a `devtunnel port create name-of-tunnel -p 5181` command
5. Issue a `devtunnel host name-of-tunnel` command
6. Copy the URL that is output in the terminal. Make sure to copy the dev tunnel "connect via browser url" as shown in example below.

    ![devtunnel-url.png](doc/devtunnel-url.png)

##  Packaging your extension
We are now going to package our extension using the dragon-extension CLI tool. [instructions on the GitHub repository](https://github.com/microsoft/dragon-copilot-extension-samples?tab=readme-ov-file#dragon-extension-cli). 

1. Open a new terminal window
2. Traverse to tools/dragon-extension-cli
3. Issue a `npm run build` command
4. Issue a `npm link` command
5. Issue a `dragon-extension init` command
  You will be asked for information on your extension.  
    - Ensure the tenantId specified is for where you will upload your extension to.
    - Ensure the api endpoint points to the process method using the devtunnel address you generated earlier.
6. Issue a `dragon-extension package` command
You now have a valid zip file that represents your extension!

##  Create an Application in Azure portal that represents your application.
1. Log into http://entra.microsoft.com
2. Go to App registrations on the left menu

      ![](doc/entra-app-reg-menu.png)
3. Create a new registration

      ![](doc/entra-new-registration.png)
4. Name your application what you want and ensure it is a "Single tenant Application"

      ![](doc/entra-new-registration-name.png)
5. Once complete go to the "Expose an API" on the left side.

      ![](doc/entra-expose-an-api.png)
6. Add an Application ID URI.  The format should be: `api://{entra-tenantid}/{devtunnelpath}`
   - (i.e. api://1abcdefg3-n2g4-56dd-jj10-i34lmn5p7rst/k2dkm8r-7156.use.devtunnels.ms)

5. Click the "Save" button
6. In the application details navigation, select "Token Configuration"

    ![](doc/entra-token-configuration.png)
7. Select "Add Optional Claim" in the details section
    
    ![](doc/entra-optional-claim.png)
8. For token type select "Access" and in the list of claims select "idtyp"

    ![](doc/entra-optional-claim-details.png)
9. Click the "Add" button
10. In the application details navigation, select "Manifest"

    ![](doc/entra-manifest.png)
11. Find the property "requestedAccessTokenVersion" and change the value from `null` to `2`

    ![](doc/entra-manifest-details.png)
12. Click the "Save" button

## Installing your Extension

1. Open the browser and go to `https://admin.healthplatform.microsoft.com/extensions`
2. Click the dropdown at the top to select the environment on the card you were given.

    ![](doc/switch-environment-menu.png)
3. In the page navigation click "Upload custom"

    ![](doc/dac-upload-custom.png)
4. Select the previously created zip file in the folder `tools/dragon`

5. Agree to the terms

    ![](doc/dac-upload-custom-details.png)
6. Click the "Upload custom" button

## Testing your Extension
1. Open the browser and go to `https://www.copilot.us.dragon.com`
2. Click "Sign In"
3. Allow the use of the microphone in the popup in the top left.
4. Go through the initial setup
    1. Select any Primary specialty
    2. Click "Next"
    3. Select any role
    4. Click "Next"
    5. Click "Complete setup"
5. Switch environment using following steps:
    1. Click "Settings"
    ![settings-switch-environment-1.png](doc/settings-switch-environment-1.png)
    2. Click "General"
    3. Select your assigned environment from the dropdown
    ![settings-switch-environment-2.png](doc/settings-switch-environment-2.png)
    4. Click "Reload app" in Change Environment popup
    ![settings-switch-environment-3.png](doc/settings-switch-environment-3.png)
    5. Go through step 4 i.e. initial setup of selecting specialties.

6. Ensure "Auto-style" is enabled
    1. Click the gear icon in the top right
    
       ![settings-gear.png](doc/settings-gear.png)
    3. Click "Note style & format" in the menu
    
    	![settings-note-style.png](doc/settings-note-style.png)
    5. Click "Style" in the menu
    
    	![settings-style.png](doc/settings-style.png)
    7. Toggle "Auto-style" to enabled
    
    	 ![settings-auto-style.png](doc/settings-auto-style.png)
    9. This setting is auto-saved and only needs to happen once
6. Ensure other extensions disabled
    1. Click the gear icon in the top right
    
       ![settings-gear.png](doc/settings-gear.png)
    2. Click "Extensions" in the menu
    3. Select extensions besides your own
    4. Toggle the extension off
    5. This setting is auto-saved and only needs to happen once
7. Click "Create patient session" in the bottom left
    ![create-patient-session.png](doc/create-patient-session.png)
8. Create an ambient recording by clicking the button to the right of the prompt box in the bottom.
    ![ambient-button.png](doc/ambient-button.png)
9. Sample script:

  > Mr. John Doe is a 55-year-old male here for follow-up on hypertension. He's taking lisinopril 20 milligrams daily with good adherence. Blood pressure today is 128 over 78, heart  rate 72. He reports no chest pain, shortness of breath, or headaches. He does note occasional mild dizziness when standing quickly, otherwise feels well. Exam is unremarkable, lungs are clear, heart regular, no edema.
  > 
  > Assessment: Hypertension, well controlled. Mild orthostatic dizziness likely related to medication but not impacting daily function.
  >
  > Plan: Continue current lisinopril dose. Encourage hydration and slower positional changes. Reinforced diet and exercise recommendations. Ordered labs for next visit. Follow up in six months or sooner if symptoms worsen.

7. Click the same button to stop recording.

8. After recording is complete you should see a number of things happen:
    * Recording uploaded
    * Note generated
    * Auto-style executed
    * Extension executed and displayed in the Note section.
 	![timeline-output.png](doc/timeline-output.png)

9. Click the "Note" tab and scroll to the bottom to see your results
	![tab-note.png](doc/tab-note.png)
